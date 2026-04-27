/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { GloveData, DEFAULT_GLOVE_DATA } from '../types';

const FETCH_INTERVAL = 500;

export function useGloveData(apiUrl: string) {
  const [data, setData] = useState<GloveData>(DEFAULT_GLOVE_DATA);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [latency, setLatency] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateDemoData = useCallback((): GloveData => {
    const gestures = ['Open Palm', 'Fist', 'Peace', 'Thumbs Up', 'Point', 'OK Sign'];
    const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
    
    return {
      flex: Array.from({ length: 5 }, () => Math.random() * 100),
      acc: Array.from({ length: 3 }, () => (Math.random() - 0.5) * 2),
      gesture: randomGesture,
      confidence: 0.7 + Math.random() * 0.3,
      status: 'connected',
      timestamp: Date.now(),
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (isDemoMode) {
      setData(generateDemoData());
      setLatency(Math.floor(Math.random() * 20) + 5);
      setError(null);
      return;
    }

    const start = performance.now();
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('API unreachable');
      
      const json = await response.json();
      const end = performance.now();
      
      setLatency(Math.round(end - start));
      setData({
        ...json,
        timestamp: Date.now(),
      });
      setError(null);
    } catch (err) {
      setError('Failed to connect to sensor API');
      setData(prev => ({ ...prev, status: 'disconnected' }));
    }
  }, [isDemoMode, generateDemoData]);

  useEffect(() => {
    if (isStreaming) {
      timerRef.current = setInterval(fetchData, FETCH_INTERVAL);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStreaming, fetchData]);

  const startStreaming = () => setIsStreaming(true);
  const stopStreaming = () => setIsStreaming(false);
  const toggleDemoMode = () => setIsDemoMode(prev => !prev);
  const resetData = () => setData(DEFAULT_GLOVE_DATA);

  return {
    data,
    isStreaming,
    isDemoMode,
    latency,
    error,
    startStreaming,
    stopStreaming,
    toggleDemoMode,
    resetData,
  };
}
