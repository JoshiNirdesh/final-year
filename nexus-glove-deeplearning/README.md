# Nexus Glove: Pure Deep Learning Edition 🧠🧤

Welcome to the definitive workspace for the **Nexus Glove** gesture recognition system. This version has been fully migrated to a **Pure Deep Learning** architecture, achieving 97% accuracy with ultra-low latency.

## 🚀 Quick Start

### 1. Installation
Ensure you have Python 3.8+ installed, then run:
```bash
pip install -r requirements.txt
```

### 2. Hardware Setup
Upload the firmware found in `arduino_code_PRO.txt` to your Arduino. Ensure the sensors are connected to the correct analog pins.

### 3. Running the System
You have two ways to interact with the glove:

#### Option A: Terminal Cyber-HUD (Fastest)
The terminal-based HUD provides real-time data and AI predictions with zero overhead.
```bash
python3 predict.py
```

#### Option B: Web Dashboard (Visual)
If you want to use the React-based Cyber-Dashboard:
1. Start the API server:
   ```bash
   python3 app.py
   ```
2. Open your dashboard (React/Vite) in a separate terminal and run `npm run dev`.

## 🛠️ Developer Tools

### Data Collection (`data.py`)
Use this to record new gestures. It features **Automatic Port Discovery**—no manual serial port entry required.
```bash
python3 data.py
```

### AI Training (`train.py`)
Trains a 3-layer Neural Network (128, 64, 32) on your dataset. It automatically balances classes and performs data augmentation.
```bash
python3 train.py
```

## 📐 Project Structure
- `config.py`: Centralized system settings and AI thresholds.
- `features.py`: Digital Signal Processing (DSP) and Hand Orientation logic.
- `gesture_data.csv`: The core training dataset.
- `gesture_pipeline.pkl`: The compiled Deep Learning model.

---
*Developed for Final Year Project - Nexus Glove System.*
