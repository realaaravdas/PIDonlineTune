import React from 'react';

interface HeaderProps {
  onOpenAcademy: () => void;
  onOpenChallenges: () => void;
  onResetSystem: () => void;
  onTriggerStep: () => void;
  activeView: 'studio' | 'tuner' | 'compare';
  setActiveView: (view: 'studio' | 'tuner' | 'compare') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAcademy,
  onOpenChallenges,
  onResetSystem,
  onTriggerStep,
  activeView,
  setActiveView,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950 shrink-0">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          RoboPID 3D
        </span>
      </div>

      {/* Zone 2: Clean text navigation links / view switchers */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          onClick={() => setActiveView('studio')}
          className={`transition-colors hover:text-white ${
            activeView === 'studio' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Studio View
        </button>
        <button
          onClick={() => setActiveView('tuner')}
          className={`transition-colors hover:text-white ${
            activeView === 'tuner' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Visual Tuner
        </button>
        <button
          onClick={onOpenAcademy}
          className="transition-colors hover:text-white"
        >
          PID Academy
        </button>
        <button
          onClick={onOpenChallenges}
          className="transition-colors hover:text-white"
        >
          Robotics Challenges
        </button>
      </nav>

      {/* Zone 3: 1-2 Primary actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onResetSystem}
          className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          title="Reset motor angle and velocity to zero"
        >
          Reset Motor
        </button>
        <button
          onClick={onTriggerStep}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition-all active:scale-95 whitespace-nowrap"
        >
          Trigger Step Jump
        </button>
      </div>
    </header>
  );
};
