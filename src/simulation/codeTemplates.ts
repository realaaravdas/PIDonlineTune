import { LanguageType } from '../types/simulation';

export interface CodePreset {
  id: string;
  name: string;
  description: string;
  code: Record<LanguageType, string>;
}

export const CODE_PRESETS: CodePreset[] = [
  {
    id: 'classic_pid',
    name: 'Classic PID Controller',
    description: 'Standard proportional, integral, and derivative control loop.',
    code: {
      python: `# Classic PID Controller for DC Motor
# target: desired angle (rad) or velocity (rad/s)
# current: measured position or velocity
# dt: time step in seconds
# state: persistent dictionary between ticks

def init_controller():
    return {
        "kp": 28.0,
        "ki": 6.5,
        "kd": 1.8,
        "integral": 0.0,
        "prev_error": 0.0
    }

def update(target, current, dt, state):
    error = target - current
    
    # 1. Proportional term
    p_term = state["kp"] * error
    
    # 2. Integral term (accumulates error over time)
    state["integral"] += error * dt
    i_term = state["ki"] * state["integral"]
    
    # 3. Derivative term (reacts to rate of change)
    derivative = (error - state["prev_error"]) / dt if dt > 0 else 0.0
    d_term = state["kd"] * derivative
    
    state["prev_error"] = error
    
    # Sum components to compute output voltage
    output_voltage = p_term + i_term + d_term
    
    # Return control output and diagnostic breakdown
    return {
        "output": output_voltage,
        "p": p_term,
        "i": i_term,
        "d": d_term,
        "f": 0.0
    }
`,
      cpp: `// Classic PID Controller for Robotics Microcontroller
// target: desired setpoint (rad or rad/s)
// current: sensor feedback
// dt: loop duration in seconds

struct ControllerState {
    double kp = 28.0;
    double ki = 6.5;
    double kd = 1.8;
    double integral = 0.0;
    double prev_error = 0.0;
};

PIDOutput update(double target, double current, double dt, ControllerState& state) {
    double error = target - current;
    
    // Proportional term
    double p_term = state.kp * error;
    
    // Integral accumulation
    state.integral += error * dt;
    double i_term = state.ki * state.integral;
    
    // Derivative rate of change
    double derivative = (dt > 0) ? (error - state.prev_error) / dt : 0.0;
    double d_term = state.kd * derivative;
    
    state.prev_error = error;
    
    double output_voltage = p_term + i_term + d_term;
    return PIDOutput(output_voltage, p_term, i_term, d_term, 0.0);
}
`,
      javascript: `// Classic PID Controller
// target: desired setpoint (rad or rad/s)
// current: sensor feedback
// dt: loop duration in seconds
// state: persistent object across cycles

function initController() {
  return {
    kp: 28.0,
    ki: 6.5,
    kd: 1.8,
    integral: 0.0,
    prevError: 0.0,
  };
}

function update(target, current, dt, state) {
  const error = target - current;

  // Proportional
  const pTerm = state.kp * error;

  // Integral
  state.integral += error * dt;
  const iTerm = state.ki * state.integral;

  // Derivative
  const derivative = dt > 0 ? (error - state.prevError) / dt : 0;
  const dTerm = state.kd * derivative;

  state.prevError = error;

  const output = pTerm + iTerm + dTerm;
  return {
    output,
    p: pTerm,
    i: iTerm,
    d: dTerm,
    f: 0,
  };
}
`,
    },
  },
  {
    id: 'anti_windup',
    name: 'PID + Anti-Windup & Clamping',
    description: 'Prevents integrator windup when actuators saturate at maximum voltage.',
    code: {
      python: `# PID with Actuator Saturation Anti-Windup
# Prevents catastrophic overshoot caused by deep integral accumulation during saturation

def init_controller():
    return {
        "kp": 35.0,
        "ki": 15.0,
        "kd": 2.2,
        "integral": 0.0,
        "prev_error": 0.0,
        "max_voltage": 12.0,
        "integral_limit": 4.0 # max saturation allowed for integral
    }

def update(target, current, dt, state):
    error = target - current
    p_term = state["kp"] * error
    
    # Anti-windup: clamp integral accumulator
    state["integral"] += error * dt
    limit = state["integral_limit"]
    state["integral"] = max(-limit, min(limit, state["integral"]))
    i_term = state["ki"] * state["integral"]
    
    derivative = (error - state["prev_error"]) / dt if dt > 0 else 0.0
    d_term = state["kd"] * derivative
    state["prev_error"] = error
    
    raw_output = p_term + i_term + d_term
    
    # Actuator physical clamping (+/- 12V)
    clamped_output = max(-state["max_voltage"], min(state["max_voltage"], raw_output))
    
    return {
        "output": clamped_output,
        "p": p_term,
        "i": i_term,
        "d": d_term,
        "f": 0.0
    }
`,
      cpp: `// PID with Anti-Windup Saturation Clamping
struct ControllerState {
    double kp = 35.0;
    double ki = 15.0;
    double kd = 2.2;
    double integral = 0.0;
    double prev_error = 0.0;
    double max_voltage = 12.0;
    double integral_limit = 4.0;
};

PIDOutput update(double target, double current, double dt, ControllerState& state) {
    double error = target - current;
    double p_term = state.kp * error;
    
    // Clamped integration to prevent windup
    state.integral += error * dt;
    if (state.integral > state.integral_limit) state.integral = state.integral_limit;
    if (state.integral < -state.integral_limit) state.integral = -state.integral_limit;
    double i_term = state.ki * state.integral;
    
    double derivative = (dt > 0) ? (error - state.prev_error) / dt : 0.0;
    double d_term = state.kd * derivative;
    state.prev_error = error;
    
    double raw_output = p_term + i_term + d_term;
    double output = fmax(-state.max_voltage, fmin(state.max_voltage, raw_output));
    
    return PIDOutput(output, p_term, i_term, d_term, 0.0);
}
`,
      javascript: `// PID with Anti-Windup & Saturation Clamping
function initController() {
  return {
    kp: 35.0,
    ki: 15.0,
    kd: 2.2,
    integral: 0.0,
    prevError: 0.0,
    maxVoltage: 12.0,
    integralLimit: 4.0,
  };
}

function update(target, current, dt, state) {
  const error = target - current;
  const pTerm = state.kp * error;

  // Clamped integral
  state.integral += error * dt;
  state.integral = Math.max(-state.integralLimit, Math.min(state.integralLimit, state.integral));
  const iTerm = state.ki * state.integral;

  const derivative = dt > 0 ? (error - state.prevError) / dt : 0;
  const dTerm = state.kd * derivative;
  state.prevError = error;

  const raw = pTerm + iTerm + dTerm;
  const output = Math.max(-state.maxVoltage, Math.min(state.maxVoltage, raw));

  return { output, p: pTerm, i: iTerm, d: dTerm, f: 0 };
}
`,
    },
  },
  {
    id: 'derivative_on_measurement',
    name: 'Derivative on Measurement (No Kick)',
    description: 'Computes derivative from changes in sensor measurement to avoid setpoint step spikes.',
    code: {
      python: `# Derivative on Measurement (Prevents Derivative Kick)
# Instead of d(error)/dt, uses -d(current)/dt so sudden target jumps don't slam the motor

def init_controller():
    return {
        "kp": 30.0,
        "ki": 8.0,
        "kd": 2.4,
        "integral": 0.0,
        "prev_measurement": 0.0,
        "filtered_d": 0.0
    }

def update(target, current, dt, state):
    error = target - current
    p_term = state["kp"] * error
    
    state["integral"] += error * dt
    # Anti-windup
    state["integral"] = max(-5.0, min(5.0, state["integral"]))
    i_term = state["ki"] * state["integral"]
    
    # Derivative on measurement: -d(current)/dt
    d_measurement = (current - state["prev_measurement"]) / dt if dt > 0 else 0.0
    raw_d = -state["kd"] * d_measurement
    
    # Low-pass filter to smooth sensor encoder noise (tau = 0.015s)
    alpha = dt / (dt + 0.015)
    state["filtered_d"] += alpha * (raw_d - state["filtered_d"])
    d_term = state["filtered_d"]
    
    state["prev_measurement"] = current
    
    output = p_term + i_term + d_term
    return {"output": output, "p": p_term, "i": i_term, "d": d_term, "f": 0.0}
`,
      cpp: `// Derivative on Measurement with Low-Pass Filtering
struct ControllerState {
    double kp = 30.0;
    double ki = 8.0;
    double kd = 2.4;
    double integral = 0.0;
    double prev_measurement = 0.0;
    double filtered_d = 0.0;
};

PIDOutput update(double target, double current, double dt, ControllerState& state) {
    double error = target - current;
    double p_term = state.kp * error;
    
    state.integral += error * dt;
    state.integral = fmax(-5.0, fmin(5.0, state.integral));
    double i_term = state.ki * state.integral;
    
    // -d(current)/dt eliminates setpoint impulse kick
    double d_meas = (dt > 0) ? (current - state.prev_measurement) / dt : 0.0;
    double raw_d = -state.kd * d_meas;
    
    // 1st order filter
    double alpha = dt / (dt + 0.015);
    state.filtered_d += alpha * (raw_d - state.filtered_d);
    double d_term = state.filtered_d;
    
    state.prev_measurement = current;
    return PIDOutput(p_term + i_term + d_term, p_term, i_term, d_term, 0.0);
}
`,
      javascript: `// Derivative on Measurement with Low-Pass Filter
function initController() {
  return {
    kp: 30.0,
    ki: 8.0,
    kd: 2.4,
    integral: 0.0,
    prevMeasurement: 0.0,
    filteredD: 0.0,
  };
}

function update(target, current, dt, state) {
  const error = target - current;
  const pTerm = state.kp * error;

  state.integral += error * dt;
  state.integral = Math.max(-5.0, Math.min(5.0, state.integral));
  const iTerm = state.ki * state.integral;

  // Derivative on measurement: -d(current)/dt
  const dMeas = dt > 0 ? (current - state.prevMeasurement) / dt : 0;
  const rawD = -state.kd * dMeas;

  // Low-pass filter for sensor noise (tau = 0.015s)
  const alpha = dt / (dt + 0.015);
  state.filteredD += alpha * (rawD - state.filteredD);
  const dTerm = state.filteredD;

  state.prevMeasurement = current;
  return { output: pTerm + iTerm + dTerm, p: pTerm, i: iTerm, d: dTerm, f: 0 };
}
`,
    },
  },
  {
    id: 'feedforward_pid',
    name: 'Feedforward + PID (Robotics Trajectory)',
    description: 'Combines gravity/velocity feedforward anticipation with closed-loop PID error correction.',
    code: {
      python: `# Feedforward + Closed-Loop PID for Robotic Arm
# Gravity feedforward cancels gravitational torque instantly without waiting for integral error!
import math

def init_controller():
    return {
        "kp": 22.0,
        "ki": 4.0,
        "kd": 1.5,
        "k_gravity": 0.65, # Feedforward voltage to counteract gravity
        "integral": 0.0,
        "prev_error": 0.0
    }

def update(target, current, dt, state):
    error = target - current
    p_term = state["kp"] * error
    
    state["integral"] += error * dt
    state["integral"] = max(-3.0, min(3.0, state["integral"]))
    i_term = state["ki"] * state["integral"]
    
    derivative = (error - state["prev_error"]) / dt if dt > 0 else 0.0
    d_term = state["kd"] * derivative
    state["prev_error"] = error
    
    # Gravity Feedforward: tau_g = m * g * r * sin(theta)
    # Voltage needed: V_ff = k_gravity * sin(current)
    f_term = state["k_gravity"] * math.sin(current)
    
    output = p_term + i_term + d_term + f_term
    return {
        "output": output,
        "p": p_term,
        "i": i_term,
        "d": d_term,
        "f": f_term
    }
`,
      cpp: `// Feedforward + Closed-Loop PID
#include <cmath>

struct ControllerState {
    double kp = 22.0;
    double ki = 4.0;
    double kd = 1.5;
    double k_gravity = 0.65;
    double integral = 0.0;
    double prev_error = 0.0;
};

PIDOutput update(double target, double current, double dt, ControllerState& state) {
    double error = target - current;
    double p_term = state.kp * error;
    
    state.integral += error * dt;
    state.integral = fmax(-3.0, fmin(3.0, state.integral));
    double i_term = state.ki * state.integral;
    
    double derivative = (dt > 0) ? (error - state.prev_error) / dt : 0.0;
    double d_term = state.kd * derivative;
    state.prev_error = error;
    
    // Anticipatory gravity compensation
    double f_term = state.k_gravity * std::sin(current);
    
    double output = p_term + i_term + d_term + f_term;
    return PIDOutput(output, p_term, i_term, d_term, f_term);
}
`,
      javascript: `// Feedforward + Closed-Loop PID
function initController() {
  return {
    kp: 22.0,
    ki: 4.0,
    kd: 1.5,
    kGravity: 0.65,
    integral: 0.0,
    prevError: 0.0,
  };
}

function update(target, current, dt, state) {
  const error = target - current;
  const pTerm = state.kp * error;

  state.integral += error * dt;
  state.integral = Math.max(-3.0, Math.min(3.0, state.integral));
  const iTerm = state.ki * state.integral;

  const derivative = dt > 0 ? (error - state.prevError) / dt : 0;
  const dTerm = state.kd * derivative;
  state.prevError = error;

  // Gravity Feedforward anticipatory compensation
  const fTerm = state.kGravity * Math.sin(current);

  const output = pTerm + iTerm + dTerm + fTerm;
  return { output, p: pTerm, i: iTerm, d: dTerm, f: fTerm };
}
`,
    },
  },
  {
    id: 'p_only',
    name: 'P-Only Control (Educational Droop Demo)',
    description: 'Proportional-only control to observe steady-state droop caused by load torque.',
    code: {
      python: `# Proportional-Only Control
# Observe steady-state error (droop) when gravity or load torque opposes the motor!
# Notice how increasing Kp reduces droop but increases oscillation.

def init_controller():
    return {
        "kp": 20.0
    }

def update(target, current, dt, state):
    error = target - current
    p_term = state["kp"] * error
    
    return {
        "output": p_term,
        "p": p_term,
        "i": 0.0,
        "d": 0.0,
        "f": 0.0
    }
`,
      cpp: `// Proportional-Only Control (Observe steady-state droop)
struct ControllerState {
    double kp = 20.0;
};

PIDOutput update(double target, double current, double dt, ControllerState& state) {
    double error = target - current;
    double p_term = state.kp * error;
    return PIDOutput(p_term, p_term, 0.0, 0.0, 0.0);
}
`,
      javascript: `// Proportional-Only Control
function initController() {
  return {
    kp: 20.0,
  };
}

function update(target, current, dt, state) {
  const error = target - current;
  const pTerm = state.kp * error;
  return {
    output: pTerm,
    p: pTerm,
    i: 0,
    d: 0,
    f: 0,
  };
}
`,
    },
  },
];
