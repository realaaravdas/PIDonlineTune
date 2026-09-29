import React from 'react';
import { Challenge, PerformanceMetrics } from '../types/simulation';

export const ROBOTICS_CHALLENGES: Challenge[] = [
  {
    id: 'gravity_arm',
    title: 'Precision Robotic Arm: Gravity Defiance',
    description: 'Tune the motor to raise a robotic arm horizontal (90° / 1.57 rad) against gravity. Eliminate droop without exceeding 5% overshoot.',
    mechanism: 'arm',
    difficulty: 'Beginner',
    initialGains: {
      kp: 15.0,
      ki: 0.0,
      kd: 0.5,
      kf: 0.0,
      integralLimit: 5.0,
      derivativeFilterTau: 0.02,
    },
    targetType: 'step',
    targetValue: Math.PI / 2,
    disturbance: 0,
    requirements: {
      maxOvershootPercent: 6.0,
      maxSettlingTime: 0.8,
      maxSteadyStateError: 0.04,
    },
    hint: 'Notice the droop with Ki=0. Gradually raise Ki to 6-10 and use Kd to damp the overshoot.',
  },
  {
    id: 'flywheel_speed',
    title: 'High-Inertia Flywheel Velocity Lock',
    description: 'Drive the heavy flywheel up to target velocity smoothly without oscillation or ringing.',
    mechanism: 'flywheel',
    difficulty: 'Intermediate',
    initialGains: {
      kp: 20.0,
      ki: 2.0,
      kd: 0.2,
      kf: 0.0,
      integralLimit: 5.0,
      derivativeFilterTau: 0.02,
    },
    targetType: 'step',
    targetValue: 2.5,
    disturbance: 0,
    requirements: {
      maxOvershootPercent: 4.0,
      maxSettlingTime: 0.6,
      maxSteadyStateError: 0.03,
    },
    hint: 'Flywheels have pure rotational inertia. Excessive Kp easily triggers ringing—rely more on moderate Kp and Kd.',
  },
  {
    id: 'disturbance_shock',
    title: 'Disturbance Rejection: External Impact',
    description: 'A constant 0.18 Nm opposing load is applied to the shaft. Maintain tight angle lock and recover rapidly from shocks.',
    mechanism: 'arm',
    difficulty: 'Advanced',
    initialGains: {
      kp: 30.0,
      ki: 5.0,
      kd: 1.5,
      kf: 0.0,
      integralLimit: 5.0,
      derivativeFilterTau: 0.02,
    },
    targetType: 'step',
    targetValue: 1.0,
    disturbance: 0.18,
    requirements: {
      maxOvershootPercent: 8.0,
      maxSettlingTime: 0.7,
      maxSteadyStateError: 0.03,
    },
    hint: 'Increase integral gain Ki and anti-windup clamping to reject external load torque quickly.',
  },
];

interface ChallengesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadChallenge: (challenge: Challenge) => void;
  currentMetrics: PerformanceMetrics;
  activeChallengeId: string | null;
}

export const ChallengesModal: React.FC<ChallengesModalProps> = ({
  isOpen,
  onClose,
  onLoadChallenge,
  currentMetrics,
  activeChallengeId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">Robotics Tuning Challenges</h2>
            <p className="text-xs text-slate-400 mt-0.5">Test your PID engineering skills against real robotic constraints</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {ROBOTICS_CHALLENGES.map((ch) => {
            const isActive = activeChallengeId === ch.id;
            const meetsOvershoot = currentMetrics.overshootPercent <= ch.requirements.maxOvershootPercent;
            const meetsSteady = currentMetrics.steadyStateError <= ch.requirements.maxSteadyStateError;
            const meetsSettling = currentMetrics.settlingTime !== null && currentMetrics.settlingTime <= ch.requirements.maxSettlingTime;
            const isCompleted = isActive && meetsOvershoot && meetsSteady && meetsSettling;

            return (
              <div
                key={ch.id}
                className={`p-4 rounded-xl border transition-all ${
                  isActive ? 'bg-slate-950 border-cyan-500/80 shadow-lg' : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{ch.title}</span>
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">{ch.difficulty}</span>
                      {isCompleted && (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          ✓ Passed!
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-xs mt-1 leading-relaxed">{ch.description}</p>
                  </div>

                  <button
                    onClick={() => {
                      onLoadChallenge(ch);
                      onClose();
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
                      isActive
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isActive ? 'Reset Target' : 'Start Challenge'}
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Max Overshoot:</span>
                    <span className={isActive && meetsOvershoot ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                      &le; {ch.requirements.maxOvershootPercent}%
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Max Settling:</span>
                    <span className={isActive && meetsSettling ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                      &le; {ch.requirements.maxSettlingTime}s
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Max Steady Error:</span>
                    <span className={isActive && meetsSteady ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                      &le; {ch.requirements.maxSteadyStateError} rad
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-amber-300/80">
                  <span className="font-semibold text-amber-400">Engineering Hint:</span> {ch.hint}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
