import React, { useState } from 'react';
import { LanguageType } from '../types/simulation';
import { CODE_PRESETS, CodePreset } from '../simulation/codeTemplates';
import { RuntimeDiagnostic } from '../simulation/controllerRuntime';

interface CodeEditorProps {
  language: LanguageType;
  code: string;
  onLanguageChange: (lang: LanguageType) => void;
  onCodeChange: (newCode: string) => void;
  onResetToPreset: (presetId: string) => void;
  diagnostic: RuntimeDiagnostic;
  isPaused: boolean;
  onTogglePause: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  code,
  onLanguageChange,
  onCodeChange,
  onResetToPreset,
  diagnostic,
  isPaused,
  onTogglePause,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('classic_pid');

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    onResetToPreset(presetId);
  };

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 15) }, (_, i) => i + 1);

  return (
    <div className="flex flex-col bg-slate-900 rounded-xl border border-slate-800 p-3 h-full">
      {/* Editor Top Bar: Language & Preset Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800 text-xs">
        {/* Language Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onLanguageChange('python')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              language === 'python'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Python
          </button>
          <button
            onClick={() => onLanguageChange('cpp')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              language === 'cpp'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            C++ (Arduino)
          </button>
          <button
            onClick={() => onLanguageChange('javascript')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              language === 'javascript'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            JavaScript
          </button>
        </div>

        {/* Algorithm Preset Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-slate-400 text-xs">Preset:</label>
          <select
            value={selectedPresetId}
            onChange={(e) => handlePresetSelect(e.target.value)}
            className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500"
          >
            {CODE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => handlePresetSelect(selectedPresetId)}
            className="px-2.5 py-1 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded text-xs transition-colors"
            title="Reset code to initial preset template"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Compiler Diagnostic Error Alert if invalid */}
      {!diagnostic.isValid && (
        <div className="mt-2 p-2.5 bg-rose-950/80 border border-rose-700/60 rounded-lg text-rose-300 text-xs font-mono flex items-start gap-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="flex-1 overflow-x-auto">
            <span className="font-semibold">Compiler / Runtime Notice:</span> {diagnostic.errorMessage}
          </div>
        </div>
      )}

      {/* Code Textarea with Line Numbers */}
      <div className="relative flex-1 mt-2 flex rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950">
        {/* Line Numbers column */}
        <div className="w-10 py-3 bg-slate-950/90 text-right pr-2 select-none border-r border-slate-800/80 text-[11px] font-mono text-slate-600">
          {lineNumbers.map((n) => (
            <div key={n} className="leading-5 h-5">
              {n}
            </div>
          ))}
        </div>

        {/* Code Input */}
        <textarea
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          spellCheck={false}
          className="flex-1 p-3 bg-transparent text-slate-100 font-mono text-xs leading-5 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50 overflow-auto whitespace-pre tab-4"
          placeholder="Enter controller update loop code here..."
        />
      </div>

      {/* Editor Footer: Hotkeys & State Note */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
        <div>
          Loop: <span className="text-cyan-400">update(target, current, dt, state)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Auto-evaluates on edit</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400 font-medium">60 Hz Loop</span>
        </div>
      </div>
    </div>
  );
};
