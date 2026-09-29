import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MechanismType,
  LanguageType,
  TargetSignalType,
  PIDGains,
  TelemetrySample,
  PerformanceMetrics,
  MechanismParameters,
  MotorParameters,
  Challenge,
} from './types/simulation';
import { MotorSimulation } from './simulation/motorPhysics';
import { ControllerRuntime } from './simulation/controllerRuntime';
import { CODE_PRESETS } from './simulation/codeTemplates';
import { Header } from './components/Header';
import { MotorCanvas3D } from './components/MotorCanvas3D';
import { TelemetryGraph } from './components/TelemetryGraph';
import { CodeEditor } from './components/CodeEditor';
import { TuningSliders } from './components/TuningSliders';
import { PIDAcademyModal } from './components/PIDAcademyModal';
import { ChallengesModal } from './components/ChallengesModal';

export default function App() {
  // Navigation / View modes
  const [activeView, setActiveView] = useState<'studio' | 'tuner' | 'compare'>('studio');
  const [isAcademyOpen, setIsAcademyOpen] = useState(false);
  const [isChallengesOpen, setIsChallengesOpen] = useState(false);
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Simulation parameters
  const [language, setLanguage] = useState<LanguageType>('python');
  const [code, setCode] = useState<string>(CODE_PRESETS[0].code.python);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [gains, setGains] = useState<PIDGains>({
    kp: 28.0,
    ki: 6.5,
    kd: 1.8,
    kf: 0.0,
    integralLimit: 5.0,
    derivativeFilterTau: 0.015,
  });

  const [targetSignal, setTargetSignal] = useState<TargetSignalType>('step');
  const [targetValue, setTargetValue] = useState<number>(Math.PI / 2); // 90 degrees
  const [targetFrequency, setTargetFrequency] = useState<number>(0.25); // 0.25 Hz
  const [constantDisturbance, setConstantDisturbance] = useState<number>(0.0);
  const [impulseActive, setImpulseActive] = useState<boolean>(false);

  const [mechanism, setMechanism] = useState<MechanismParameters>({
    type: 'arm',
    loadInertia: 0.008,
    mass: 0.45,
    length: 0.25,
    gravityEnabled: true,
    dragCoeff: 0.001,
  });

  const [motorParams, setMotorParams] = useState<MotorParameters>({
    resistance: 1.5,
    inductance: 0.004,
    kt: 0.08,
    ke: 0.08,
    rotorInertia: 0.0004,
    damping: 0.0015,
    stiction: 0.015,
    maxVoltage: 12.0,
    maxCurrent: 10.0,
    gearRatio: 1.0,
    encoderCpr: 1024,
    sensorNoiseStd: 0.0,
  });

  // Telemetry buffer & metrics
  const [telemetry, setTelemetry] = useState<TelemetrySample[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    riseTime: null,
    overshootPercent: 0,
    settlingTime: null,
    steadyStateError: 0,
    rmse: 0,
  });

  // Live 3D states
  const [liveMotorState, setLiveMotorState] = useState({
    angle: 0,
    targetAngle: Math.PI / 2,
    velocity: 0,
    voltage: 0,
    currentAmp: 0,
    torque: 0,
  });

  // Persistent instances
  const motorSimRef = useRef<MotorSimulation>(new MotorSimulation(motorParams, mechanism));
  const runtimeRef = useRef<ControllerRuntime>(new ControllerRuntime(language, code));
  const lastTimeRef = useRef<number>(performance.now());
  const simTimeRef = useRef<number>(0);
  const telemetryHistoryRef = useRef<TelemetrySample[]>([]);
  const stepStartRef = useRef<{ time: number; startVal: number; targetVal: number } | null>(null);

  // Show temporary toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  // Sync motor & mechanism parameters
  useEffect(() => {
    motorSimRef.current.motorParams = motorParams;
    motorSimRef.current.mechanismParams = mechanism;
  }, [motorParams, mechanism]);

  // Sync constant disturbance
  useEffect(() => {
    motorSimRef.current.setConstantDisturbance(constantDisturbance);
  }, [constantDisturbance]);

  // Sync code updates into runtime
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    runtimeRef.current.setCode(newCode, language);
  };

  // Switch programming language
  const handleLanguageChange = (newLang: LanguageType) => {
    setLanguage(newLang);
    // Find current preset or default to classic
    const preset = CODE_PRESETS[0];
    const newCode = preset.code[newLang];
    setCode(newCode);
    runtimeRef.current.setCode(newCode, newLang);
    showToast(`Switched editor to ${newLang.toUpperCase()}`);
  };

  // Reset code to preset
  const handleResetToPreset = (presetId: string) => {
    const preset = CODE_PRESETS.find((p) => p.id === presetId) || CODE_PRESETS[0];
    const newCode = preset.code[language];
    setCode(newCode);
    runtimeRef.current.setCode(newCode, language);
    runtimeRef.current.resetState();
    showToast(`Loaded ${preset.name}`);
  };

  // Apply gains directly from sliders or presets
  const handleGainsChange = (newGains: Partial<PIDGains>) => {
    const updated = { ...gains, ...newGains };
    setGains(updated);
    // Sync into runtime state
    if (runtimeRef.current.state) {
      if (updated.kp !== undefined) runtimeRef.current.state.kp = updated.kp;
      if (updated.ki !== undefined) runtimeRef.current.state.ki = updated.ki;
      if (updated.kd !== undefined) runtimeRef.current.state.kd = updated.kd;
      if (updated.kf !== undefined) runtimeRef.current.state.kf = updated.kf;
    }
  };

  // Trigger sudden step setpoint jump
  const triggerStepJump = useCallback(() => {
    const newTarget = Math.abs(targetValue - Math.PI / 2) < 0.2 ? -Math.PI / 3 : Math.PI / 2;
    setTargetValue(newTarget);
    stepStartRef.current = {
      time: simTimeRef.current,
      startVal: motorSimRef.current.angle,
      targetVal: newTarget,
    };
    showToast(`Fired Step Jump to ${((newTarget * 180) / Math.PI).toFixed(0)}°`);
  }, [targetValue]);

  // Reset entire motor state
  const resetSystem = () => {
    motorSimRef.current.reset();
    runtimeRef.current.resetState();
    telemetryHistoryRef.current = [];
    setTelemetry([]);
    setLiveMotorState({
      angle: 0,
      targetAngle: targetValue,
      velocity: 0,
      voltage: 0,
      currentAmp: 0,
      torque: 0,
    });
    stepStartRef.current = {
      time: simTimeRef.current,
      startVal: 0,
      targetVal: targetValue,
    };
    showToast('Reset Motor Position & Controller Memory');
  };

  // Apply torque disturbance impulse
  const handleApplyDisturbance = (torque: number) => {
    motorSimRef.current.applyImpulse(torque);
    setImpulseActive(true);
    setTimeout(() => setImpulseActive(false), 300);
    showToast(`Injected +${torque} Nm Torque Impulse!`);
  };

  // Load a robotics challenge
  const handleLoadChallenge = (challenge: Challenge) => {
    setActiveChallengeId(challenge.id);
    setMechanism((m) => ({ ...m, type: challenge.mechanism }));
    handleGainsChange(challenge.initialGains);
    setTargetSignal(challenge.targetType);
    setTargetValue(challenge.targetValue);
    setConstantDisturbance(challenge.disturbance);
    resetSystem();
    showToast(`Started Challenge: ${challenge.title}`);
  };

  // Main Simulation Physics & Controller Animation Loop (60 Hz)
  useEffect(() => {
    let animId: number;
    let lastTelemetryUiUpdate = 0;

    const loop = (currentTime: number) => {
      animId = requestAnimationFrame(loop);

      if (isPaused) {
        lastTimeRef.current = currentTime;
        return;
      }

      // Delta time in seconds, clamped for tab-switch safety
      const rawDt = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;
      const dt = Math.min(rawDt, 0.05);

      if (dt <= 0) return;
      simTimeRef.current += dt;
      const t = simTimeRef.current;

      // 1. Calculate Target Setpoint based on selected generator
      let currentTarget = targetValue;
      if (targetSignal === 'square') {
        const period = 1 / Math.max(0.05, targetFrequency);
        const cycle = (t % period) / period;
        currentTarget = cycle < 0.5 ? targetValue : -targetValue * 0.5;
      } else if (targetSignal === 'sine') {
        currentTarget = targetValue * Math.sin(2 * Math.PI * targetFrequency * t);
      }

      // 2. Measure motor position with encoder quantization & noise
      const measuredPosition = motorSimRef.current.getMeasuredPosition();

      // 3. Execute Controller Code
      const result = runtimeRef.current.execute(currentTarget, measuredPosition, dt);

      // Clamp voltage output to motor maximum
      const maxV = motorSimRef.current.motorParams.maxVoltage;
      const appliedVoltage = Math.max(-maxV, Math.min(maxV, result.output));

      // 4. Step Physical Dynamics (2nd order ODE RK4)
      const physicsOutput = motorSimRef.current.step(appliedVoltage, dt);

      // 5. Append sample to Telemetry History
      const error = currentTarget - motorSimRef.current.angle;
      const sample: TelemetrySample = {
        time: t,
        target: currentTarget,
        current: motorSimRef.current.angle,
        error,
        pTerm: result.p,
        iTerm: result.i,
        dTerm: result.d,
        fTerm: result.f,
        voltage: appliedVoltage,
        currentAmp: physicsOutput.current,
        torque: physicsOutput.torque,
        disturbanceTorque: motorSimRef.current.constantDisturbanceTorque + motorSimRef.current.impulseTorque,
      };

      const history = telemetryHistoryRef.current;
      history.push(sample);
      // Keep last 15 seconds (~900 samples at 60Hz)
      if (history.length > 950) {
        history.shift();
      }

      // 6. Compute automated control benchmarks on step responses
      if (stepStartRef.current) {
        const { time: t0, startVal, targetVal } = stepStartRef.current;
        const stepDelta = targetVal - startVal;
        if (Math.abs(stepDelta) > 0.1) {
          const stepSamples = history.filter((s) => s.time >= t0);
          if (stepSamples.length > 5) {
            // Overshoot calculation
            let peakVal = startVal;
            if (stepDelta > 0) {
              peakVal = Math.max(...stepSamples.map((s) => s.current));
              const overshoot = Math.max(0, ((peakVal - targetVal) / Math.abs(stepDelta)) * 100);
              metrics.overshootPercent = overshoot;
            } else {
              peakVal = Math.min(...stepSamples.map((s) => s.current));
              const overshoot = Math.max(0, ((targetVal - peakVal) / Math.abs(stepDelta)) * 100);
              metrics.overshootPercent = overshoot;
            }

            // Rise time (10% to 90%)
            const v10 = startVal + 0.1 * stepDelta;
            const v90 = startVal + 0.9 * stepDelta;
            const s10 = stepSamples.find((s) => (stepDelta > 0 ? s.current >= v10 : s.current <= v10));
            const s90 = stepSamples.find((s) => (stepDelta > 0 ? s.current >= v90 : s.current <= v90));
            if (s10 && s90 && s90.time >= s10.time) {
              metrics.riseTime = s90.time - s10.time;
            }

            // Settling time (within 2% or 5% of target)
            const toleranceBand = Math.abs(stepDelta) * 0.05;
            let lastOutsideTime = t0;
            for (const s of stepSamples) {
              if (Math.abs(s.current - targetVal) > toleranceBand) {
                lastOutsideTime = s.time;
              }
            }
            if (t - lastOutsideTime > 0.4) {
              metrics.settlingTime = Math.max(0, lastOutsideTime - t0);
            }
          }
        }
      }
      metrics.steadyStateError = Math.abs(error);

      // Throttle UI React state updates to 30Hz for optimal DOM performance
      if (currentTime - lastTelemetryUiUpdate > 33) {
        lastTelemetryUiUpdate = currentTime;
        setLiveMotorState({
          angle: motorSimRef.current.angle,
          targetAngle: currentTarget,
          velocity: motorSimRef.current.velocity,
          voltage: appliedVoltage,
          currentAmp: physicsOutput.current,
          torque: physicsOutput.torque,
        });
        setTelemetry([...history]);
        setMetrics({ ...metrics });
      }
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [isPaused, targetSignal, targetValue, targetFrequency]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Bar Header adhering to Top Bar Contract */}
      <Header
        onOpenAcademy={() => setIsAcademyOpen(true)}
        onOpenChallenges={() => setIsChallengesOpen(true)}
        onResetSystem={resetSystem}
        onTriggerStep={triggerStepJump}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 p-3 grid gap-3 overflow-hidden grid-cols-1 lg:grid-cols-12 min-h-0">
        {activeView === 'studio' ? (
          <>
            {/* Left Column (7 cols): 3D Motor & Real-Time Oscilloscope */}
            <div className="lg:col-span-7 flex flex-col gap-3 h-full min-h-0">
              {/* 3D Virtual Motor Bench Viewport */}
              <div className="flex-1 min-h-[280px]">
                <MotorCanvas3D
                  angle={liveMotorState.angle}
                  targetAngle={liveMotorState.targetAngle}
                  velocity={liveMotorState.velocity}
                  voltage={liveMotorState.voltage}
                  currentAmp={liveMotorState.currentAmp}
                  torque={liveMotorState.torque}
                  mechanism={mechanism.type}
                  impulseActive={impulseActive}
                  onApplyDisturbance={handleApplyDisturbance}
                  onSetTargetAngle={(a) => setTargetValue(a)}
                />
              </div>

              {/* Multi-Channel Telemetry Oscilloscope */}
              <div className="h-[280px] shrink-0">
                <TelemetryGraph
                  samples={telemetry}
                  metrics={metrics}
                  isPaused={isPaused}
                  onTogglePause={() => setIsPaused((p) => !p)}
                  onClearHistory={() => {
                    telemetryHistoryRef.current = [];
                    setTelemetry([]);
                  }}
                  maxVoltage={motorParams.maxVoltage}
                />
              </div>
            </div>

            {/* Right Column (5 cols): Code Editor & Quick Parameter Tuner */}
            <div className="lg:col-span-5 flex flex-col gap-3 h-full min-h-0">
              {/* Polyglot Code Studio (Python / C++ / JS) */}
              <div className="flex-1 min-h-[300px]">
                <CodeEditor
                  language={language}
                  code={code}
                  onLanguageChange={handleLanguageChange}
                  onCodeChange={handleCodeChange}
                  onResetToPreset={handleResetToPreset}
                  diagnostic={runtimeRef.current.diagnostic}
                  isPaused={isPaused}
                  onTogglePause={() => setIsPaused((p) => !p)}
                />
              </div>

              {/* Interactive Tuner Deck & Environment */}
              <div className="h-[280px] shrink-0">
                <TuningSliders
                  gains={gains}
                  onGainsChange={handleGainsChange}
                  targetSignal={targetSignal}
                  targetValue={targetValue}
                  onTargetSignalChange={setTargetSignal}
                  onTargetValueChange={setTargetValue}
                  targetFrequency={targetFrequency}
                  onTargetFrequencyChange={setTargetFrequency}
                  onTriggerStep={triggerStepJump}
                  mechanism={mechanism}
                  onMechanismChange={(m) => setMechanism((cur) => ({ ...cur, ...m }))}
                  motorParams={motorParams}
                  onMotorParamsChange={(p) => setMotorParams((cur) => ({ ...cur, ...p }))}
                  constantDisturbance={constantDisturbance}
                  onConstantDisturbanceChange={setConstantDisturbance}
                />
              </div>
            </div>
          </>
        ) : (
          /* Visual Tuner View (Maximized 3D Motor & Full-Width Oscilloscope) */
          <>
            <div className="lg:col-span-8 flex flex-col gap-3 h-full min-h-0">
              <div className="flex-1 min-h-[300px]">
                <MotorCanvas3D
                  angle={liveMotorState.angle}
                  targetAngle={liveMotorState.targetAngle}
                  velocity={liveMotorState.velocity}
                  voltage={liveMotorState.voltage}
                  currentAmp={liveMotorState.currentAmp}
                  torque={liveMotorState.torque}
                  mechanism={mechanism.type}
                  impulseActive={impulseActive}
                  onApplyDisturbance={handleApplyDisturbance}
                  onSetTargetAngle={(a) => setTargetValue(a)}
                />
              </div>
              <div className="h-[320px] shrink-0">
                <TelemetryGraph
                  samples={telemetry}
                  metrics={metrics}
                  isPaused={isPaused}
                  onTogglePause={() => setIsPaused((p) => !p)}
                  onClearHistory={() => {
                    telemetryHistoryRef.current = [];
                    setTelemetry([]);
                  }}
                  maxVoltage={motorParams.maxVoltage}
                />
              </div>
            </div>
            <div className="lg:col-span-4 h-full min-h-0">
              <TuningSliders
                gains={gains}
                onGainsChange={handleGainsChange}
                targetSignal={targetSignal}
                targetValue={targetValue}
                onTargetSignalChange={setTargetSignal}
                onTargetValueChange={setTargetValue}
                targetFrequency={targetFrequency}
                onTargetFrequencyChange={setTargetFrequency}
                onTriggerStep={triggerStepJump}
                mechanism={mechanism}
                onMechanismChange={(m) => setMechanism((cur) => ({ ...cur, ...m }))}
                motorParams={motorParams}
                onMotorParamsChange={(p) => setMotorParams((cur) => ({ ...cur, ...p }))}
                constantDisturbance={constantDisturbance}
                onConstantDisturbanceChange={setConstantDisturbance}
              />
            </div>
          </>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 border border-slate-700/80 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono text-cyan-300 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          {toastMessage}
        </div>
      )}

      {/* Modals */}
      <PIDAcademyModal
        isOpen={isAcademyOpen}
        onClose={() => setIsAcademyOpen(false)}
        onApplyGains={(newGains, msg) => {
          handleGainsChange(newGains);
          showToast(msg);
        }}
      />

      <ChallengesModal
        isOpen={isChallengesOpen}
        onClose={() => setIsChallengesOpen(false)}
        onLoadChallenge={handleLoadChallenge}
        currentMetrics={metrics}
        activeChallengeId={activeChallengeId}
      />
    </div>
  );
}
