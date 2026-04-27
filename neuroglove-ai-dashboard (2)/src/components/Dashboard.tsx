/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Cpu, 
  History as HistoryIcon, 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  RotateCcw, 
  Settings, 
  Wifi, 
  WifiOff,
  Zap,
  TrendingUp,
  Box,
  Beaker
} from 'lucide-react';
import { useGloveData } from '../hooks/useGloveData';
import { useTraining } from '../hooks/useTraining';
import { speechService } from '../services/speechService';
import { GlassCard } from './GlassCard';
import { SensorChart } from './SensorChart';
import { SettingsModal } from './SettingsModal';
import { TrainingLab } from './TrainingLab';
import { HistoryItem, AppSettings, DEFAULT_SETTINGS } from '../types';

export default function Dashboard() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTrainingOpen, setIsTrainingOpen] = useState(false);

  const { 
    data: rawData, 
    isStreaming, 
    isDemoMode, 
    latency, 
    error, 
    startStreaming, 
    stopStreaming, 
    toggleDemoMode, 
    resetData 
  } = useGloveData(settings.apiUrl);

  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const { 
    samples, 
    addSample, 
    startBurstRecording,
    clearSamples, 
    removeSample, 
    predictCustom, 
    customGestures,
    isRecording,
    recordingProgress
  } = useTraining(rawData);

  const [isSaving, setIsSaving] = useState(false);

  // Computed data based on model selection
  const data = useMemo(() => {
    if (settings.useCustomModel) {
      const prediction = predictCustom(rawData);
      if (prediction) {
        return { ...rawData, gesture: prediction.gesture, confidence: prediction.confidence };
      }
      return { ...rawData, gesture: 'No Training Data', confidence: 0 };
    }
    return rawData;
  }, [settings.useCustomModel, rawData, predictCustom]);

  // Update speech service
  useEffect(() => {
    speechService.setEnabled(speechEnabled);
    speechService.setRate(settings.speechRate);
  }, [speechEnabled, settings.speechRate]);

  // Handle gesture changes
  useEffect(() => {
    if (data.gesture) {
      // Pass all gestures (including neutral/reset gestures) to the speech service
      speechService.speak(data.gesture);

      // Only record to history if it's a significant recognized gesture
      if (data.gesture !== 'Waiting...' && data.gesture !== 'No Training Data' && data.gesture !== 'open') {
        if (data.confidence >= settings.confidenceThreshold) {
          setHistory(prev => [
            {
              id: Math.random().toString(36).substr(2, 9),
              gesture: data.gesture,
              confidence: data.confidence,
              timestamp: Date.now()
            },
            ...prev.slice(0, 799)
          ]);
        }
      }
    }
  }, [data.gesture, settings.confidenceThreshold]);

  // Update chart data
  useEffect(() => {
    if (isStreaming) {
      setChartData(prev => [
        ...prev.slice(-799),
        {
          timestamp: data.timestamp,
          flex0: data.flex[0],
          flex1: data.flex[1],
          flex2: data.flex[2],
          flex3: data.flex[3],
          flex4: data.flex[4],
          accX: data.acc[0],
          accY: data.acc[1],
          accZ: data.acc[2],
        }
      ]);
    }
  }, [data.timestamp, isStreaming]);

  const confidenceColor = useMemo(() => {
    if (data.confidence > 0.8) return 'text-[var(--green)]';
    if (data.confidence > settings.confidenceThreshold) return 'text-amber-400';
    return 'text-rose-400';
  }, [data.confidence, settings.confidenceThreshold]);

  const statusColor = useMemo(() => {
    switch (data.status) {
      case 'connected': return 'bg-[var(--green)]';
      case 'connecting': return 'bg-amber-500';
      case 'disconnected':
      case 'no_data': return 'bg-rose-500';
      default: return 'bg-gray-500';
    }
  }, [data.status]);

  const handleSaveSamples = async (newSamples: any[]) => {
    if (newSamples.length === 0) return;
    setIsSaving(true);
    
    try {
      // 1. Save samples to CSV
      const saveResponse = await fetch(`${settings.apiUrl.replace('/predict', '/train')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples: newSamples })
      });
      
      if (!saveResponse.ok) throw new Error('Failed to save samples');
      
      // 2. Trigger Retraining
      const trainResponse = await fetch(`${settings.apiUrl.replace('/predict', '/retrain')}`, {
        method: 'POST'
      });
      
      if (!trainResponse.ok) throw new Error('Retraining failed');
      
      alert('✅ Model retrained successfully!');
      clearSamples();
      setIsTrainingOpen(false);
    } catch (err) {
      console.error(err);
      alert('❌ Error: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalibrate = async () => {
    try {
      const response = await fetch(`${settings.apiUrl.replace('/predict', '/recalibrate')}`, {
        method: 'POST'
      });
      if (response.ok) alert('🎯 Recalibration Triggered!');
    } catch (err) {
      console.error('Failed to recalibrate', err);
    }
  };

  return (
    <div 
      className="flex h-screen w-full flex-col overflow-hidden bg-[var(--bg)] font-sans text-[var(--text-main)]"
      style={{ 
        '--accent-cyan': settings.accentColor,
        '--accent-purple': settings.useCustomModel ? '#a855f7' : settings.accentColor 
      } as any}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--accent-cyan)_0%,transparent_50%)] opacity-10" />
        <div 
          className="h-full w-full opacity-30" 
          style={{ 
            backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '40px 40px' 
          }} 
        />
      </div>

      {/* Header */}
      <header className="flex h-[60px] items-center justify-between border-b border-[var(--border)] bg-black/80 px-6 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="relative flex h-6 w-6 items-center justify-center rounded border-2 border-[var(--accent-cyan)] after:h-2 after:w-2 after:rounded-full after:bg-[var(--accent-purple)]" />
          <div className="text-sm font-extrabold uppercase tracking-widest">
            NEXUS GLOVE <span className="ml-2 font-normal text-[var(--text-dim)]">PRO v2.0</span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 rounded-full border border-[var(--green)] bg-[var(--green)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--green)]">
            <div className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
            SYSTEM {data.status === 'connected' ? 'ONLINE' : data.status.toUpperCase()}
          </div>
          
          {settings.useCustomModel && (
            <div className="flex items-center gap-2 rounded-full border border-[var(--accent-purple)] bg-[var(--accent-purple)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--accent-purple)]">
              <Beaker size={12} />
              CUSTOM MODEL ACTIVE
            </div>
          )}

          <div className="font-mono text-xs text-[var(--text-dim)]">
            LATENCY: <span className="text-[var(--accent-cyan)]">{latency}ms</span>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-full p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="grid h-[calc(100vh-60px)] grid-cols-[260px_1fr_260px] grid-rows-[1fr_240px] gap-4 p-4">
        
        {/* Left Panel: Controls */}
        <div className="grid grid-rows-1 gap-4">
          <GlassCard title="System Controls">
            <div className="space-y-2">
              <button 
                onClick={isStreaming ? stopStreaming : startStreaming}
                className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-white/5 p-3 text-xs font-semibold tracking-widest transition-all hover:bg-[var(--accent-cyan)]/10 hover:border-[var(--accent-cyan)]"
              >
                {isStreaming ? 'STOP STREAMING' : 'START STREAMING'}
                <span className={isStreaming ? 'text-rose-500' : 'text-[var(--green)]'}>●</span>
              </button>
              
              <button 
                onClick={() => setIsTrainingOpen(true)}
                className="flex w-full items-center justify-between rounded-lg border border-[var(--accent-purple)]/30 bg-[var(--accent-purple)]/5 p-3 text-xs font-semibold tracking-widest text-[var(--accent-purple)] transition-all hover:bg-[var(--accent-purple)]/10 hover:border-[var(--accent-purple)]"
              >
                TRAINING LAB
                <Beaker size={14} />
              </button>
              
              <button 
                onClick={resetData}
                className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-white/5 p-3 text-xs font-semibold tracking-widest transition-all hover:bg-[var(--accent-cyan)]/10 hover:border-[var(--accent-cyan)]"
              >
                RESET EPOCH
              </button>

              <button 
                onClick={handleRecalibrate}
                className="flex w-full items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs font-semibold tracking-widest text-amber-500 transition-all hover:bg-amber-500/10 hover:border-amber-500"
              >
                RECALIBRATE
                <RotateCcw size={14} />
              </button>

              <div className="mt-5 flex items-center justify-between rounded-lg border border-[var(--accent-purple)] bg-[var(--accent-purple)]/10 p-3">
                <div>
                  <div className="text-xs font-bold uppercase">Voice Synth</div>
                  <div className="text-[9px] opacity-60">Speak recognized gestures</div>
                </div>
                <button 
                  onClick={() => setSpeechEnabled(!speechEnabled)}
                  className="relative h-5 w-9 rounded-full bg-[var(--accent-purple)] transition-all"
                >
                  <motion.div 
                    animate={{ x: speechEnabled ? 18 : 3 }}
                    className="absolute top-1 h-3 w-3 rounded-full bg-white"
                  />
                </button>
              </div>

              <div className="mt-5">
                <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--accent-cyan)] mb-2 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-[var(--accent-cyan)]" />
                  Power Level
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">88</span>
                  <span className="text-xs text-[var(--text-dim)]">%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <div className="h-full w-[88%] bg-[var(--accent-cyan)]" />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Center Panel: Digital Sensor Hub */}
        <div className="flex flex-col items-center justify-center text-center">
          <GlassCard className="flex h-full w-full flex-col items-center justify-center border-none bg-transparent backdrop-blur-none">
            <div className="relative flex h-[400px] w-full flex-col items-center justify-center">
              
              {/* Animated HUD Rings */}
              <div className="absolute flex h-64 w-64 items-center justify-center">
                <div className="absolute inset-0 animate-[spin_8s_linear_infinite] rounded-full border border-dashed border-[var(--accent-cyan)] opacity-20" />
                <div className="absolute inset-4 animate-[spin_12s_linear_infinite_reverse] rounded-full border border-[var(--accent-purple)] opacity-10" />
                
                {/* Finger Pulse Matrix */}
                <div className="flex gap-2">
                  {data.flex.map((f, i) => (
                    <motion.div 
                      key={i}
                      animate={{ 
                        height: 20 + (f * 0.8),
                        backgroundColor: f > 70 ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)' 
                      }}
                      className="w-4 rounded-full transition-colors"
                    />
                  ))}
                </div>
              </div>
              
              <div className="z-10 mt-auto mb-10 translate-y-16">
                <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--accent-cyan)] mb-4 opacity-50">PATTERN ANALYSIS ACTIVE</div>
                
                <motion.div
                  key={data.gesture}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="my-2 text-7xl font-black uppercase tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  {data.gesture === 'Waiting...' ? '---' : data.gesture}
                </motion.div>
                
                <div className="mt-4 flex items-center justify-center gap-4">
                  <div className="h-[2px] w-24 bg-gradient-to-r from-transparent to-white/10" />
                  <div className="font-mono text-[13px] font-bold text-[var(--green)]">
                    {(data.confidence * 100).toFixed(1)}% <span className="opacity-40">ACCURACY</span>
                  </div>
                  <div className="h-[2px] w-24 bg-gradient-to-l from-transparent to-white/10" />
                </div>
              </div>
            </div>

            <div className="mt-6 w-full max-w-md">
              <div className="flex h-10 items-end gap-1 px-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div 
                    key={i}
                    animate={{ height: `${20 + Math.random() * 80}%` }}
                    transition={{ repeat: Infinity, duration: 0.5 + Math.random(), ease: "easeInOut" }}
                    className="flex-1 rounded-t-sm bg-[var(--accent-cyan)] opacity-50"
                  />
                ))}
              </div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-widest text-[var(--text-dim)]">
                Neural Network Inference Threads Active
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Panel: History */}
        <div className="grid grid-rows-1 gap-4 overflow-hidden">
          <GlassCard title="Gesture History (800 Max)">
            <div className="flex flex-col gap-2 h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/10">
              {history.length === 0 ? (
                <div className="py-8 text-center font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
                  Link Standby
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-l-2 border-[var(--accent-cyan)] bg-white/5 p-2 text-xs">
                    <span className="font-bold">{item.gesture}</span>
                    <span className="font-mono text-[10px] text-[var(--text-dim)]">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* Bottom Grid: Stats */}
        <div className="col-span-3 grid grid-cols-4 gap-4">
          <GlassCard title="Flex Sensors (F1-F5)">
            <div className="grid grid-cols-1 gap-3">
              {data.flex.map((val, i) => (
                <div key={i}>
                  <div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-widest">
                    <span>Finger {i + 1}</span>
                    <span>{Math.round(val)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div className="h-full bg-[var(--accent-cyan)]" style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard title="Accelerometer (X-Y-Z)">
            <div className="grid grid-cols-3 gap-2">
              {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={axis} className="rounded-lg border border-white/5 bg-white/5 p-2 text-center">
                  <div className="text-[9px] font-bold text-[var(--text-dim)]">{axis}</div>
                  <div className="font-mono text-sm font-bold text-[var(--accent-purple)]">{data.acc[i]?.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 h-16">
              <SensorChart 
                data={chartData} 
                dataKey="accX" 
                color="var(--accent-purple)" 
                title="X-AXIS TREND"
                min={-10}
                max={10}
              />
            </div>
          </GlassCard>

          {settings.showDiagnostics ? (
            <GlassCard title="AI Diagnostics">
              <div className="space-y-2 text-xs font-medium">
                <div className="flex justify-between">
                  <span className="text-[var(--text-dim)]">MODEL ACCURACY</span>
                  <span className="text-[var(--accent-cyan)]">99.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-dim)]">SAMPLE RATE</span>
                  <span className="text-[var(--accent-cyan)]">120Hz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-dim)]">TEMP (IMU)</span>
                  <span className="text-[var(--accent-purple)]">32.4°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-dim)]">UPTIME</span>
                  <span className="text-[var(--accent-cyan)]">04:12:45</span>
                </div>
              </div>
            </GlassCard>
          ) : <div />}

          {settings.showRawFeed ? (
            <GlassCard title="Live Telemetry (800pts)">
              <div className="h-full -mt-4">
                <SensorChart 
                  data={chartData} 
                  dataKey="flex0" 
                  color="var(--accent-cyan)" 
                  title="SIGNAL STREAM"
                />
              </div>
            </GlassCard>
          ) : <div />}
        </div>
      </main>

      {/* Sentence Construction Bar */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-max min-w-[300px]"
          >
            <div className="rounded-full border border-white/10 bg-black/60 px-8 py-4 backdrop-blur-2xl shadow-2xl flex items-center gap-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-cyan)] opacity-50">SENTENCE</div>
              <div className="text-xl font-bold tracking-tight">
                {history.slice(0, 5).reverse().map((h, i) => (
                  <span key={h.id} className={i === 0 ? "text-white" : "text-white/40"}>
                    {h.gesture}{" "}
                  </span>
                ))}
              </div>
              <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--green)]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdate={setSettings}
      />

      {/* Training Lab Modal */}
      <TrainingLab 
        isOpen={isTrainingOpen}
        onClose={() => setIsTrainingOpen(false)}
        samples={samples}
        customGestures={customGestures}
        onAddSample={addSample}
        onStartBurst={startBurstRecording}
        onRemoveSample={removeSample}
        onClearAll={clearSamples}
        onSave={handleSaveSamples}
        isRecording={isRecording}
        recordingProgress={recordingProgress}
        isSaving={isSaving}
      />

      {/* Error Notification */}
      <AnimatePresence>
        {error && !isDemoMode && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full border border-rose-500/50 bg-rose-500/20 px-6 py-3 text-xs font-bold uppercase tracking-widest text-rose-400 backdrop-blur-xl shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <WifiOff size={16} />
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
