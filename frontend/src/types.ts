/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GloveData {
  flex: number[];
  acc: number[];
  gesture: string;
  confidence: number;
  status: 'connected' | 'disconnected' | 'connecting' | 'no_data';
  timestamp: number;
}

export interface HistoryItem {
  id: string;
  gesture: string;
  confidence: number;
  timestamp: number;
}

export interface AppSettings {
  accentColor: string;
  confidenceThreshold: number;
  speechRate: number;
  showRawFeed: boolean;
  showDiagnostics: boolean;
  uiDensity: 'compact' | 'standard';
  useCustomModel: boolean;
  apiUrl: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  accentColor: '#38bdf8', // Cyan
  confidenceThreshold: 0.5,
  speechRate: 1.0,
  showRawFeed: true,
  showDiagnostics: true,
  uiDensity: 'standard',
  useCustomModel: false,
  apiUrl: 'http://localhost:5001/predict',
};

export interface TrainingSample {
  id: string;
  label: string;
  flex: number[];
  acc: number[];
  timestamp: number;
}

export interface CustomGesture {
  name: string;
  sampleCount: number;
}

export const GESTURE_COLORS: Record<string, string> = {
  'high': '#10b981', // green-500
  'medium': '#f59e0b', // amber-500
  'low': '#ef4444', // red-500
};

export const DEFAULT_GLOVE_DATA: GloveData = {
  flex: [0, 0, 0, 0, 0],
  acc: [0, 0, 0],
  gesture: 'Waiting...',
  confidence: 0,
  status: 'connecting',
  timestamp: Date.now(),
};
