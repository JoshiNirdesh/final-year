/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useMemo } from 'react';
import { GloveData, TrainingSample } from '../types';

export function useTraining(currentData: GloveData) {
  const [samples, setSamples] = useState<TrainingSample[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);

  const addSample = useCallback((label: string) => {
    const newSample: TrainingSample = {
      id: Math.random().toString(36).substr(2, 9),
      label,
      flex: [...currentData.flex],
      acc: [...currentData.acc],
      timestamp: Date.now(),
    };
    setSamples(prev => [...prev, newSample]);
  }, [currentData]);

  const startBurstRecording = useCallback(async (label: string, count: number = 100) => {
    setIsRecording(true);
    setRecordingProgress(0);
    
    const newSamples: TrainingSample[] = [];
    
    for (let i = 0; i < count; i++) {
      newSamples.push({
        id: Math.random().toString(36).substr(2, 9),
        label,
        flex: [...currentData.flex],
        acc: [...currentData.acc],
        timestamp: Date.now(),
      });
      setRecordingProgress(((i + 1) / count) * 100);
      // Small delay to capture variation
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    
    setSamples(prev => [...prev, ...newSamples]);
    setIsRecording(false);
    setRecordingProgress(0);
  }, [currentData]);

  const clearSamples = useCallback(() => {
    setSamples([]);
  }, []);

  const removeSample = useCallback((id: string) => {
    setSamples(prev => prev.filter(s => s.id !== id));
  }, []);

  // Simple KNN Classifier (K=3)
  const predictCustom = useCallback((input: GloveData): { gesture: string; confidence: number } | null => {
    if (samples.length < 3) return null;

    const distances = samples.map(sample => {
      // Euclidean distance for flex sensors
      const flexDist = Math.sqrt(
        sample.flex.reduce((sum, val, i) => sum + Math.pow(val - input.flex[i], 2), 0)
      );
      // Euclidean distance for accelerometer
      const accDist = Math.sqrt(
        sample.acc.reduce((sum, val, i) => sum + Math.pow(val - input.acc[i], 2), 0)
      );
      
      // Weighted distance (flex is usually more important for static gestures)
      return { label: sample.label, dist: flexDist + accDist * 10 };
    });

    // Sort by distance
    distances.sort((a, b) => a.dist - b.dist);

    // Take top 3
    const topK = distances.slice(0, 3);
    
    // Count occurrences
    const counts: Record<string, number> = {};
    topK.forEach(k => {
      counts[k.label] = (counts[k.label] || 0) + 1;
    });

    // Find winner
    let winner = '';
    let maxCount = 0;
    for (const label in counts) {
      if (counts[label] > maxCount) {
        maxCount = counts[label];
        winner = label;
      }
    }

    // Simple confidence based on distance of the winner
    const avgDist = topK.filter(k => k.label === winner).reduce((sum, k) => sum + k.dist, 0) / maxCount;
    const confidence = Math.max(0, Math.min(1, 1 - avgDist / 100));

    return { gesture: winner, confidence };
  }, [samples]);

  const customGestures = useMemo(() => {
    const counts: Record<string, number> = {};
    samples.forEach(s => {
      counts[s.label] = (counts[s.label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, sampleCount: count }));
  }, [samples]);

  return {
    samples,
    addSample,
    startBurstRecording,
    clearSamples,
    removeSample,
    predictCustom,
    customGestures,
    isRecording,
    recordingProgress
  };
}
