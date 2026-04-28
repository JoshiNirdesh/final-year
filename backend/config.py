"""
Central Configuration for Nexus Glove System
"""

# --- Serial Connection ---
SERIAL_BAUD = 9600
# Possible names for Arduino serial ports on Mac/Linux/Windows
PORT_SEARCH_KEYWORDS = ["usb", "serial", "ch340", "cp210x", "arduino", "ttyUSB", "ttyACM"]

# --- ML Model ---
MODEL_FILE = "gesture_pipeline.pkl"
LABEL_ENCODER_FILE = "label_encoder.pkl"
CSV_FILE = "gesture_data.csv"
CONFIDENCE_THRESHOLD = 0.85  # Slightly lowered to allow stable predictions to take over
STABILITY_WINDOW = 10        # Number of frames to check for consistency
STABILITY_THRESHOLD = 7      # Minimum number of consistent frames required

# --- Interface ---
REPEAT_DELAY = 3.0           # Seconds before repeating the same gesture
VOICE_ACTIVE_START = True    # Should voice be active on startup?
START_GESTURE = "start"
END_GESTURE   = "end"
NEUTRAL_GESTURE = "open"

# --- Calibration ---
CALIBRATION_SAMPLES = 30
EMA_ALPHA = 0.2              # More smoothing (lower = smoother)
