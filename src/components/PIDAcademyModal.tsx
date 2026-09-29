import React, { useState } from 'react';
import { PIDGains } from '../types/simulation';

interface PIDAcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyGains: (gains: Partial<PIDGains>, message: string) => void;
}

export const PIDAcademyModal: React.FC<PIDAcademyModalProps> = ({
  isOpen,
  onClose,
  onApplyGains,
}) => {
  const [activeTab, setActiveTab] = useState<'intuition' | 'method' | 'recipes' | 'traps'>('intuition');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">PID Control Academy</h2>
            <p className="text-xs text-slate-400 mt-0.5">Control theory principles and practical tuning recipes for robotics</p>
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('intuition')}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'intuition'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Core Intuition (P, I, D, F)
          </button>
          <button
            onClick={() => setActiveTab('method')}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'method'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Tuning Playbook
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'recipes'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Interactive Experiments
          </button>
          <button
            onClick={() => setActiveTab('traps')}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'traps'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Real-World Traps
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {activeTab === 'intuition' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
                  <span>Proportional Term (Kp)</span>
                  <span className="text-xs font-mono text-slate-400">· "The Virtual Spring"</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Generates an immediate torque proportional to present error: <code className="font-mono text-amber-300">P = Kp * e(t)</code>.
                  A stiffer spring accelerates towards the target faster, but inertia will cause it to overshoot.
                  Importantly, in the presence of constant opposing torque (such as gravity pulling on an arm or friction), pure P can never reach zero error—it must maintain non-zero error just to produce holding torque!
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-purple-400 font-semibold mb-1">
                  <span>Integral Term (Ki)</span>
                  <span className="text-xs font-mono text-slate-400">· "The Memory & Persister"</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Integrates error over time: <code className="font-mono text-purple-300">I = Ki * ∫ e(t) dt</code>.
                  Even the tiniest persistent error builds up a relentless corrective push that eliminates steady-state droop caused by gravity or stiction.
                  However, too high Ki causes sluggish ringing and "integrator windup" if the actuator hits voltage limits.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-pink-400 font-semibold mb-1">
                  <span>Derivative Term (Kd)</span>
                  <span className="text-xs font-mono text-slate-400">· "The Shock Absorber"</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Measures the velocity of the error: <code className="font-mono text-pink-300">D = Kd * (de/dt)</code>.
                  As the motor rapidly approaches the target, <code className="font-mono">de/dt</code> becomes negative, generating a braking counter-torque that prevents overshoot and oscillation.
                  Caution: Real sensors have discrete quantization noise which gets amplified by derivative differentiation!
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
                  <span>Feedforward Term (Kf)</span>
                  <span className="text-xs font-mono text-slate-400">· "Anticipatory Action"</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Calculates expected torque required before error even occurs: <code className="font-mono text-cyan-300">F = Kf * sin(θ)</code>.
                  In robotics, compensating for known physical models (gravity, target velocity, acceleration) removes burden from feedback PID.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'method' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-white">The Robotics Engineer's Step-by-Step Tuning Guide</h3>
              <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside">
                <li className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <strong className="text-amber-400">Step 1: Zero Everything (Ki=0, Kd=0).</strong> Slowly increase <code className="font-mono text-amber-300">Kp</code> until the system responds briskly to step changes with slight steady oscillation.
                </li>
                <li className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <strong className="text-pink-400">Step 2: Add Damping (Kd).</strong> Increase <code className="font-mono text-pink-300">Kd</code> to damp out the ringing and prevent overshoot. Watch the oscilloscope to see the oscillations smooth out.
                </li>
                <li className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <strong className="text-purple-400">Step 3: Eliminate Steady-State Error (Ki).</strong> Once stable, add a moderate <code className="font-mono text-purple-300">Ki</code> to pull the arm or wheel all the way to 0.00 error against gravity.
                </li>
                <li className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <strong className="text-cyan-400">Step 4: Add Saturation Clamping.</strong> Constrain the integral sum so that during huge setpoint steps the motor doesn't wind up excessive energy while hitting physical voltage limits.
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'recipes' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-white text-xs">Load One-Click Pedagogical Experiments:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-amber-400">Demonstrate Gravity Droop (P-Only)</h4>
                    <p className="text-slate-400 mt-1 text-[11px]">
                      Kp=18, Ki=0, Kd=0. Notice how the arm settles 20° below target because gravity opposes it.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onApplyGains({ kp: 18, ki: 0, kd: 0, kf: 0 }, 'Loaded P-Only droop demo');
                      onClose();
                    }}
                    className="mt-3 px-3 py-1.5 bg-amber-600/80 hover:bg-amber-500 text-white rounded font-medium transition-colors"
                  >
                    Load P-Only
                  </button>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-rose-400">Unstable Ringing (Excessive Kp)</h4>
                    <p className="text-slate-400 mt-1 text-[11px]">
                      Kp=75, Ki=0, Kd=0. Watch the high-frequency oscillation and violent overshoot!
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onApplyGains({ kp: 75, ki: 0, kd: 0, kf: 0 }, 'Loaded excessive Kp demo');
                      onClose();
                    }}
                    className="mt-3 px-3 py-1.5 bg-rose-600/80 hover:bg-rose-500 text-white rounded font-medium transition-colors"
                  >
                    Load Ringing
                  </button>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-purple-400">Integrator Windup Disaster</h4>
                    <p className="text-slate-400 mt-1 text-[11px]">
                      Ki=35 without anti-windup clamping. Large setpoint steps cause deep overshooting while integral unwinds.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onApplyGains({ kp: 25, ki: 35, kd: 0.5, kf: 0 }, 'Loaded Windup demo');
                      onClose();
                    }}
                    className="mt-3 px-3 py-1.5 bg-purple-600/80 hover:bg-purple-500 text-white rounded font-medium transition-colors"
                  >
                    Load Windup
                  </button>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-emerald-400">Critically Damped Industrial PID</h4>
                    <p className="text-slate-400 mt-1 text-[11px]">
                      Kp=32, Ki=7.5, Kd=2.1. Fast 0.2s rise time, &lt;3% overshoot, and zero steady-state error.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onApplyGains({ kp: 32, ki: 7.5, kd: 2.1, kf: 0 }, 'Loaded Critically Damped PID');
                      onClose();
                    }}
                    className="mt-3 px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded font-medium transition-colors"
                  >
                    Load Optimal
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'traps' && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <h4 className="font-semibold text-amber-400">1. Derivative Kick on Step Input</h4>
                <p className="text-slate-300 mt-1">
                  When target setpoint suddenly jumps from 0° to 90°, <code className="font-mono">d(error)/dt</code> becomes nearly infinite for one tick!
                  Solution: Calculate derivative strictly on the measurement: <code className="font-mono">-Kd * (d_measurement / dt)</code>.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <h4 className="font-semibold text-amber-400">2. Actuator Saturation & Integral Windup</h4>
                <p className="text-slate-300 mt-1">
                  Motors can only provide up to their power supply limit (e.g. ±12V). If error persists while the motor is already maxed out, the integral term keeps accumulating imaginary control effort that takes seconds to unwind.
                  Solution: Clamp the integral accumulator or freeze integration during voltage saturation.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <h4 className="font-semibold text-amber-400">3. Sensor Noise Differentiation</h4>
                <p className="text-slate-300 mt-1">
                  Digital optical encoders produce discrete count jumps. Differentiating noisy position signals introduces high-frequency voltage chatter that heats up motor coils.
                  Solution: Pass the derivative through a 1st-order low-pass filter (tau ≈ 0.015s).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
