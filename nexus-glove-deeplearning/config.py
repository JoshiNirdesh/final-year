"""
Central Configuration for Nexus Glove System
"""

# --- Serial Connection ---
SERIAL_BAUD = 115200
# Possible names for Arduino serial ports on Mac/Linux/Windows
PORT_SEARCH_KEYWORDS = ["usb", "serial", "ch340", "cp210x", "arduino", "ttyUSB", "ttyACM"]

# --- ML Model ---
MODEL_FILE = "gesture_pipeline.pkl"
LABEL_ENCODER_FILE = "label_encoder.pkl"
CSV_FILE = "gesture_data.csv"
CONFIDENCE_THRESHOLD = 0.90  # Relying purely on AI confidence score

# --- Interface ---
REPEAT_DELAY = 3.0           # Seconds before repeating the same gesture
VOICE_ACTIVE_START = True    # Should voice be active on startup?
START_GESTURE = "start"
END_GESTURE   = "end"
NEUTRAL_GESTURE = "open"

# --- Calibration ---
CALIBRATION_SAMPLES = 30
EMA_ALPHA = 0.3              # Smoothing factor (0=no change, 1=no smoothing)
