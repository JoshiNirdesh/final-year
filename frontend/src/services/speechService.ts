/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SpeechService {
  private enabled: boolean = false;
  private lastSpoken: string = '';
  private lastSpokenTime: number = 0;
  private rate: number = 1.0;
  private repeatDelay: number = 3000; // 3 seconds

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Prime the voices
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          const voices = window.speechSynthesis.getVoices();
          console.log(`📡 Speech System: ${voices.length} voices loaded.`);
        };
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) {
      console.log("🔊 Voice Synth Enabled");
    }
  }

  setRate(rate: number) {
    this.rate = rate;
  }

  reset() {
    this.lastSpoken = '';
    this.lastSpokenTime = 0;
  }

  speak(text: string) {
    if (!this.enabled || !window.speechSynthesis) return;

    const lowerText = text.toLowerCase();
    
    // Handle neutral gesture as a reset
    if (lowerText === 'open' || lowerText === 'waiting...' || lowerText === 'idle' || lowerText === 'searching...') {
      this.reset();
      return;
    }

    const now = Date.now();
    const isSameText = text === this.lastSpoken;
    const isCooldownOver = (now - this.lastSpokenTime) > this.repeatDelay;

    // Only skip if it's the same text AND we are within the repeat delay
    if (isSameText && !isCooldownOver) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.rate;
    utterance.pitch = 1.0;
    
    // Try to find a nice robotic/futuristic voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Female') || 
      v.name.includes('Samantha') ||
      v.lang.startsWith('en')
    );
    
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
    this.lastSpoken = text;
    this.lastSpokenTime = now;
  }
}

export const speechService = new SpeechService();
