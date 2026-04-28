import serial
import serial.tools.list_ports
import time
import threading
import joblib
import numpy as np
import os
import csv
import logging
import subprocess
from flask import Flask, jsonify, request
from flask_cors import CORS
from features import EMAFilter, extract_features
import config
import warnings

# Suppress annoying math warnings from Scikit-Learn MLP
warnings.filterwarnings("ignore", category=RuntimeWarning, message=".*matmul.*")
warnings.filterwarnings("ignore", category=RuntimeWarning, message=".*overflow.*")
warnings.filterwarnings("ignore", category=RuntimeWarning, message=".*divide by zero.*")

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global State
latest_data = {
    "flex": [0, 0, 0, 0, 0],
    "acc": [0, 0, 0],
    "gesture": "Idle",
    "confidence": 0.0,
    "status": "disconnected"
}

# Stability Window for Web HUD
import collections
prediction_history = collections.deque(maxlen=config.STABILITY_WINDOW)
current_stable_gesture = "Idle"

# Calibration State
offsets = {"ax": 0.0, "ay": 0.0, "az": 0.0}
needs_recalibration = False

pipeline = None
le = None
ema = EMAFilter(alpha=config.EMA_ALPHA)

def find_arduino_port():
    """Automatically find the Arduino serial port with manual fallback."""
    ports = list(serial.tools.list_ports.comports())
    # 1. Try Auto-Discovery
    for p in ports:
        port_desc = (p.description + " " + p.device).lower()
        if any(keyword in port_desc for keyword in config.PORT_SEARCH_KEYWORDS):
            return p.device
            
    # 2. Manual Fallback
    if not ports: return None
    logger.warning("Glove not found automatically. Available ports:")
    for i, p in enumerate(ports):
        logger.warning(f"  [{i}] {p.device}")
    
    # In a non-interactive server, we cannot use input(). 
    # We will just return None and let the user plug it in or configure it.
    return None

def load_model():
    global pipeline, le
    try:
        pipeline = joblib.load(config.MODEL_FILE)
        le = joblib.load(config.LABEL_ENCODER_FILE)
        logger.info("✅ Deep Learning Model & Encoder loaded.")
    except Exception as e:
        logger.error(f"❌ Error loading model: {e}")

def calibrate_accel(ser):
    global offsets
    logger.info("⏳ Calibrating... Keep hand still.")
    count = 0
    ax_sum, ay_sum, az_sum = 0, 0, 0
    start_time = time.time()
    
    while count < config.CALIBRATION_SAMPLES:
        if time.time() - start_time > 10: break
        line = ser.readline().decode('utf-8', errors='ignore').strip()
        if not line: continue
        parts = line.split(',')
        if len(parts) >= 8:
            try:
                ax_sum += float(parts[5]); ay_sum += float(parts[6]); az_sum += float(parts[7])
                count += 1
            except: continue
            
    if count > 0:
        offsets["ax"] = ax_sum / count
        offsets["ay"] = ay_sum / count
        offsets["az"] = az_sum / count
        logger.info(f"🎯 Calibration Complete: {offsets}")

def read_serial_loop():
    global latest_data, pipeline, needs_recalibration
    
    ser = None
    while True:
        try:
            if ser is None or not ser.is_open:
                port = find_arduino_port()
                if not port:
                    latest_data["status"] = "disconnected"
                    time.sleep(2); continue
                
                logger.info(f"🔄 Connecting to {port}...")
                ser = serial.Serial(port, config.SERIAL_BAUD, timeout=1)
                time.sleep(2)
                calibrate_accel(ser)
                latest_data["status"] = "connected"

            if needs_recalibration:
                calibrate_accel(ser)
                needs_recalibration = False

            if ser.in_waiting > 100:
                ser.reset_input_buffer()
            
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line: continue

            parts = line.split(',')
            if len(parts) < 8: continue

            # 1. Parse & Calibrate
            raw_vals = [float(x.strip()) for x in parts[:8]]
            raw_vals[5] -= offsets["ax"]
            raw_vals[6] -= offsets["ay"]
            raw_vals[7] -= offsets["az"]
            
            # 2. Smooth
            smoothed = ema.filter(raw_vals)
            
            # 3. Predict & Filter with Stability Window
            if pipeline:
                X = extract_features(smoothed).reshape(1, -1)
                probs = pipeline.predict_proba(X)[0]
                max_prob = np.max(probs)
                
                if max_prob >= config.CONFIDENCE_THRESHOLD:
                    pred_idx = np.argmax(probs)
                    prediction = le.inverse_transform([pred_idx])[0]
                    prediction_history.append(prediction)
                else:
                    prediction_history.append("Waiting...")
                
                # Voting logic
                if len(prediction_history) > 0:
                    most_common, count = collections.Counter(prediction_history).most_common(1)[0]
                    if count >= config.STABILITY_THRESHOLD:
                        global current_stable_gesture
                        current_stable_gesture = most_common
                        latest_data["gesture"] = current_stable_gesture
                        latest_data["confidence"] = float(max_prob)
                    else:
                        # Keep current gesture, just update confidence if it's the same
                        latest_data["confidence"] = float(max_prob)

            latest_data["flex"] = [round(f, 1) for f in smoothed[0:5]]
            latest_data["acc"] = [round(a, 2) for a in smoothed[5:8]]
            latest_data["status"] = "connected"

        except Exception as e:
            logger.error(f"⚠️ Serial Error: {e}")
            latest_data["status"] = "disconnected"
            if ser: ser.close()
            ser = None
            time.sleep(2)

@app.route("/predict", methods=["GET"])
def get_predict():
    return jsonify(latest_data)

@app.route("/train", methods=["POST"])
def save_samples():
    try:
        data = request.json
        samples = data.get("samples", [])
        if not samples:
            return jsonify({"error": "No samples provided"}), 400
        
        file_exists = os.path.exists(config.CSV_FILE) and os.path.getsize(config.CSV_FILE) > 0
        
        with open(config.CSV_FILE, "a", newline="") as f:
            writer = csv.writer(f)
            # Ensure header if file is empty
            if not file_exists:
                writer.writerow(["f1", "f2", "f3", "f4", "f5", "ax", "ay", "az", "label"])
            
            for s in samples:
                # Expects s to have 'flex' (list of 5) and 'acc' (list of 3) and 'label' (string)
                row = s["flex"] + s["acc"] + [s["label"]]
                writer.writerow(row)
        
        logger.info(f"📥 Saved {len(samples)} new samples to {config.CSV_FILE}")
        return jsonify({"message": f"Successfully saved {len(samples)} samples."})
    except Exception as e:
        logger.error(f"❌ Error saving samples: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/recalibrate", methods=["POST"])
def trigger_recalibration():
    global needs_recalibration
    needs_recalibration = True
    return jsonify({"message": "Recalibration triggered."})

@app.route("/retrain", methods=["POST"])
def retrain():
    try:
        logger.info("🧠 Retraining Deep Learning model...")
        result = subprocess.run(["python3", "train.py"], capture_output=True, text=True)
        if result.returncode == 0:
            load_model()
            return jsonify({"message": "Model retrained successfully!"})
        return jsonify({"error": "Training failed", "details": result.stderr}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/health")
def health():
    return jsonify({"status": latest_data["status"]})

if __name__ == "__main__":
    load_model()
    thread = threading.Thread(target=read_serial_loop, daemon=True)
    thread.start()
    logger.info("🚀 Pure DL Server running on http://localhost:5001")
    app.run(port=5001, debug=False, use_reloader=False)
