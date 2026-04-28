# System Architecture
## An AI Powered Wearable Gesture Interpretation System for Real-Time Sign to Speech Translation

---

## 1. Overviewå

The system is built on a **3-tier layered architecture**:

```
┌─────────────────────────────────────────────┐
│           LAYER 3: OUTPUT LAYER             │
│     Speech Engine  |  Web Dashboard         │
├─────────────────────────────────────────────┤
│        LAYER 2: INTELLIGENCE LAYER          │
│  Signal Processing → Feature Engineering   │
│      → Deep Learning Model (MLP)            │
├─────────────────────────────────────────────┤
│          LAYER 1: HARDWARE LAYER            │
│   Flex Sensors + MPU6050 + Arduino Uno      │
└─────────────────────────────────────────────┘
```

---

## 2. Full System Architecture Diagram

```
╔══════════════════════════════════════════════════════════════════════╗
║                        HARDWARE LAYER                               ║
║                                                                      ║
║  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐║
║  │  Flex 1  │  │  Flex 2  │  │  Flex 3  │  │  Flex 4  │  │Flex 5 │║
║  │ (Thumb)  │  │(Index)   │  │(Middle)  │  │  (Ring)  │  │(Pinky)│║
║  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬───┘║
║       │              │              │              │              │   ║
║       └──────────────┴──────────────┴──────────────┴──────────────┘  ║
║                                    │ Analog pins A0-A4 (0-1023)      ║
║                             ┌──────┴──────┐                          ║
║  ┌──────────────┐           │             │                          ║
║  │   MPU6050    │──I²C─────▶│ Arduino Uno │                          ║
║  │Accelerometer │  (AcX,    │  ATmega328P │                          ║
║  │  /Gyroscope  │   AcY,    │  16 MHz     │                          ║
║  └──────────────┘   AcZ)    └──────┬──────┘                          ║
║                                    │ USB Serial @ 115200 baud        ║
╚════════════════════════════════════╪════════════════════════════════╝
                                     │ CSV: F1,F2,F3,F4,F5,Ax,Ay,Az
╔════════════════════════════════════╪════════════════════════════════╗
║                    INTELLIGENCE LAYER (Python)                      ║
║                                    │                                 ║
║                         ┌──────────▼──────────┐                     ║
║                         │  1. CALIBRATION     │                     ║
║                         │  Subtract accel     │                     ║
║                         │  baseline offsets   │                     ║
║                         └──────────┬──────────┘                     ║
║                                    │                                 ║
║                         ┌──────────▼──────────┐                     ║
║                         │  2. EMA FILTER      │                     ║
║                         │  S(t) = α·X(t) +    │                     ║
║                         │  (1-α)·S(t-1)       │                     ║
║                         │  α = 0.3            │                     ║
║                         └──────────┬──────────┘                     ║
║                                    │ smoothed[8]                     ║
║                         ┌──────────▼──────────┐                     ║
║                         │  3. FEATURE ENG.    │                     ║
║                         │  8 values → 13      │                     ║
║                         │  + Pitch, Roll,     │                     ║
║                         │  AccMag, FlexAvg,   │                     ║
║                         │  FlexRange          │                     ║
║                         └──────────┬──────────┘                     ║
║                                    │ features[13]                    ║
║                         ┌──────────▼──────────┐                     ║
║                         │  4. STANDARD SCALER │                     ║
║                         │  Z = (X - μ) / σ   │                     ║
║                         │  mean=0, std=1      │                     ║
║                         └──────────┬──────────┘                     ║
║                                    │ scaled[13]                      ║
║                         ┌──────────▼──────────┐                     ║
║                         │  5. MLP NEURAL NET  │                     ║
║                         │  128 → 64 → 32 →   │                     ║
║                         │  K (softmax)        │                     ║
║                         │  ~12,458 params     │                     ║
║                         └──────────┬──────────┘                     ║
║                                    │ probabilities[K]                ║
║                         ┌──────────▼──────────┐                     ║
║                         │  6. CONFIDENCE GATE │                     ║
║                         │  if prob >= 90%:    │                     ║
║                         │    accept gesture   │                     ║
║                         │  else: "Searching" │                     ║
║                         └──────────┬──────────┘                     ║
╚════════════════════════════════════╪════════════════════════════════╝
                                     │ Predicted Gesture Label
╔════════════════════════════════════╪════════════════════════════════╗
║                        OUTPUT LAYER                                  ║
║                                    │                                 ║
║              ┌─────────────────────┴────────────────────┐           ║
║              │                                           │           ║
║   ┌──────────▼──────────┐               ┌───────────────▼────────┐  ║
║   │   SPEECH ENGINE     │               │    WEB DASHBOARD       │  ║
║   │  macOS 'say' cmd    │               │   Flask REST API       │  ║
║   │  Text-to-Speech     │               │   localhost:5001       │  ║
║   └──────────┬──────────┘               └───────────────┬────────┘  ║
║              │                                           │           ║
║   ┌──────────▼──────────┐               ┌───────────────▼────────┐  ║
║   │     SPEAKER         │               │    BROWSER UI          │  ║
║   │  Audio Output       │               │  Real-Time HUD         │  ║
║   │  < 50ms latency     │               │  Sensor Graphs         │  ║
║   └─────────────────────┘               └────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 3. Architecture Layers — Detailed

### Layer 1: Hardware Layer

| Component | Role | Output |
|---|---|---|
| **Flex Sensors ×5** | Measure finger bend via resistance change | 0–1023 (10-bit ADC) |
| **MPU6050** | Measure hand tilt/orientation via MEMS | ±32768 (16-bit signed) |
| **Arduino Uno** | Read sensors, encode as CSV, transmit | CSV string @ 100 Hz |
| **USB Serial** | Physical data channel | 115200 baud |

### Layer 2: Intelligence Layer

| Stage | Module | Purpose |
|---|---|---|
| **Calibration** | `predict.py` / `data.py` | Zero out accelerometer gravity offset |
| **EMA Filter** | `features.py` | Smooth electrical noise (α = 0.3) |
| **Feature Engineering** | `features.py` | Expand 8 → 13 meaningful features |
| **StandardScaler** | `train.py` (in pipeline) | Normalize all features to same scale |
| **MLP Neural Network** | `gesture_pipeline.pkl` | Classify gesture from features |
| **Confidence Gate** | `predict.py` / `app.py` | Accept only if confidence ≥ 90% |

### Layer 3: Output Layer

| Mode | Module | Description |
|---|---|---|
| **Terminal Mode** | `predict.py` | HUD display + macOS `say` speech |
| **Dashboard Mode** | `app.py` + Browser | REST API + real-time web interface |

---

## 4. Data Flow Summary

```
Finger bends
    → Flex sensor resistance changes (Ohm's Law)
    → Arduino ADC converts to integer (0–1023)
    → MPU6050 reads gravity vector (±32768)
    → Arduino sends 8 values as CSV over USB
    → Python reads serial string
    → Subtract calibration offsets from accelerometer
    → EMA filter smooths all 8 values
    → Feature engineering creates 13 values
    → StandardScaler normalizes to mean=0, std=1
    → MLP forward pass: 13 → 128 → 64 → 32 → K
    → Softmax outputs K probabilities (sum = 1.0)
    → Confidence gate: accept if max_prob ≥ 90%
    → Speak gesture label via macOS TTS
    → Total latency: < 50 milliseconds
```

---

## 5. Training Sub-Architecture

```
gesture_data.csv
    → Remove duplicates
    → Oversample minority classes (match largest class)
    → Gaussian noise augmentation (σ=5) → 2× dataset
    → extract_features() → 13-D vectors
    → GridSearchCV (48 combos × 5-fold CV)
    → Best: StandardScaler + MLP(128,64,32) + ReLU
    → Evaluate on 20% test split → 97% accuracy
    → Save gesture_pipeline.pkl + label_encoder.pkl
```

---

## 6. Technology Stack

| Category | Technology | Version |
|---|---|---|
| Microcontroller | Arduino Uno (C++) | ATmega328P |
| Language | Python 3 | 3.9+ |
| ML Framework | scikit-learn | Latest |
| Data Processing | NumPy, Pandas | Latest |
| Visualization | Matplotlib, Seaborn | Latest |
| Hardware I/O | PySerial | Latest |
| API Server | Flask + Flask-CORS | Latest |
| Model Storage | Joblib (.pkl) | Latest |
| Speech | macOS `say` (built-in) | macOS 12+ |

---

## 7. Key Design Decisions

| Decision | Reason |
|---|---|
| **MLP over CNN** | Sensor data is tabular (13 features), not image — CNN not needed |
| **MLP over SVM** | SVM too slow to train as dataset grows; MLP inference is a single fast pass |
| **MLP over Random Forest** | RF produced jittery predictions with noisy analog input |
| **EMA over Kalman filter** | EMA is simpler, real-time, and sufficient for this noise level |
| **13 features over 8 raw** | Pitch/Roll/AccMag significantly improve gesture discrimination |
| **90% confidence threshold** | Balances responsiveness vs. false positives during hand transitions |
| **GridSearchCV** | Automated, reproducible hyperparameter selection over 48 combinations |
| **Gaussian augmentation** | Teaches model to handle real-world sensor variation without more hardware |
