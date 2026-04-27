/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Beaker, Plus, Trash2, Save, Target, Info, Zap, RotateCcw } from 'lucide-react';
import { TrainingSample, CustomGesture } from '../types';

interface TrainingLabProps {
  isOpen: boolean;
  onClose: () => void;
  samples: TrainingSample[];
  customGestures: CustomGesture[];
  onAddSample: (label: string) => void;
  onStartBurst: (label: string, count: number) => void;
  onRemoveSample: (id: string) => void;
  onClearAll: () => void;
  onSave: (samples: TrainingSample[]) => void;
  isRecording: boolean;
  recordingProgress: number;
  isSaving?: boolean;
}

export function TrainingLab({ 
  isOpen, 
  onClose, 
  samples, 
  customGestures, 
  onAddSample, 
  onStartBurst,
  onRemoveSample, 
  onClearAll,
  onSave,
  isRecording,
  recordingProgress,
  isSaving = false
}: TrainingLabProps) {
  const [newLabel, setNewLabel] = useState('');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[#05070a] shadow-2xl"
        >
          {/* Recording Overlay */}
          <AnimatePresence>
            {isRecording && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl"
              >
                <div className="relative mb-8 h-32 w-32">
                  <svg className="h-full w-full" viewBox="0 0 100 100">
                    <circle className="stroke-white/5 fill-none" cx="50" cy="50" r="45" strokeWidth="2" />
                    <motion.circle 
                      className="stroke-[var(--accent-cyan)] fill-none" 
                      cx="50" cy="50" r="45" strokeWidth="2" 
                      strokeDasharray="283"
                      animate={{ strokeDashoffset: 283 - (283 * recordingProgress) / 100 }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-2xl font-bold text-white">
                    {Math.round(recordingProgress)}%
                  </div>
                </div>
                <h3 className="text-xl font-black uppercase tracking-[0.3em] text-white">Capturing Neural Data</h3>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--accent-cyan)]">Hold gesture steady for 800-point calibration</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--accent-purple)]/20 p-2 text-[var(--accent-purple)]">
                <Beaker size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-widest text-white">AI Training Lab</h2>
                <p className="text-[10px] font-medium uppercase tracking-widest text-white/40">Custom Gesture Neural Mapping</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-white/40 hover:bg-white/5 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar: Gesture Management */}
            <div className="w-72 border-r border-white/10 bg-white/2 p-6">
              <div className="mb-6">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">New Gesture Label</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. THUMBS_UP"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white outline-none focus:border-[var(--accent-cyan)]"
                  />
                  <button 
                    onClick={() => {
                      if (newLabel) {
                        onStartBurst(newLabel.toUpperCase(), 800);
                        setNewLabel('');
                      }
                    }}
                    className="rounded-lg bg-[var(--accent-purple)] p-2 text-white hover:brightness-110"
                    title="Record 800 Samples"
                  >
                    <Zap size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      if (newLabel) {
                        onAddSample(newLabel.toUpperCase());
                        setNewLabel('');
                      }
                    }}
                    className="rounded-lg bg-[var(--accent-cyan)] p-2 text-black hover:brightness-110"
                    title="Add Single Sample"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Active Gestures</span>
                  <span className="font-mono text-[10px] text-[var(--accent-cyan)]">{customGestures.length}</span>
                </div>
                <div className="space-y-2">
                  {customGestures.map(g => (
                    <div key={g.name} className="flex items-center justify-between rounded-lg bg-white/5 p-3 ring-1 ring-white/5">
                      <div>
                        <div className="text-xs font-bold text-white">{g.name}</div>
                        <div className="text-[9px] text-white/30">{g.sampleCount} Samples</div>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => onStartBurst(g.name, 800)}
                          className="rounded-md bg-[var(--accent-purple)]/20 p-1.5 text-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/30"
                          title="Record 800 Samples"
                        >
                          <Zap size={14} />
                        </button>
                        <button 
                          onClick={() => onAddSample(g.name)}
                          className="rounded-md bg-white/5 p-1.5 text-white/40 hover:bg-white/10 hover:text-[var(--accent-cyan)]"
                          title="Add Single Sample"
                        >
                          <Target size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={onClearAll}
                className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 py-3 text-[10px] font-bold uppercase tracking-widest text-rose-400 hover:bg-rose-500/20"
              >
                <Trash2 size={14} />
                Purge All Data
              </button>
            </div>

            {/* Main Content: Sample List */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/10">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Training Dataset</h3>
                <div className="flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-[9px] font-bold text-blue-400">
                  <Info size={12} />
                  Capture at least 800 samples per gesture for maximum neural precision
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <AnimatePresence>
                  {samples.map((sample) => (
                    <motion.div
                      key={sample.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="group relative rounded-xl border border-white/5 bg-white/2 p-4 transition-all hover:border-white/10 hover:bg-white/5"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="rounded bg-[var(--accent-cyan)]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--accent-cyan)]">
                          {sample.label}
                        </span>
                        <button 
                          onClick={() => onRemoveSample(sample.id)}
                          className="text-white/20 hover:text-rose-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-5 gap-1">
                        {sample.flex.map((f, i) => (
                          <div key={i} className="h-8 rounded bg-white/5 overflow-hidden">
                            <div className="h-full bg-[var(--accent-cyan)]/30" style={{ width: `${f}%` }} />
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-2 text-[8px] font-mono text-white/20">
                        ACC: [{sample.acc.map(a => a.toFixed(1)).join(', ')}]
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {samples.length === 0 && (
                <div className="flex h-64 flex-col items-center justify-center text-center opacity-20">
                  <Beaker size={48} className="mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Dataset Empty</p>
                  <p className="text-[10px]">Start capturing samples to build your custom model</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-medium uppercase tracking-widest text-white/40">
                Total Samples: <span className="text-white">{samples.length}</span>
              </div>
              <button 
                onClick={() => onSave(samples)}
                disabled={isSaving || samples.length === 0}
                className={`flex items-center gap-2 rounded-xl px-8 py-3 text-xs font-bold uppercase tracking-widest text-black transition-all ${
                  isSaving || samples.length === 0 
                  ? 'bg-white/10 text-white/40 cursor-not-allowed' 
                  : 'bg-[var(--accent-cyan)] hover:brightness-110'
                }`}
              >
                {isSaving ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <RotateCcw size={16} />
                    </motion.div>
                    Optimizing Model...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save & Deploy Model
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
