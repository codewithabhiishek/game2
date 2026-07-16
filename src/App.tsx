/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import { LEVELS } from './levels';
import { Layers, HelpCircle, Volume2, VolumeX, ChevronRight, Compass, ShieldAlert, Award, Clock, ArrowRight } from 'lucide-react';
import { audioEngine } from './audio';

export default function App() {
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);

  const activeLevel = LEVELS[currentLevelIndex];

  const handleLevelComplete = () => {
    if (!completedLevels.includes(activeLevel.id)) {
      setCompletedLevels([...completedLevels, activeLevel.id]);
    }
    // Auto advance to next level if available after 2 seconds
    setTimeout(() => {
      if (currentLevelIndex < LEVELS.length - 1) {
        setCurrentLevelIndex(currentLevelIndex + 1);
      }
    }, 2500);
  };

  const handleToggleMute = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleSelectLevel = (index: number) => {
    setCurrentLevelIndex(index);
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-200 font-sans flex flex-col selection:bg-cyan-500/30 selection:text-white">
      {/* Cinematic Top Header Bar */}
      <header className="border-b border-slate-900/80 bg-[#090b10]/95 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/30 shadow-md text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-sans tracking-widest text-white uppercase">TIME ECHO</h1>
            <p className="text-[10px] font-mono text-cyan-400/80 tracking-wide uppercase">TEMPORAL LOOP PARADOX SOLVER</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono text-slate-400">
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>CHRONO COGNITION ENGINE ONLINE</span>
          </div>
          <button
            onClick={handleToggleMute}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-950 border border-slate-900 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isMuted ? 'UNMUTE SYNTH' : 'MUTE SYNTH'}</span>
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-grow flex flex-col lg:flex-row h-[calc(100vh-69px)] w-full overflow-hidden">
        
        {/* Left Hand Controller / Level Selector Sidebar */}
        <section className="w-full lg:w-[320px] bg-[#090a0f] border-b lg:border-b-0 lg:border-r border-slate-900/90 flex flex-col shrink-0 select-none overflow-y-auto">
          {/* Level Tracker Section Header */}
          <div className="p-5 border-b border-slate-900/80">
            <h2 className="text-xs font-mono font-bold text-slate-400 tracking-wider uppercase mb-1">LOOP PERIODS</h2>
            <p className="text-[11px] text-slate-500">Jump between epochs to calibrate physical echoes.</p>
          </div>

          {/* Level List */}
          <div className="p-3 flex-grow space-y-1.5">
            {LEVELS.map((level, idx) => {
              const isActive = currentLevelIndex === idx;
              const isCompleted = completedLevels.includes(level.id);

              return (
                <button
                  key={level.id}
                  onClick={() => handleSelectLevel(idx)}
                  className={`w-full p-3 rounded-lg flex items-center justify-between text-left transition-all duration-150 group border cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-white shadow-md shadow-cyan-500/5'
                      : 'bg-transparent border-transparent hover:bg-slate-900/50 hover:border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-bold border transition-colors ${
                      isActive
                        ? 'bg-cyan-400 border-cyan-500 text-slate-950 shadow shadow-cyan-400/30'
                        : isCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}>
                      {level.id}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold tracking-tight leading-none mb-0.5">{level.name}</span>
                      <span className="text-[9px] font-mono text-slate-500 tracking-tight">
                        {idx === 0 ? 'Basic Steps' : idx === 4 ? 'Physics Block' : idx === 9 ? 'Final Paradox' : 'Mechanism Puzzle'}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${
                    isActive ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                  }`} />
                </button>
              );
            })}
          </div>

          {/* Mechanical Codex Key */}
          <div className="p-5 border-t border-slate-900/80 bg-slate-950/40 text-xs text-slate-500">
            <h3 className="font-mono text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">DYNAMIC ELEMENTS</h3>
            <div className="space-y-2 font-mono text-[10px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-cyan-400 shadow shadow-cyan-400/40" />
                <span>Pressure Plate (Momentary)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-rose-500 shadow shadow-rose-500/40" />
                <span>Laser Beam (Lethal Energy)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-amber-400 shadow shadow-amber-400/40" />
                <span>Crystal Keys & Barriers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
                <span>Moving Elevator Rails</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Hand Game Workspace */}
        <section className="flex-grow p-4 lg:p-6 flex flex-col bg-[#050608] overflow-hidden relative">
          <div className="flex-grow w-full h-full">
            <GameCanvas
              currentLevelIndex={currentLevelIndex}
              onLevelComplete={handleLevelComplete}
              onSelectLevel={handleSelectLevel}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
