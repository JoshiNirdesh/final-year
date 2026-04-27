# Chapter 4: System Design

## 4.1. Design — Object-Oriented Approach

The system follows an Object-Oriented design approach. The key classes identified during analysis are refined below with full relationships, responsibilities, and interactions.

---

### 4.1.1. Refinement of Class Diagram

The class diagram below shows all major classes, their attributes, methods, and relationships in the final system.

```mermaid
classDiagram
    class EMAFilter {
        +float alpha
        +ndarray state
        +__init__(alpha: float)
        +filter(data: list) ndarray
    }

    class FeatureExtractor {
        +extract_features(row: ndarray) ndarray
        +get_feature_names() list
    }

    class GesturePipeline {
        +StandardScaler scaler
        +MLPClassifier mlp
        +fit(X, y)
        +predict_proba(X) ndarray
        +predict(X) ndarray
    }

    class LabelEncoder {
        +list classes_
        +fit_transform(y) ndarray
        +transform(y) ndarray
        +inverse_transform(y) ndarray
    }

    class NexusGlovePredictor {
        +GesturePipeline pipeline
        +LabelEncoder le
        +EMAFilter ema
        +Serial ser
        +float base_ax
        +float base_ay
        +float base_az
        +bool voice_active
        +load_model()
        +connect_serial()
        +calibrate()
        +run()
        +speak(text: str)
        +load_calibration()
    }

    class DataCollector {
        +Serial ser
        +float base_ax
        +float base_ay
        +float base_az
        +find_arduino_port() str
        +calibrate()
        +record_gesture(label: str, frames: int)
        +create_backup()
    }

    class Trainer {
        +DataFrame df
        +GesturePipeline best_pipeline
        +load_data(path: str)
        +clean_data()
        +balance_and_augment(df) tuple
        +train(X, y)
        +evaluate(X_test, y_test)
        +save_model()
        +plot_confusion_matrix()
        +plot_loss_curve()
    }

    class FlaskAPI {
        +dict latest_data
        +GesturePipeline pipeline
        +LabelEncoder le
        +EMAFilter ema
        +dict offsets
        +load_model()
        +calibrate_accel(ser)
        +read_serial_loop()
        +get_predict() JSON
        +trigger_recalibration() JSON
        +retrain() JSON
        +health() JSON
    }

    NexusGlovePredictor --> GesturePipeline : uses
    NexusGlovePredictor --> LabelEncoder : uses
    NexusGlovePredictor --> EMAFilter : uses
    NexusGlovePredictor --> FeatureExtractor : uses
    FlaskAPI --> GesturePipeline : uses
    FlaskAPI --> LabelEncoder : uses
    FlaskAPI --> EMAFilter : uses
    FlaskAPI --> FeatureExtractor : uses
    Trainer --> GesturePipeline : creates
    Trainer --> LabelEncoder : creates
    Trainer --> FeatureExtractor : uses
    DataCollector ..> Trainer : produces data for
```

---

### 4.1.2. Refinement of Sequence Diagrams

#### Sequence Diagram 1: Real-Time Gesture Prediction

This diagram shows the interaction flow from the moment the Arduino sends sensor data to the system speaking the predicted word.

```mermaid
sequenceDiagram
    participant Arduino
    participant Serial as Serial Port
    participant Predictor as NexusGlovePredictor
    participant EMA as EMAFilter
    participant FE as FeatureExtractor
    participant Model as GesturePipeline
    participant OS as macOS Speech

    Arduino->>Serial: Send CSV string (F1,F2,F3,F4,F5,Ax,Ay,Az)
    Serial->>Predictor: readline()
    Predictor->>Predictor: Parse & subtract calibration offsets
    Predictor->>EMA: filter(raw_data[8])
    EMA-->>Predictor: smoothed[8]
    Predictor->>FE: extract_features(smoothed)
    FE-->>Predictor: feature_vector[13]
    Predictor->>Model: predict_proba(feature_vector)
    Model-->>Predictor: probabilities[K]
    Predictor->>Predictor: max_prob = max(probs)
    alt max_prob >= 0.90
        Predictor->>Predictor: prediction = class label
        Predictor->>OS: say(prediction)
        OS-->>Predictor: Speech output
    else max_prob < 0.90
        Predictor->>Predictor: gesture = "Searching..."
    end
    Predictor->>Predictor: Update HUD display
```

#### Sequence Diagram 2: Model Training Pipeline

```mermaid
sequenceDiagram
    participant User
    participant Trainer
    participant FE as FeatureExtractor
    participant LE as LabelEncoder
    participant GS as GridSearchCV
    participant Model as GesturePipeline

    User->>Trainer: Run train.py
    Trainer->>Trainer: load_data(gesture_data.csv)
    Trainer->>Trainer: drop_duplicates()
    Trainer->>LE: fit_transform(labels)
    LE-->>Trainer: y_encoded
    Trainer->>Trainer: balance_and_augment(df)
    loop For each sample
        Trainer->>FE: extract_features(raw_sample)
        FE-->>Trainer: features[13]
        Trainer->>FE: extract_features(raw_sample + noise)
        FE-->>Trainer: augmented_features[13]
    end
    Trainer->>GS: fit(X_augmented, y)
    loop 48 hyperparameter combinations × 5 folds
        GS->>Model: fit(X_train_fold, y_train_fold)
        Model-->>GS: validation_score
    end
    GS-->>Trainer: best_estimator_
    Trainer->>Model: fit(X_train, y_train)
    Trainer->>Model: predict(X_test)
    Trainer->>Trainer: plot confusion matrix & loss curve
    Trainer->>Trainer: save(gesture_pipeline.pkl)
    Trainer-->>User: Training complete — 97% accuracy
```

#### Sequence Diagram 3: Data Collection

```mermaid
sequenceDiagram
    participant User
    participant DataCollector
    participant Arduino
    participant CSV as gesture_data.csv

    User->>DataCollector: Run data.py
    DataCollector->>DataCollector: create_backup()
    DataCollector->>Arduino: Connect serial (115200 baud)
    DataCollector->>Arduino: Read 30 frames (calibration)
    Arduino-->>DataCollector: Raw accelerometer values
    DataCollector->>DataCollector: Compute base_ax, base_ay, base_az
    loop For each gesture
        User->>DataCollector: Enter gesture label
        User->>DataCollector: Press ENTER to record
        DataCollector->>Arduino: Reset input buffer
        loop 1200 frames
            Arduino-->>DataCollector: F1,F2,F3,F4,F5,Ax,Ay,Az
            DataCollector->>DataCollector: Subtract calibration offsets
            DataCollector->>CSV: Append row with label
        end
        DataCollector-->>User: Done — 1200 frames saved
    end
```

---

### 4.1.3. Refinement of Activity Diagram

#### Activity Diagram 1: System Startup & Real-Time Operation

```mermaid
flowchart TD
    A([Start System]) --> B[Load model gesture_pipeline.pkl]
    B --> C{Model loaded?}
    C -- No --> D([Exit with error])
    C -- Yes --> E[Search for Arduino serial port]
    E --> F{Port found?}
    F -- No --> G[Wait 2 seconds] --> E
    F -- Yes --> H[Connect at 115200 baud]
    H --> I[Calibrate accelerometer\n30 samples, compute offsets]
    I --> J([Enter Real-Time Loop])
    J --> K[Read serial line from Arduino]
    K --> L{Valid 8-value CSV?}
    L -- No --> K
    L -- Yes --> M[Subtract calibration offsets]
    M --> N[Apply EMA filter α=0.3]
    N --> O[Extract 13 features]
    O --> P[MLP predict_proba → K probabilities]
    P --> Q{max_prob ≥ 0.90?}
    Q -- No --> R[Show Searching...] --> J
    Q -- Yes --> S[Get predicted gesture label]
    S --> T{Gesture == start?}
    T -- Yes --> U[Enable voice output] --> J
    T -- No --> V{Gesture == end?}
    V -- Yes --> W[Disable voice output] --> J
    V -- No --> X{Voice active?}
    X -- No --> J
    X -- Yes --> Y{Same gesture within 3s?}
    Y -- Yes --> J
    Y -- No --> Z[Speak gesture using macOS say]
    Z --> J
```

#### Activity Diagram 2: Training Pipeline

```mermaid
flowchart TD
    A([Start Training]) --> B[Load gesture_data.csv]
    B --> C[Remove duplicate rows]
    C --> D[Encode labels with LabelEncoder]
    D --> E[Count samples per class]
    E --> F[Oversample minority classes\nto match largest class]
    F --> G[For each balanced sample:\nExtract 13 features]
    G --> H[For each balanced sample:\nAdd Gaussian noise σ=5\nExtract 13 features again]
    H --> I[Combined augmented dataset\n2× size]
    I --> J[Define GridSearchCV\n48 combinations × 5-fold CV]
    J --> K[Fit all combinations]
    K --> L[Select best hyperparameters]
    L --> M[Retrain best model on\n80% train split]
    M --> N[Evaluate on 20% test split]
    N --> O[Generate Confusion Matrix]
    O --> P[Generate Loss Curve]
    P --> Q[Save gesture_pipeline.pkl\nSave label_encoder.pkl]
    Q --> R([Training Complete])
```

#### Activity Diagram 3: State Diagram — System States

```mermaid
stateDiagram-v2
    [*] --> Initializing : System starts
    Initializing --> Disconnected : Model loaded, searching port
    Disconnected --> Calibrating : Arduino port found
    Calibrating --> Standby : Calibration complete (30 samples)
    Standby --> Listening : "start" gesture detected
    Listening --> Predicting : Frame received from Arduino
    Predicting --> Listening : Confidence < 90% (Searching)
    Predicting --> Speaking : Confidence ≥ 90%, voice active
    Speaking --> Listening : Speech output triggered
    Listening --> Standby : "end" gesture detected
    Listening --> Disconnected : Serial connection lost
    Standby --> Disconnected : Serial connection lost
    Disconnected --> Calibrating : Reconnected
```

---

### 4.1.4. Component Diagram

The component diagram shows how the major software and hardware modules are organized and how they depend on each other.

```mermaid
graph TB
    subgraph Hardware Layer
        A[Arduino Uno\nFirmware]
        B[Flex Sensors ×5]
        C[MPU6050\nAccelerometer]
        B --> A
        C --> A
    end

    subgraph Communication Layer
        D[USB Serial\n115200 baud]
        A --> D
    end

    subgraph Python Core
        E[config.py\nSystem Settings]
        F[features.py\nEMAFilter + FeatureExtractor]
        G[data.py\nData Collection]
        H[train.py\nTraining Pipeline]
        I[predict.py\nReal-Time Predictor]
        J[app.py\nFlask REST API]
    end

    subgraph Trained Artifacts
        K[gesture_pipeline.pkl\nStandardScaler + MLP]
        L[label_encoder.pkl\nGesture Class Names]
        M[gesture_data.csv\nTraining Dataset]
    end

    subgraph External Services
        N[macOS say\nText-to-Speech]
        O[Web Dashboard\nFrontend UI]
    end

    D --> G
    D --> I
    D --> J
    E --> G
    E --> H
    E --> I
    E --> J
    F --> H
    F --> I
    F --> J
    G --> M
    M --> H
    H --> K
    H --> L
    K --> I
    L --> I
    K --> J
    L --> J
    I --> N
    J --> O
```

---

### 4.1.5. Deployment Diagram

The deployment diagram shows the physical architecture of how the system is deployed across hardware nodes.

```mermaid
graph LR
    subgraph Glove_Hardware ["Glove — Wearable Hardware"]
        direction TB
        FS["5× Flex Sensors\nAnalog Resistors"]
        MPU["MPU6050\nAccelerometer/Gyro\nI²C Bus"]
        ARD["Arduino Uno\nATmega328P\n16MHz, 32KB Flash\nFirmware: arduino_code_PRO"]
        FS -->|"0–1023 ADC"| ARD
        MPU -->|"±32768 raw int"| ARD
    end

    subgraph USB ["USB Cable\n115200 baud serial"]
        USB_LINE["Data Stream:\nF1,F2,F3,F4,F5,Ax,Ay,Az\n@ 100 Hz"]
    end

    subgraph Laptop ["Laptop — macOS\nPython 3 Runtime"]
        direction TB
        subgraph Core_ML ["Core ML Process"]
            PRED["predict.py\nNexusGlovePredictor"]
            MODEL["gesture_pipeline.pkl\nStandardScaler + MLP\n~12,458 parameters"]
            LE["label_encoder.pkl"]
            PRED --> MODEL
            PRED --> LE
        end
        subgraph API_Server ["Flask API Server\nPort 5001"]
            APP["app.py\nREST Endpoints\n/predict /retrain /recalibrate"]
            APP --> MODEL
            APP --> LE
        end
        SAY["macOS say\nText-to-Speech"]
        SPEAKER["Speaker\nAudio Output"]
        PRED --> SAY --> SPEAKER
    end

    subgraph Browser ["Web Browser"]
        DASH["Dashboard UI\nReal-Time HUD"]
    end

    ARD -->|"USB Serial"| PRED
    ARD -->|"USB Serial"| APP
    APP <-->|"HTTP REST\nlocalhost:5001"| DASH
```

---

## 4.2. Algorithm Details

### 4.2.1. Accelerometer Calibration Algorithm

**Purpose:** Remove the gravitational baseline from accelerometer readings so values represent relative hand motion.

**Source:** `data.py`, `predict.py`, `app.py`

**Mathematical Formula:**
```
base_ax = (1/N) × Σᵢ axᵢ      where N = 30
base_ay = (1/N) × Σᵢ ayᵢ
base_az = (1/N) × Σᵢ azᵢ

At runtime:
ax_cal = ax_raw − base_ax
ay_cal = ay_raw − base_ay
az_cal = az_raw − base_az
```

**Pseudocode:**
```
FUNCTION calibrate(serial, N=30):
    sum_ax = sum_ay = sum_az = 0
    count = 0
    WHILE count < N:
        line = READ(serial)
        vals = PARSE(line)  // [f1..f5, ax, ay, az]
        sum_ax += vals[5];  sum_ay += vals[6];  sum_az += vals[7]
        count += 1
    RETURN (sum_ax/N, sum_ay/N, sum_az/N)
```

---

### 4.2.2. Exponential Moving Average (EMA) Filter

**Purpose:** Smooth noisy real-time sensor data to reduce electrical jitter.

**Source:** `features.py` — `EMAFilter` class

**Formula:**
```
S(t) = α × X(t) + (1 − α) × S(t−1)
```
- α = **0.3** (smoothing factor)
- Low α → heavier smoothing, more lag
- High α → less smoothing, more responsive

**Pseudocode:**
```
CLASS EMAFilter(alpha=0.3):
    state = NULL
    FUNCTION filter(data[8]):
        IF state IS NULL:
            state = data
        ELSE:
            state = alpha × data + (1 − alpha) × state
        RETURN state
```

---

### 4.2.3. Feature Engineering Algorithm

**Purpose:** Transform 8 raw sensor values into 13 semantically meaningful features.

**Source:** `features.py` — `extract_features()`

| Feature | Formula | Meaning |
|---|---|---|
| Flex1–Flex5 | Raw values | Individual finger bend |
| AccX, AccY, AccZ | Calibrated raw | Hand acceleration |
| **Pitch** | `atan2(ay, √(ax²+az²)) × 180/π` | Forward/backward tilt (°) |
| **Roll** | `atan2(−ax, az) × 180/π` | Left/right tilt (°) |
| **AccMag** | `√(ax²+ay²+az²)` | Overall motion intensity |
| **FlexAvg** | `mean(F1..F5)` | Overall grip tightness |
| **FlexRange** | `max(F1..F5) − min(F1..F5)` | Finger spread |

**Pseudocode:**
```
FUNCTION extract_features(raw[8]):
    flex = raw[0:5]
    ax, ay, az = raw[5], raw[6], raw[7]

    pitch     = atan2(ay, sqrt(ax²+az²)) × (180/π)
    roll      = atan2(-ax, az) × (180/π)
    accel_mag = sqrt(ax²+ay²+az²)
    flex_avg  = mean(flex)
    flex_range= max(flex) - min(flex)

    RETURN [raw[0..7], pitch, roll, accel_mag, flex_avg, flex_range]
    // Output: 13-dimensional feature vector
```

---

### 4.2.4. Data Balancing & Augmentation Algorithm

**Purpose:** Ensure equal class representation and improve neural network generalisation.

**Source:** `train.py` — `balance_and_augment()`

**Steps:**
1. Find class with maximum samples (`target_count`)
2. Oversample each minority class by resampling with replacement until `target_count` is reached
3. For every sample, create one augmented copy by adding Gaussian noise

**Pseudocode:**
```
FUNCTION balance_and_augment(dataset):
    target = max(count per class)

    FOR EACH class IN dataset:
        IF count(class) < target:
            class_data = RESAMPLE(class, n=target, replace=True)
        balanced_set.append(class_data)

    FOR EACH (sample, label) IN balanced_set:
        X_out.append(extract_features(sample))          // original
        noise = Normal(mean=0, std=5, size=8)
        X_out.append(extract_features(sample + noise))  // augmented
        y_out.append(label) × 2

    RETURN X_out, y_out   // 2× dataset size, all classes equal
```

---

### 4.2.5. MLP Neural Network Training with Hyperparameter Optimisation

**Purpose:** Train the gesture classifier and automatically find the optimal architecture.

**Source:** `train.py`

**Pipeline:**
```
13-D Feature Vector → StandardScaler → MLPClassifier → Gesture Class
```

**StandardScaler (Z-Score Normalisation):**
```
X_scaled = (X − μ) / σ
```
Ensures all 13 features contribute equally regardless of their raw scale.

**MLP Architecture:**

| Layer | Neurons | Activation |
|---|---|---|
| Input | 13 | — |
| Hidden 1 | 128 | ReLU |
| Hidden 2 | 64 | ReLU |
| Hidden 3 | 32 | ReLU |
| Output | K (gestures) | Softmax |
| **Total params** | **~12,458** | — |

**Single Neuron Computation:**
```
z = Σ(wᵢ × xᵢ) + bias
output = ReLU(z) = max(0, z)
```

**Loss Function (Cross-Entropy):**
```
L = −(1/N) × ΣᵢΣⱼ yᵢⱼ × log(ŷᵢⱼ)
```

**Weight Update (Adam Optimiser):**
```
w_new = w_old − η × (∂L/∂w)
```

**GridSearchCV Hyperparameter Space:**

| Parameter | Values Searched |
|---|---|
| Hidden layers | (128,64,32), (64,64,64), (100,50) |
| Activation | relu, tanh |
| Alpha (L2) | 0.0001, 0.001, 0.01, 0.1 |
| Learning rate | 0.001, 0.005 |
| **Total combos** | **48** |
| **CV folds** | **5 (Stratified K-Fold)** |

**Pseudocode:**
```
FUNCTION train():
    pipeline = [StandardScaler → MLPClassifier(early_stopping=True)]
    param_grid = { hidden_layers, activation, alpha, learning_rate }
    cv = StratifiedKFold(n_splits=5)
    grid = GridSearchCV(pipeline, param_grid, cv)
    grid.fit(X_augmented, y)
    best_model = grid.best_estimator_
    SAVE best_model → gesture_pipeline.pkl
    SAVE label_encoder → label_encoder.pkl
```

---

### 4.2.6. Real-Time Inference & Confidence Gating Algorithm

**Purpose:** Classify incoming sensor frames in real-time and produce spoken output with reliability filtering.

**Source:** `predict.py`, `app.py`

**Confidence Gate:**
```
probabilities = model.predict_proba(features)   // vector of K probs
max_prob = max(probabilities)
IF max_prob ≥ 0.90:
    prediction = class[argmax(probabilities)]
ELSE:
    prediction = "Searching..."
```

**Voice Activation Logic:**
```
IF prediction == "start" AND voice_off → activate voice
IF prediction == "end"   AND voice_on  → deactivate voice
IF voice_on AND prediction is valid:
    IF prediction ≠ last_spoken OR time_since_last > 3s:
        speak(prediction)
```

**Full Per-Frame Pseudocode:**
```
LOOP at ~100 Hz:
    raw[8] = READ(serial)
    raw[5:8] -= calibration_offsets
    smoothed[8] = ema.filter(raw)
    features[13] = extract_features(smoothed)
    probs[K] = pipeline.predict_proba(features)
    max_prob = max(probs)
    IF max_prob >= 0.90:
        gesture = classes[argmax(probs)]
        handle_activation(gesture)
        IF voice_active AND should_speak(gesture):
            os.system("say " + gesture)
    ELSE:
        display("Searching...")
    UPDATE HUD
```

---

## Algorithm Summary Table

| # | Algorithm | Source File | Key Parameters |
|---|---|---|---|
| 1 | Accelerometer Calibration | `data.py`, `predict.py` | N = 30 samples |
| 2 | EMA Noise Filter | `features.py` | α = 0.3 |
| 3 | Feature Engineering | `features.py` | 8 → 13 features (Pitch, Roll, AccMag, FlexAvg, FlexRange) |
| 4 | Data Balancing & Augmentation | `train.py` | σ = 5 (Gaussian), 2× size |
| 5 | MLP Training (GridSearchCV) | `train.py` | 48 combos, 5-fold StratifiedKFold, Adam, CrossEntropy |
| 6 | Real-Time Inference | `predict.py`, `app.py` | 90% confidence threshold, 3s repeat delay |
