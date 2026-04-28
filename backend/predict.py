import serial
import serial.tools.list_ports
import joblib
import numpy as np
import time
import os
import collections
import logging
import json
from features import EMAFilter, extract_features
import config
import sys
import warnings

# Suppress annoying math warnings from Scikit-Learn MLP
warnings.filterwarnings("ignore", category=RuntimeWarning, message=".*matmul.*")
warnings.filterwarnings("ignore", category=RuntimeWarning, message=".*overflow.*")
warnings.filterwarnings("ignore", category=RuntimeWarning, message=".*divide by zero.*")

# For terminal UI
def clear_console():
    print("\033[H\033[J", end="")

def progress_bar(val, max_val=1023, length=20):
    percent = min(1.0, max(0.0, val / max_val))
    filled = int(length * percent)
    bar = "█" * filled + "░" * (length - filled)
    return f"[{bar}] {int(percent*100)}%"

# --- Setup Logging ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

def find_arduino_port():
    """Automatically find the Arduino serial port with manual fallback."""
    ports = list(serial.tools.list_ports.comports())
    # 1. Try Auto-Discovery
    for p in ports:
        port_desc = (p.description + " " + p.device).lower()
        if any(keyword in port_desc for keyword in config.PORT_SEARCH_KEYWORDS):
            logger.info(f"✅ Found glove on: {p.device}")
            return p.device
            
    # 2. Manual Fallback
    if not ports: return None
    print("\n⚠️  Glove not found automatically. Please select:")
    for i, p in enumerate(ports):
        print(f"  [{i}] {p.device} ({p.description})")
    try:
        idx = int(input(f"Select index: "))
        return ports[idx].device
    except:
        return None

def live_monitor(ser):
    """Show a live preview of sensor data to ensure everything is working."""
    print("\n--- LIVE MONITOR (Press Ctrl+C to stop preview) ---")
    print("F1   F2   F3   F4   F5   AccX  AccY  AccZ")
    try:
        while True:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line: continue
            vals = line.split(",")
            if len(vals) >= 8:
                formatted = " ".join([f"{v.strip():>4}" for v in vals[:8]])
                print(f"\r{formatted}", end="", flush=True)
    except KeyboardInterrupt:
        print("\n--- Monitoring Stopped ---\n")

class NexusGlovePredictor:
    def __init__(self):
        self.pipeline = None
        self.le = None
        self.ema = EMAFilter(alpha=config.EMA_ALPHA)
        self.ser = None
        
        self.base_ax, self.base_ay, self.base_az = 0.0, 0.0, 0.0
        self.flex_min = np.array([1023.0] * 5)
        self.flex_max = np.array([0.0] * 5)
        
        self.voice_active = config.VOICE_ACTIVE_START
        self.last_spoken_gesture = None
        self.last_spoken_time = 0
        
        # Stability Buffer
        self.prediction_history = collections.deque(maxlen=config.STABILITY_WINDOW)
        self.current_stable_gesture = "Waiting..."
        
        self.load_model()

    def load_model(self):
        logger.info("Loading model and encoder...")
        try:
            self.pipeline = joblib.load(config.MODEL_FILE)
            self.le = joblib.load(config.LABEL_ENCODER_FILE)
            self.load_calibration()
            # 🔔 Success Beep
            print("\a", end="")
            logger.info("✅ Model & Calibration loaded.")
        except Exception as e:
            logger.error(f"❌ Error loading model: {e}")
            exit(1)

    def speak(self, text):
        """Speaks text using native macOS 'say' command."""
        if not text: return
        logger.info(f"🔊 SPEAKING: {text}")
        os.system(f"say {text} &")

    def connect_serial(self):
        port = find_arduino_port()
        if not port:
            logger.warning("Waiting for glove... Please ensure it is plugged in.")
            return False
            
        try:
            self.ser = serial.Serial(port, config.SERIAL_BAUD, timeout=1)
            time.sleep(2)
            self.ser.reset_input_buffer()
            logger.info(f"✅ Connected to {port}")
            
            # Optional Monitor
            choice = input("Do you want to see a live sensor preview first? (y/n): ").strip().lower()
            if choice == 'y':
                live_monitor(self.ser)
                
            return True
        except Exception as e:
            logger.error(f"❌ Connection Error: {e}")
            return False

    def calibrate(self):
        logger.info(f"⏳ Calibrating... Keep hand still in neutral position ({config.CALIBRATION_SAMPLES} samples)")
        time.sleep(1)
        
        c_ax, c_ay, c_az = 0.0, 0.0, 0.0
        count = 0
        self.ser.reset_input_buffer()
        
        start_time = time.time()
        logger.info("📡 Waiting for serial data stream...")
        
        while count < config.CALIBRATION_SAMPLES:
            # Timeout after 15 seconds to avoid infinite hang
            elapsed = time.time() - start_time
            if elapsed > 15:
                logger.error(f"❌ Calibration Timed Out after {elapsed:.1f}s! No data received.")
                logger.error("👉 Please check your Arduino connection and Serial Monitor.")
                break

            # Check if there's data waiting to avoid blocking hangs
            if self.ser.in_waiting == 0:
                time.sleep(0.1)
                continue

            try:
                line = self.ser.readline().decode('utf-8', errors='ignore').strip()
                if not line: 
                    continue
                
                parts = [p.strip() for p in line.split(",") if p.strip()]
                # We expect 8 values: F1,F2,F3,F4,F5,AccX,AccY,AccZ
                if len(parts) >= 8:
                    try:
                        val = [float(p) for p in parts]
                        c_ax += val[5]; c_ay += val[6]; c_az += val[7]
                        count += 1
                        if count % 5 == 0:
                            logger.info(f"  📥 Progress: {count}/{config.CALIBRATION_SAMPLES} samples")
                    except ValueError:
                        logger.debug(f"Skipping non-numeric line: {line}")
                else:
                    # Only log this occasionally to avoid spamming
                    if int(elapsed) % 5 == 0:
                        logger.warning(f"⚠️  Data format mismatch: Expected 8+ cols, got {len(parts)} ({line})")
            except Exception as e:
                logger.error(f"⚠️  Serial read error: {e}")
                time.sleep(0.5)
            
        if count > 0:
            self.base_ax = c_ax / count
            self.base_ay = c_ay / count
            self.base_az = c_az / count
            logger.info(f"🎯 Accel Calibration Complete: Offsets [{self.base_ax:.1f}, {self.base_ay:.1f}, {self.base_az:.1f}]")
        else:
            logger.error("❌ Calibration failed. Check if Arduino is sending data in CSV format.")

    def run(self):
        print(f"\n{'='*50}")
        print("🧠 NEXUS GLOVE PURE DEEP LEARNING HUD")
        print(f"{'='*50}\n")
        
        while True:
            if not self.ser or not self.ser.is_open:
                if not self.connect_serial():
                    time.sleep(2); continue
                self.calibrate()
            
            frame_count = 0
            start_time = time.time()
            
            try:
                while True:
                    line = self.ser.readline().decode('utf-8', errors='ignore').strip()
                    if not line: continue
                    
                    parts = line.split(",")
                    if len(parts) < 8: continue
                    
                    raw_data = [float(p) for p in parts[:8]]
                    raw_data[5] -= self.base_ax
                    raw_data[6] -= self.base_ay
                    raw_data[7] -= self.base_az
                    
                    smoothed = self.ema.filter(raw_data)
                    features = extract_features(smoothed).reshape(1, -1)
                    
                    # --- Pure DL Prediction ---
                    probs = self.pipeline.predict_proba(features)[0]
                    max_prob = np.max(probs)
                    pred_idx = np.argmax(probs)
                    prediction = self.le.inverse_transform([pred_idx])[0]
 
                    frame_count += 1
                    hz = frame_count / (time.time() - start_time)
 
                    # --- Stability & Confidence Logic ---
                    if max_prob < config.CONFIDENCE_THRESHOLD:
                        self.prediction_history.append("Waiting...")
                    else:
                        self.prediction_history.append(prediction)
                    
                    # Determine the most frequent prediction in the window
                    most_common, count = collections.Counter(self.prediction_history).most_common(1)[0]
                    
                    if count >= config.STABILITY_THRESHOLD:
                        current_gesture = most_common
                    else:
                        # Keep the previous stable gesture if the current window isn't confident
                        current_gesture = self.current_stable_gesture
 
                    self.current_stable_gesture = current_gesture
                    
                    # --- Activation Logic ---
                    if current_gesture == config.START_GESTURE and not self.voice_active:
                        self.voice_active = True
                        print("\a", end="") # 🔔
                        self.speak("System activated")
                    elif current_gesture == config.END_GESTURE and self.voice_active:
                        self.voice_active = False
                        print("\a", end="") # 🔔
                        self.speak("System deactivated")
                    
                    # --- HUD UPDATE ---
                    clear_console()
                    print(f"🧠 NEXUS GLOVE DEEP LEARNING HUD")
                    print(f"{'='*40}")
                    print(f"F1: {progress_bar(raw_data[0])}  F4: {progress_bar(raw_data[3])}")
                    print(f"F2: {progress_bar(raw_data[1])}  F5: {progress_bar(raw_data[4])}")
                    print(f"F3: {progress_bar(raw_data[2])}")
                    print(f"{'-'*40}")
                    print(f"Orientation: P:{features[0,8]:.1f}° R:{features[0,9]:.1f}°")
                    print(f"AI Prediction: \033[92m{current_gesture.upper()}\033[0m ({max_prob*100:.1f}%)")
                    print(f"Inference: {hz:.1f} Hz | Status: {'🔊 ACTIVE' if self.voice_active else '🔇 STANDBY'}")
                    print(f"{'='*40}")
 
                    # --- Speaking Logic ---
                    if self.voice_active and current_gesture not in [config.START_GESTURE, config.END_GESTURE, "Waiting...", config.NEUTRAL_GESTURE]:
                        now = time.time()
                        if (current_gesture != self.last_spoken_gesture) or (now - self.last_spoken_time > config.REPEAT_DELAY):
                            self.speak(current_gesture)
                            self.last_spoken_gesture = current_gesture
                            self.last_spoken_time = now
                            
            except Exception as e:
                logger.error(f"Runtime Error: {e}")
                if self.ser: self.ser.close()
                time.sleep(1)
                break

    def load_calibration(self):
        if os.path.exists("hand_profile.json"):
            with open("hand_profile.json", "r") as f:
                data = json.load(f)
                self.flex_min = np.array(data["min"])
                self.flex_max = np.array(data["max"])
                self.base_ax, self.base_ay, self.base_az = data["accel"]
            logger.info("📂 Calibration profile loaded.")

if __name__ == "__main__":
    predictor = NexusGlovePredictor()
    try:
        predictor.run()
    except KeyboardInterrupt:
        logger.info("Shutdown requested.")
