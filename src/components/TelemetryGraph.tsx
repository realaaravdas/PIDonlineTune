import React, { useRef, useEffect, useState } from 'react';
import { TelemetrySample, PerformanceMetrics } from '../types/simulation';

interface TelemetryGraphProps {
  samples: TelemetrySample[];
  metrics: PerformanceMetrics;
  isPaused: boolean;
  onTogglePause: () => void;
  onClearHistory: () => void;
  maxVoltage: number;
}

export const TelemetryGraph: React.FC<TelemetryGraphProps> = ({
  samples,
  metrics,
  isPaused,
  onTogglePause,
  onClearHistory,
  maxVoltage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [timeWindowSec, setTimeWindowSec] = useState<number>(5.0);
  const [selectedChannels, setSelectedChannels] = useState<{
    target: boolean;
    actual: boolean;
    error: boolean;
    pTerm: boolean;
    iTerm: boolean;
    dTerm: boolean;
    voltage: boolean;
  }>({
    target: true,
    actual: true,
    error: false,
    pTerm: true,
    iTerm: true,
    dTerm: true,
    voltage: false,
  });

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Render high-performance oscilloscope canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Dark oscilloscope background
    ctx.fillStyle = '#090d16'; // Deep obsidian
    ctx.fillRect(0, 0, width, height);

    if (samples.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for motor telemetry data...', width / 2, height / 2);
      return;
    }

    const latestTime = samples[samples.length - 1].time;
    const startTime = Math.max(0, latestTime - timeWindowSec);

    // Filter samples in view window
    const visibleSamples = samples.filter((s) => s.time >= startTime - 0.2);
    if (visibleSamples.length < 2) return;

    // Find min and max for auto-scaling
    let minY = -1.5;
    let maxY = 1.5;

    for (const s of visibleSamples) {
      if (selectedChannels.target) {
        minY = Math.min(minY, s.target);
        maxY = Math.max(maxY, s.target);
      }
      if (selectedChannels.actual) {
        minY = Math.min(minY, s.current);
        maxY = Math.max(maxY, s.current);
      }
      if (selectedChannels.pTerm) {
        minY = Math.min(minY, s.pTerm / 10);
        maxY = Math.max(maxY, s.pTerm / 10);
      }
      if (selectedChannels.iTerm) {
        minY = Math.min(minY, s.iTerm / 10);
        maxY = Math.max(maxY, s.iTerm / 10);
      }
      if (selectedChannels.dTerm) {
        minY = Math.min(minY, s.dTerm / 10);
        maxY = Math.max(maxY, s.dTerm / 10);
      }
      if (selectedChannels.voltage) {
        minY = Math.min(minY, s.voltage / 8);
        maxY = Math.max(maxY, s.voltage / 8);
      }
    }

    // Add 15% headroom
    const rangeY = Math.max(0.5, maxY - minY);
    const paddedMinY = minY - rangeY * 0.15;
    const paddedMaxY = maxY + rangeY * 0.15;

    const timeToX = (t: number) => {
      return ((t - startTime) / timeWindowSec) * width;
    };

    const valToY = (v: number) => {
      return height - ((v - paddedMinY) / (paddedMaxY - paddedMinY)) * height;
    };

    // Draw Grid Lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e293b';

    // Horizontal grid
    const numYDivs = 6;
    for (let i = 0; i <= numYDivs; i++) {
      const yVal = paddedMinY + (i / numYDivs) * (paddedMaxY - paddedMinY);
      const yPos = valToY(yVal);
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(width, yPos);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#475569';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(yVal.toFixed(2), 6, yPos - 3);
    }

    // Zero-line
    const zeroY = valToY(0);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();

    // Vertical time grid (every 1 second)
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e293b';
    const firstSec = Math.ceil(startTime);
    for (let t = firstSec; t <= latestTime; t += 1.0) {
      const xPos = timeToX(t);
      if (xPos >= 0 && xPos <= width) {
        ctx.beginPath();
        ctx.moveTo(xPos, 0);
        ctx.lineTo(xPos, height);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${t.toFixed(0)}s`, xPos, height - 6);
      }
    }

    // Helper to draw a curve channel
    const drawChannel = (
      accessor: (s: TelemetrySample) => number,
      color: string,
      lineWidth: number = 2,
      isDashed: boolean = false
    ) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (isDashed) ctx.setLineDash([6, 4]);

      ctx.beginPath();
      let started = false;
      for (const s of visibleSamples) {
        const x = timeToX(s.time);
        const y = valToY(accessor(s));
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    // 1. Target Setpoint (dashed Emerald green)
    if (selectedChannels.target) {
      drawChannel((s) => s.target, '#10b981', 2, true);
    }

    // 2. PID Terms (Scaled for direct comparison)
    // P-term (Amber / Gold)
    if (selectedChannels.pTerm) {
      drawChannel((s) => s.pTerm / 10, '#f59e0b', 1.5);
    }
    // I-term (Purple)
    if (selectedChannels.iTerm) {
      drawChannel((s) => s.iTerm / 10, '#a855f7', 1.5);
    }
    // D-term (Rose / Pink)
    if (selectedChannels.dTerm) {
      drawChannel((s) => s.dTerm / 10, '#ec4899', 1.5);
    }

    // 3. Error (Red line)
    if (selectedChannels.error) {
      drawChannel((s) => s.error, '#ef4444', 1.5);
    }

    // 4. Voltage Output (Sky blue)
    if (selectedChannels.voltage) {
      drawChannel((s) => s.voltage / 8, '#38bdf8', 1.5);
    }

    // 5. Actual Shaft Position / Velocity (Crisp Cyan Solid)
    if (selectedChannels.actual) {
      drawChannel((s) => s.current, '#06b6d4', 2.5);
    }

    // Hover Inspection Cursor
    if (hoverIndex !== null && samples[hoverIndex]) {
      const hSample = samples[hoverIndex];
      const hX = timeToX(hSample.time);
      if (hX >= 0 && hX <= width) {
        ctx.strokeStyle = '#ffffff';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hX, 0);
        ctx.lineTo(hX, height);
        ctx.stroke();

        // Target point
        const tY = valToY(hSample.target);
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(hX, tY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Actual point
        const aY = valToY(hSample.current);
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(hX, aY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [samples, timeWindowSec, selectedChannels, hoverIndex]);

  // Handle canvas mouse move for interactive scrub / hover inspection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || samples.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    const latestTime = samples[samples.length - 1].time;
    const startTime = Math.max(0, latestTime - timeWindowSec);
    const targetHoverTime = startTime + (x / width) * timeWindowSec;

    // Find nearest sample
    let bestIdx = samples.length - 1;
    let minDiff = Infinity;
    for (let i = samples.length - 1; i >= 0; i--) {
      const diff = Math.abs(samples[i].time - targetHoverTime);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
      if (samples[i].time < startTime - 1) break;
    }
    setHoverIndex(bestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Determine system damping quality classification
  const getDampingStatus = () => {
    if (metrics.overshootPercent > 40) {
      return { text: 'Underdamped (Heavy Ringing)', color: 'text-rose-400' };
    }
    if (metrics.overshootPercent > 12) {
      return { text: 'Underdamped (Moderate Overshoot)', color: 'text-amber-400' };
    }
    if (metrics.overshootPercent <= 5 && metrics.steadyStateError < 0.05) {
      return { text: 'Near Optimal / Fast Settling', color: 'text-emerald-400' };
    }
    if (metrics.steadyStateError > 0.15) {
      return { text: 'Steady-State Droop (Needs Integral)', color: 'text-amber-300' };
    }
    return { text: 'Overdamped (Sluggish)', color: 'text-sky-400' };
  };

  const dampingStatus = getDampingStatus();
  const hoveredSample = hoverIndex !== null ? samples[hoverIndex] : null;

  return (
    <div className="flex flex-col bg-slate-900 rounded-xl border border-slate-800 p-3 h-full">
      {/* Oscilloscope Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800 text-xs">
        {/* Channel Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedChannels((c) => ({ ...c, target: !c.target }))}
            className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
              selectedChannels.target
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            ● Target (r)
          </button>
          <button
            onClick={() => setSelectedChannels((c) => ({ ...c, actual: !c.actual }))}
            className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
              selectedChannels.actual
                ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-700/60'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            ● Actual (y)
          </button>
          <button
            onClick={() => setSelectedChannels((c) => ({ ...c, pTerm: !c.pTerm }))}
            className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
              selectedChannels.pTerm
                ? 'bg-amber-950/80 text-amber-400 border border-amber-700/60'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            P-Term
          </button>
          <button
            onClick={() => setSelectedChannels((c) => ({ ...c, iTerm: !c.iTerm }))}
            className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
              selectedChannels.iTerm
                ? 'bg-purple-950/80 text-purple-400 border border-purple-700/60'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            I-Term
          </button>
          <button
            onClick={() => setSelectedChannels((c) => ({ ...c, dTerm: !c.dTerm }))}
            className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
              selectedChannels.dTerm
                ? 'bg-pink-950/80 text-pink-400 border border-pink-700/60'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            D-Term
          </button>
          <button
            onClick={() => setSelectedChannels((c) => ({ ...c, voltage: !c.voltage }))}
            className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
              selectedChannels.voltage
                ? 'bg-sky-950/80 text-sky-400 border border-sky-700/60'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            V-Out
          </button>
        </div>

        {/* Timebase and Actions */}
        <div className="flex items-center gap-2">
          {/* Timebase buttons */}
          <div className="flex items-center bg-slate-950 rounded p-0.5 border border-slate-800 text-[11px] font-mono">
            {[2.5, 5.0, 10.0].map((t) => (
              <button
                key={t}
                onClick={() => setTimeWindowSec(t)}
                className={`px-2 py-0.5 rounded ${
                  timeWindowSec === t ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}s
              </button>
            ))}
          </div>

          {/* Pause / Run */}
          <button
            onClick={onTogglePause}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
              isPaused
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>

          {/* Clear */}
          <button
            onClick={onClearHistory}
            className="px-2 py-1 text-slate-400 hover:text-slate-200 text-xs transition-colors"
            title="Clear oscilloscope history"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 min-h-[190px] w-full mt-2 rounded-lg overflow-hidden border border-slate-800/80">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Cursor Inspection Tooltip */}
        {hoveredSample && (
          <div className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-md p-2 text-[11px] font-mono shadow-xl pointer-events-none">
            <div className="text-slate-400 mb-1 border-b border-slate-800 pb-0.5">
              t = {hoveredSample.time.toFixed(2)}s
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span className="text-emerald-400">Target:</span>
              <span className="text-white text-right tabular-nums">{hoveredSample.target.toFixed(3)}</span>
              <span className="text-cyan-400">Actual:</span>
              <span className="text-white text-right tabular-nums">{hoveredSample.current.toFixed(3)}</span>
              <span className="text-amber-400">P-Term:</span>
              <span className="text-white text-right tabular-nums">{hoveredSample.pTerm.toFixed(2)}</span>
              <span className="text-purple-400">I-Term:</span>
              <span className="text-white text-right tabular-nums">{hoveredSample.iTerm.toFixed(2)}</span>
              <span className="text-pink-400">D-Term:</span>
              <span className="text-white text-right tabular-nums">{hoveredSample.dTerm.toFixed(2)}</span>
              <span className="text-sky-400">Voltage:</span>
              <span className="text-white text-right tabular-nums">{hoveredSample.voltage.toFixed(2)}V</span>
            </div>
          </div>
        )}
      </div>

      {/* Control Performance Benchmark Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Overshoot (Mp)</span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              metrics.overshootPercent < 5 ? 'text-emerald-400' : metrics.overshootPercent < 20 ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {metrics.overshootPercent.toFixed(1)}%
          </span>
        </div>

        <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Rise Time (tr)</span>
          <span className="text-sm font-semibold text-slate-200 tabular-nums">
            {metrics.riseTime !== null ? `${metrics.riseTime.toFixed(2)}s` : '--'}
          </span>
        </div>

        <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Settling Time (ts)</span>
          <span className="text-sm font-semibold text-slate-200 tabular-nums">
            {metrics.settlingTime !== null ? `${metrics.settlingTime.toFixed(2)}s` : '> window'}
          </span>
        </div>

        <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Steady Error (ess)</span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              metrics.steadyStateError < 0.05 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {metrics.steadyStateError.toFixed(3)} rad
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-950/60 p-2 rounded border border-slate-800 flex flex-col justify-center">
          <span className="text-slate-400 block text-[10px]">Response Regime</span>
          <span className={`text-[11px] font-semibold truncate ${dampingStatus.color}`}>
            {dampingStatus.text}
          </span>
        </div>
      </div>
    </div>
  );
};
