import { MotorParameters, MechanismParameters } from '../types/simulation';

export class MotorSimulation {
  // State variables
  public angle: number = 0; // Shaft angle in radians
  public velocity: number = 0; // Shaft angular velocity in rad/s
  public current: number = 0; // Armature current in Amperes
  public acceleration: number = 0; // Angular acceleration rad/s^2

  // Disturbance state
  public impulseTorque: number = 0; // Transient disturbance impulse (Nm)
  public constantDisturbanceTorque: number = 0; // Constant external torque (Nm)

  // Motor & Mechanism configuration
  public motorParams: MotorParameters;
  public mechanismParams: MechanismParameters;

  constructor(motor?: Partial<MotorParameters>, mechanism?: Partial<MechanismParameters>) {
    this.motorParams = {
      resistance: 1.5, // 1.5 Ohms
      inductance: 0.004, // 4 mH
      kt: 0.08, // 0.08 Nm/A
      ke: 0.08, // 0.08 V/(rad/s)
      rotorInertia: 0.0004, // kg*m^2
      damping: 0.0015, // Nm*s/rad
      stiction: 0.015, // 0.015 Nm breakaway friction
      maxVoltage: 12.0, // +/- 12 Volts
      maxCurrent: 10.0, // Peak stall current 10A
      gearRatio: 1.0, // Direct drive default
      encoderCpr: 1024, // 1024 counts per rev
      sensorNoiseStd: 0.0, // standard deviation of encoder jitter
      ...motor,
    };

    this.mechanismParams = {
      type: 'arm',
      loadInertia: 0.008, // Arm inertia
      mass: 0.45, // 450 grams arm
      length: 0.25, // 25 cm arm
      gravityEnabled: true,
      dragCoeff: 0.001,
      ...mechanism,
    };
  }

  public reset(initialAngle: number = 0, initialVelocity: number = 0) {
    this.angle = initialAngle;
    this.velocity = initialVelocity;
    this.current = 0;
    this.acceleration = 0;
    this.impulseTorque = 0;
  }

  public applyImpulse(torque: number) {
    this.impulseTorque += torque;
  }

  public setConstantDisturbance(torque: number) {
    this.constantDisturbanceTorque = torque;
  }

  // Total inertia reflecting motor and attached mechanism
  public getTotalInertia(): number {
    let loadInertia = this.mechanismParams.loadInertia;
    if (this.mechanismParams.type === 'arm') {
      // Rod pivoting about end: (1/3) * m * L^2
      loadInertia = (1 / 3) * this.mechanismParams.mass * Math.pow(this.mechanismParams.length, 2);
    } else if (this.mechanismParams.type === 'wheel') {
      // Solid cylinder wheel + translated robot mass
      const r = this.mechanismParams.length;
      loadInertia = 0.5 * this.mechanismParams.mass * r * r + 0.002;
    } else if (this.mechanismParams.type === 'linear') {
      // Rack & pinion equivalent rotary inertia: m * r^2
      const pinionRadius = 0.02; // 2cm pinion
      loadInertia = this.mechanismParams.mass * pinionRadius * pinionRadius;
    }

    return this.motorParams.rotorInertia + loadInertia / (this.motorParams.gearRatio * this.motorParams.gearRatio);
  }

  // Compute external load torque based on the active mechanism
  public computeLoadTorque(angle: number, velocity: number): number {
    let tauLoad = 0;

    switch (this.mechanismParams.type) {
      case 'arm': {
        if (this.mechanismParams.gravityEnabled) {
          // Center of mass at L/2: m * g * (L/2) * sin(angle)
          // 0 rad = hanging straight down, pi/2 = horizontal
          const g = 9.81;
          const comDistance = this.mechanismParams.length / 2;
          tauLoad += this.mechanismParams.mass * g * comDistance * Math.sin(angle);
        }
        // Aerodynamic air drag: 0.5 * cd * v^2 * sgn(v)
        tauLoad += this.mechanismParams.dragCoeff * velocity * Math.abs(velocity);
        break;
      }
      case 'flywheel': {
        // High-speed air drag proportional to omega^2
        tauLoad += 0.0003 * velocity * Math.abs(velocity);
        break;
      }
      case 'wheel': {
        // Rolling friction + slight road surface resistance
        tauLoad += 0.02 * Math.sign(velocity);
        tauLoad += 0.002 * velocity;
        break;
      }
      case 'linear': {
        // Carriage travel limits [-0.25m, +0.25m] equivalent in radians
        const pinionRadius = 0.02;
        const positionMeters = angle * pinionRadius;
        if (positionMeters > 0.25) {
          tauLoad += 15.0 * (positionMeters - 0.25) / pinionRadius; // spring buffer end-stop
        } else if (positionMeters < -0.25) {
          tauLoad += 15.0 * (positionMeters - (-0.25)) / pinionRadius;
        }
        tauLoad += 0.01 * Math.sign(velocity);
        break;
      }
    }

    return tauLoad;
  }

  // Get simulated encoder reading with CPR quantization and optional noise
  public getMeasuredPosition(): number {
    const cpr = this.motorParams.encoderCpr;
    const radPerCount = (2 * Math.PI) / cpr;
    // Quantization
    const quantized = Math.round(this.angle / radPerCount) * radPerCount;

    // Optional sensor Gaussian noise
    if (this.motorParams.sensorNoiseStd > 0) {
      const u1 = Math.random() || 0.0001;
      const u2 = Math.random() || 0.0001;
      const gaussian = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      return quantized + gaussian * this.motorParams.sensorNoiseStd;
    }

    return quantized;
  }

  // Get simulated encoder velocity (with quantization / noise)
  public getMeasuredVelocity(): number {
    if (this.motorParams.sensorNoiseStd > 0) {
      const u1 = Math.random() || 0.0001;
      const u2 = Math.random() || 0.0001;
      const gaussian = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      return this.velocity + gaussian * (this.motorParams.sensorNoiseStd * 20.0);
    }
    return this.velocity;
  }

  // Step simulation forward by dt (seconds) using sub-stepping RK4
  public step(appliedVoltage: number, dt: number): { torque: number; current: number } {
    // Voltage saturation
    const maxV = this.motorParams.maxVoltage;
    const clampedVoltage = Math.max(-maxV, Math.min(maxV, appliedVoltage));

    // Internal sub-stepping for electrical and mechanical ODE stability
    const subSteps = Math.max(1, Math.ceil(dt / 0.0005));
    const subDt = dt / subSteps;

    const J = this.getTotalInertia();
    const R = this.motorParams.resistance;
    const L = this.motorParams.inductance;
    const Kt = this.motorParams.kt;
    const Ke = this.motorParams.ke;
    const b = this.motorParams.damping;
    const stiction = this.motorParams.stiction;

    for (let s = 0; s < subSteps; s++) {
      // 1. Decay transient impulse disturbance
      if (Math.abs(this.impulseTorque) > 0.0001) {
        this.impulseTorque *= Math.exp(-subDt * 12.0); // fast decay
      } else {
        this.impulseTorque = 0;
      }

      // 2. Electrical dynamics: di/dt = (V - R*i - Ke*omega) / L
      // Back-EMF opposing applied voltage
      const backEmf = Ke * this.velocity;
      const di_dt = (clampedVoltage - R * this.current - backEmf) / L;
      this.current += di_dt * subDt;

      // Current saturation
      const maxI = this.motorParams.maxCurrent;
      this.current = Math.max(-maxI, Math.min(maxI, this.current));

      // 3. Mechanical dynamics: T_motor = Kt * i
      const motorTorque = Kt * this.current;
      const loadTorque = this.computeLoadTorque(this.angle, this.velocity);
      const totalDisturbance = this.constantDisturbanceTorque + this.impulseTorque;

      // Friction model: Viscous damping + Stiction
      let frictionTorque = b * this.velocity;
      if (Math.abs(this.velocity) < 0.05) {
        // Static friction zone
        const netTorque = motorTorque - loadTorque - totalDisturbance;
        if (Math.abs(netTorque) < stiction) {
          // Motor is locked by stiction
          this.velocity = 0;
          this.acceleration = 0;
          continue;
        } else {
          frictionTorque += Math.sign(netTorque) * stiction;
        }
      } else {
        frictionTorque += Math.sign(this.velocity) * (stiction * 0.7); // Coulomb dynamic friction
      }

      // Net torque
      const netTorque = motorTorque - frictionTorque - loadTorque - totalDisturbance;
      this.acceleration = netTorque / J;

      // Integrate velocity and position
      this.velocity += this.acceleration * subDt;
      this.angle += this.velocity * subDt;
    }

    return {
      torque: Kt * this.current,
      current: this.current,
    };
  }
}
