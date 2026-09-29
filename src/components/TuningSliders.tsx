import React from 'react';
import { PIDGains, TargetSignalType, MechanismType, MechanismParameters, MotorParameters } from '../types/simulation';

interface TuningSlidersProps {
  gains: PIDGains;
  onGainsChange: (newGains: Partial<PIDGains>) => void;
  targetSignal: TargetSignalType;
  targetValue: number;
  onTargetSignalChange: (sig: TargetSignalType) => void;
  onTargetValueChange: (val: number) => void;
  targetFrequency: number;
  onTargetFrequencyChange: (freq: number) => void;
  onTriggerStep: () => void;
  mechanism: MechanismParameters;
  onMechanismChange: (mech: Partial<MechanismParameters>) => void;
  motorParams: MotorParameters;
  onMotorParamsChange: (params: Partial<MotorParameters>) => void;
  constantDisturbance: number;
  onConstantDisturbanceChange: (val: number) => void;
}

export const TuningSliders: React.FC<TuningSlidersProps> = ({
  gains,
  onGainsChange,
  targetSignal,
  targetValue,
  onTargetSignalChange,
  onTargetValueChange,
  targetFrequency,
  onTargetFrequencyChange,
  onTriggerStep,
  mechanism,
  onMechanismChange,
  motorParams,
  onMotorParamsChange,
  constantDisturbance,
  onConstantDisturbanceChange,
}) => {
  return (
    <div className="flex flex-col bg-slate-900 rounded-xl border border-slate-800 p-3 h-full overflow-y-auto space-y-4">
      {/* 1. Target Setpoint Signal Generator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200">Setpoint Generator</span>
          <button
            onClick={onTriggerStep}
            className="px-2.5 py-1 text-xs font-medium bg-emerald-600/90 hover:bg-emerald-500 text-white rounded shadow transition-all active:scale-95"
          >
            Trigger Step Jump
          </button>
        </div>

        {/* Signal Mode Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => onTargetSignalChange('step')}
            className={`py-1 rounded font-medium transition-colors ${
              targetSignal === 'step' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Step
          </button>
          <button
            onClick={() => onTargetSignalChange('square')}
            className={`py-1 rounded font-medium transition-colors ${
              targetSignal === 'square' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Square
          </button>
          <button
            onClick={() => onTargetSignalChange('sine')}
            className={`py-1 rounded font-medium transition-colors ${
              targetSignal === 'sine' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sine
          </button>
          <button
            onClick={() => onTargetSignalChange('manual')}
            className={`py-1 rounded font-medium transition-colors ${
              targetSignal === 'manual' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Manual
          </button>
        </div>

        {/* Target Amplitude / Value Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Setpoint Target</span>
            <span className="text-emerald-400 font-semibold tabular-nums">
              {((targetValue * 180) / Math.PI).toFixed(0)}° ({targetValue.toFixed(2)} rad)
            </span>
          </div>
          <input
            type="range"
            min={-Math.PI}
            max={Math.PI}
            step={0.05}
            value={targetValue}
            onChange={(e) => onTargetValueChange(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Target Frequency Slider (for Periodic Waves) */}
        {(targetSignal === 'square' || targetSignal === 'sine') && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Wave Frequency</span>
              <span className="text-slate-300 tabular-nums">{targetFrequency.toFixed(2)} Hz</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.5}
              step={0.05}
              value={targetFrequency}
              onChange={(e) => onTargetFrequencyChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}
      </div>

      <div className="h-px bg-slate-800" />

      {/* 2. Interactive PID Gains Dials */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200">PID Parameters</span>
          <span className="text-[10px] text-slate-500 font-mono">Live tuning</span>
        </div>

        {/* Kp Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-amber-400 font-semibold">Kp (Proportional)</span>
            <span className="text-amber-300 font-semibold tabular-nums">{gains.kp.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            step={0.5}
            value={gains.kp}
            onChange={(e) => onGainsChange({ kp: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="text-[10px] text-slate-500">Stiffness & speed. Too high causes violent oscillation.</div>
        </div>

        {/* Ki Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-purple-400 font-semibold">Ki (Integral)</span>
            <span className="text-purple-300 font-semibold tabular-nums">{gains.ki.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={40}
            step={0.5}
            value={gains.ki}
            onChange={(e) => onGainsChange({ ki: parseFloat(e.target.value) })}
            className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="text-[10px] text-slate-500">Eliminates gravity/load droop. May cause overshoot.</div>
        </div>

        {/* Kd Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-pink-400 font-semibold">Kd (Derivative)</span>
            <span className="text-pink-300 font-semibold tabular-nums">{gains.kd.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={6.0}
            step={0.05}
            value={gains.kd}
            onChange={(e) => onGainsChange({ kd: parseFloat(e.target.value) })}
            className="w-full accent-pink-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="text-[10px] text-slate-500">Damps motion and reduces overshoot. Sensitive to noise.</div>
        </div>

        {/* Kf Feedforward */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-cyan-400 font-semibold">Kf (Feedforward)</span>
            <span className="text-cyan-300 font-semibold tabular-nums">{gains.kf.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={2.0}
            step={0.05}
            value={gains.kf}
            onChange={(e) => onGainsChange({ kf: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      <div className="h-px bg-slate-800" />

      {/* 3. Robotics Rig & Environment */}
      <div className="space-y-2.5">
        <span className="text-xs font-semibold text-slate-200 block">Robotics Load Rig</span>

        {/* Mechanism Selector */}
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {(['arm', 'flywheel', 'wheel', 'linear'] as MechanismType[]).map((type) => (
            <button
              key={type}
              onClick={() => onMechanismChange({ type })}
              className={`px-2.5 py-1.5 rounded-lg font-medium text-left capitalize border transition-all ${
                mechanism.type === type
                  ? 'bg-slate-800 border-cyan-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {type === 'arm' ? 'Robotic Arm' : type === 'flywheel' ? 'Flywheel Disc' : type === 'wheel' ? 'Robot Wheel' : 'Linear Rail'}
            </button>
          ))}
        </div>

        {/* Gravity Toggle for Arm */}
        {mechanism.type === 'arm' && (
          <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer pt-1">
            <span>Gravity Torque (9.81 m/s²)</span>
            <input
              type="checkbox"
              checked={mechanism.gravityEnabled}
              onChange={(e) => onMechanismChange({ gravityEnabled: e.target.checked })}
              className="accent-cyan-500 rounded"
            />
          </label>
        )}

        {/* Constant Load Disturbance Torque */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">External Disturbance Torque</span>
            <span className="text-rose-400 tabular-nums">{constantDisturbance.toFixed(2)} Nm</span>
          </div>
          <input
            type="range"
            min={-0.3}
            max={0.3}
            step={0.02}
            value={constantDisturbance}
            onChange={(e) => onConstantDisturbanceChange(parseFloat(e.target.value))}
            className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Encoder Sensor Noise */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Sensor Noise (Jitter)</span>
            <span className="text-slate-300 tabular-nums">
              {(motorParams.sensorNoiseStd * 1000).toFixed(1)} mrad
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={0.015}
            step={0.001}
            value={motorParams.sensorNoiseStd}
            onChange={(e) => onMotorParamsChange({ sensorNoiseStd: parseFloat(e.target.value) })}
            className="w-full accent-slate-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
