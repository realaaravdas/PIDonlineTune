export type MechanismType = 'arm' | 'flywheel' | 'wheel' | 'linear';

export type LanguageType = 'python' | 'cpp' | 'javascript';

export type TargetSignalType = 'step' | 'square' | 'sine' | 'manual';

export interface MotorParameters {
  resistance: number; // Armature resistance (Ohms)
  inductance: number; // Armature inductance (Henry)
  kt: number; // Torque constant (Nm / A)
  ke: number; // Back-EMF constant (V / rad/s)
  rotorInertia: number; // Motor rotor moment of inertia (kg*m^2)
  damping: number; // Viscous friction coefficient (Nm*s / rad)
  stiction: number; // Coulomb / static friction torque (Nm)
  maxVoltage: number; // Max supply voltage (Volts, e.g. 12V or 24V)
  maxCurrent: number; // Peak stall current limit (Amperes)
  gearRatio: number; // Gearbox reduction ratio (e.g. 1:1 or 20:1)
  encoderCpr: number; // Encoder counts per revolution (CPR)
  sensorNoiseStd: number; // Sensor Gaussian noise std dev (radians)
}

export interface MechanismParameters {
  type: MechanismType;
  loadInertia: number; // kg*m^2
  mass: number; // kg (for arm / linear / wheel)
  length: number; // meters (arm length or wheel radius)
  gravityEnabled: boolean; // Arm gravity torque
  dragCoeff: number; // Aerodynamic or surface drag
}

export interface PIDGains {
  kp: number;
  ki: number;
  kd: number;
  kf: number; // Feedforward gain
  integralLimit: number; // Anti-windup limit
  derivativeFilterTau: number; // Low-pass filter for D-term (seconds)
}

export interface ControllerState {
  integral: number;
  prevError: number;
  prevMeasurement: number;
  prevDerivative: number;
  customData: Record<string, any>;
}

export interface TelemetrySample {
  time: number; // seconds
  target: number; // target angle (rad) or velocity (rad/s)
  current: number; // actual angle (rad) or velocity (rad/s)
  error: number; // target - current
  pTerm: number;
  iTerm: number;
  dTerm: number;
  fTerm: number;
  voltage: number; // applied control output (-maxV to +maxV)
  currentAmp: number; // motor electrical current
  torque: number; // mechanical torque output (Nm)
  disturbanceTorque: number;
}

export interface PerformanceMetrics {
  riseTime: number | null; // time to go from 10% to 90% of step (s)
  overshootPercent: number; // peak overshoot (%)
  settlingTime: number | null; // time to stay within 2% band (s)
  steadyStateError: number; // absolute error at steady state
  rmse: number; // root mean square error
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  mechanism: MechanismType;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  initialGains: PIDGains;
  targetType: TargetSignalType;
  targetValue: number;
  disturbance: number;
  requirements: {
    maxOvershootPercent: number;
    maxSettlingTime: number;
    maxSteadyStateError: number;
  };
  hint: string;
}
