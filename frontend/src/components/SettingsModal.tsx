/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { X, Palette, Sliders, Volume2, Layout, Check, Target, Wifi } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
}

const ACCENT_COLORS = [
  { name: 'Cyan', value: '#38bdf8' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
];

export function SettingsModal({ isOpen, onClose, settings, onUpdate }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-2xl"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold uppercase tracking-widest text-white">
              <Sliders size={20} className="text-[var(--accent-cyan)]" />
              System Customization
            </h2>
            <button 
              onClick={onClose}
              className="rounded-full p-2 text-white/40 hover:bg-white/5 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-8">
            {/* Accent Color */}
            <section>
              <label className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
                <Palette size={12} />
                Accent Interface Color
              </label>
              <div className="flex flex-wrap gap-3">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => onUpdate({ ...settings, accentColor: color.value })}
                    className="group relative flex h-10 w-10 items-center justify-center rounded-full transition-all"
                    style={{ backgroundColor: `${color.value}20`, border: `1px solid ${color.value}40` }}
                  >
                    <div 
                      className="h-6 w-6 rounded-full shadow-lg"
                      style={{ backgroundColor: color.value }}
                    />
                    {settings.accentColor === color.value && (
                      <motion.div 
                        layoutId="activeColor"
                        className="absolute -inset-1 rounded-full border-2 border-white/20"
                      />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Confidence Threshold */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
                  <Check size={12} />
                  Confidence Threshold
                </label>
                <span className="font-mono text-xs text-[var(--accent-cyan)]">{Math.round(settings.confidenceThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.confidenceThreshold}
                onChange={(e) => onUpdate({ ...settings, confidenceThreshold: parseFloat(e.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/5 accent-[var(--accent-cyan)]"
              />
              <div className="mt-2 flex justify-between text-[8px] uppercase tracking-widest text-white/20">
                <span>Sensitive</span>
                <span>Strict</span>
              </div>
            </section>

            {/* Speech Rate */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
                  <Volume2 size={12} />
                  Speech Synthesis Rate
                </label>
                <span className="font-mono text-xs text-[var(--accent-cyan)]">{settings.speechRate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.speechRate}
                onChange={(e) => onUpdate({ ...settings, speechRate: parseFloat(e.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/5 accent-[var(--accent-cyan)]"
              />
            </section>

            {/* Layout Toggles */}
            <section>
              <label className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
                <Layout size={12} />
                Interface Modules
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onUpdate({ ...settings, showDiagnostics: !settings.showDiagnostics })}
                  className={`flex items-center justify-between rounded-lg border p-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    settings.showDiagnostics 
                    ? 'border-[var(--accent-cyan)]/50 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]' 
                    : 'border-white/5 bg-white/5 text-white/40'
                  }`}
                >
                  Diagnostics
                  <div className={`h-1.5 w-1.5 rounded-full ${settings.showDiagnostics ? 'bg-[var(--accent-cyan)]' : 'bg-white/20'}`} />
                </button>
                <button
                  onClick={() => onUpdate({ ...settings, showRawFeed: !settings.showRawFeed })}
                  className={`flex items-center justify-between rounded-lg border p-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    settings.showRawFeed 
                    ? 'border-[var(--accent-cyan)]/50 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]' 
                    : 'border-white/5 bg-white/5 text-white/40'
                  }`}
                >
                  Raw Feed
                  <div className={`h-1.5 w-1.5 rounded-full ${settings.showRawFeed ? 'bg-[var(--accent-cyan)]' : 'bg-white/20'}`} />
                </button>
              </div>
            </section>

            {/* Model Selection */}
            <section>
              <label className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
                <Target size={12} />
                Inference Engine
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => onUpdate({ ...settings, useCustomModel: false })}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    !settings.useCustomModel 
                    ? 'border-[var(--accent-cyan)]/50 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]' 
                    : 'border-white/5 bg-white/5 text-white/40'
                  }`}
                >
                  System Model (Cloud API)
                  <div className={`h-1.5 w-1.5 rounded-full ${!settings.useCustomModel ? 'bg-[var(--accent-cyan)]' : 'bg-white/20'}`} />
                </button>
                <button
                  onClick={() => onUpdate({ ...settings, useCustomModel: true })}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    settings.useCustomModel 
                    ? 'border-[var(--accent-purple)]/50 bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]' 
                    : 'border-white/5 bg-white/5 text-white/40'
                  }`}
                >
                  Custom Model (Local Training)
                  <div className={`h-1.5 w-1.5 rounded-full ${settings.useCustomModel ? 'bg-[var(--accent-purple)]' : 'bg-white/20'}`} />
                </button>
              </div>
            </section>

            {/* Backend Configuration */}
            <section>
              <label className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
                <Wifi size={12} />
                Backend Configuration
              </label>
              <div className="space-y-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">Endpoint URL</span>
                  <input 
                    type="text"
                    value={settings.apiUrl}
                    onChange={(e) => onUpdate({ ...settings, apiUrl: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[10px] text-white outline-none focus:border-[var(--accent-cyan)]"
                    placeholder="http://localhost:5001/predict"
                  />
                </div>
              </div>
            </section>
          </div>

          <button
            onClick={onClose}
            className="mt-8 w-full rounded-xl bg-[var(--accent-cyan)] py-3 text-xs font-bold uppercase tracking-widest text-black transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Apply Configuration
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
