# System Architecture
## An AI Powered Wearable Gesture Interpretation System for Real-Time Sign to Speech Translation

The architecture of this system is designed to make the gesture recognition pipeline
modular, reliable, and intelligent. It combines wearable hardware, real-time signal
processing, deep learning classification, and a speech output interface. Here is how the
system is laid out:

---

## Dataset

The dataset used in this project was collected manually using the custom-built Nexus Glove
hardware. Unlike publicly available image-based sign language datasets, this project required
original sensor data because the system relies on physical flex sensor and accelerometer
readings rather than visual input.

Data was collected using the `data.py` script, which connects to the Arduino over USB
serial and records live sensor readings while the user performs each gesture. For each
gesture label, **1,200 frames** of sensor data were recorded at approximately 100 Hz. The
raw data is stored in `gesture_data.csv` with the following structure:

**Fields in gesture_data.csv:**

- **Flex1 – Flex5:** Analog readings from each of the five flex sensors (one per finger),
  ranging from 0 to 1023 based on the degree of finger bend.
- **AccX, AccY, AccZ:** Raw accelerometer values from the MPU6050 sensor along the
  X, Y, and Z axes, representing the orientation and motion of the hand.
- **Label:** The gesture class name (e.g., "hello", "water", "yes") corresponding to the
  hand pose being recorded.

This structured dataset served as the foundation for training the Multi-Layer Perceptron
(MLP) neural network. To improve model generalization and handle class imbalance,
the dataset was preprocessed using two techniques. First, minority classes were
oversampled to match the largest class size. Second, Gaussian noise augmentation
(mean = 0, standard deviation = 5) was applied to each sample, creating one additional
synthetic copy per frame and effectively doubling the dataset size. The final augmented
dataset used for training contains **4,704 test samples** with a resulting test accuracy
of **97%**.

---

## Hardware Layer – Wearable Glove

The user starts by wearing the Nexus Glove and performing a hand gesture. The glove
contains five flex sensors — one on each finger — and an MPU6050 accelerometer/gyroscope
module mounted on the back of the hand.

Each flex sensor acts as a variable resistor. When a finger is straight, the resistance is
low (~10 kΩ) and the Arduino reads a low analog value (approximately 200). When a finger
is bent, the carbon particles in the sensor spread apart, increasing resistance (~30 kΩ)
and producing a high analog value (approximately 700). The Arduino's 10-bit
Analog-to-Digital Converter (ADC) converts this resistance into an integer in the range
0 to 1023.

The MPU6050 uses a microscopic MEMS (Micro-Electro-Mechanical Systems) structure — a
tiny silicon mass suspended by springs — to detect the direction and force of gravity.
This displacement is converted into a 16-bit signed integer (−32,768 to +32,767) for
each of the three axes (X, Y, Z), representing the hand's tilt and orientation.

The Arduino Uno reads all eight sensor values and transmits them as a comma-separated
string over USB at 115,200 baud, approximately 100 times per second:

```
420,380,510,290,600,1200,-340,16400
 F1  F2  F3  F4  F5  AcX  AcY  AcZ
```

---

## Intelligence Layer – Signal Processing and Deep Learning (Python)

Once the sensor data is received by the laptop, it passes through a six-stage processing
pipeline implemented in Python:

**i. Serial Reader (pyserial):**
The Python `pyserial` library continuously reads the incoming CSV string from the
Arduino's serial port. Each line is parsed into a list of eight numeric values.

**ii. Accelerometer Calibration:**
At startup, 30 frames of sensor data are collected while the hand is held still in the
neutral position. The mean of the accelerometer readings is computed and stored as a
baseline offset. All subsequent accelerometer values have this offset subtracted so that
readings represent relative hand motion rather than absolute gravity, ensuring consistent
predictions across different users and orientations.

**iii. EMA Signal Smoothing (`features.py` – EMAFilter):**
Raw sensor data contains electrical noise and random fluctuations. Even when the hand
is completely still, the sensor values vary between frames. The Exponential Moving Average
(EMA) filter addresses this by applying the formula:

```
S(t) = α × X(t) + (1 − α) × S(t−1)     where α = 0.3
```

With a smoothing factor of 0.3, each new reading contributes 30% and the historical
average contributes 70%, producing a stable and responsive signal suitable for neural
network input.

**iv. Feature Engineering (`features.py` – extract_features):**
The eight smoothed sensor values are transformed into a richer 13-dimensional feature
vector. Five additional features are derived:

- **Pitch:** Forward and backward hand tilt in degrees, computed using `atan2(ay, √(ax²+az²)) × 180/π`
- **Roll:** Left and right hand tilt in degrees, computed using `atan2(−ax, az) × 180/π`
- **Acceleration Magnitude:** Overall motion intensity, computed as `√(ax²+ay²+az²)`
- **Flex Average:** Mean of all five flex sensor values, representing overall grip tightness
- **Flex Range:** Difference between the maximum and minimum flex values, indicating finger spread

These engineered features significantly improve the model's ability to distinguish between
gestures that may have similar raw sensor values but different hand orientations.

**v. StandardScaler (Normalization):**
Flex sensors output values between 0 and 1,023, while the accelerometer produces values
between −32,768 and +32,767. Without normalization, the neural network would be
dominated by the larger accelerometer values. The StandardScaler applies Z-score
normalization to each feature:

```
X_scaled = (X − mean) / standard_deviation
```

This transforms all features to have a mean of 0 and a standard deviation of 1, ensuring
each of the 13 features contributes equally during training and inference.

**vi. MLP Neural Network (GesturePipeline – `gesture_pipeline.pkl`):**
The normalized 13-dimensional feature vector is passed to a Multi-Layer Perceptron (MLP)
classifier. The optimal architecture was determined automatically using GridSearchCV,
which evaluated 48 combinations of hyperparameters across 5-fold Stratified
Cross-Validation. The best-performing architecture consists of three hidden layers with
128, 64, and 32 neurons respectively, using ReLU activation. The output layer uses
Softmax to convert raw scores into a probability distribution over all gesture classes:

```
INPUT (13) → Layer 1 (128, ReLU) → Layer 2 (64, ReLU) → Layer 3 (32, ReLU) → OUTPUT (K, Softmax)
```

The model contains approximately 12,458 learned parameters stored in `gesture_pipeline.pkl`.

---

## Confidence Gate – Reliability Filtering

After the neural network outputs a probability distribution over all gesture classes, the
system applies a confidence threshold to ensure reliable predictions. If the highest
predicted probability is greater than or equal to **90%**, the gesture is accepted and
passed to the output layer. If the confidence is below 90% — which typically occurs
during hand transitions between gestures — the system displays "Searching..." and does
not produce any output. This prevents false positives and ensures the user only hears
words the system is confident about.

---

## Output Layer – Speech and Dashboard

Once a gesture is accepted with sufficient confidence, the system produces output through
two interfaces:

**i. Speech Engine (Terminal Mode – `predict.py`):**
The predicted gesture label is passed to the macOS built-in `say` command, which converts
the text to spoken audio through the system speaker. A voice activation system is also
implemented — the system only speaks when it is in the "active" state, which is toggled
by performing the designated "start" and "end" gestures. A 3-second repeat delay prevents
the same gesture from being spoken repeatedly while the hand is held in position.

**ii. Web Dashboard (API Mode – `app.py`):**
For visual monitoring and remote control, a Flask REST API runs on `localhost:5001`. The
API continuously reads from the Arduino serial port in a background thread and exposes
the following endpoints:

- `GET /predict` — Returns the current gesture, confidence percentage, flex sensor values,
  and accelerometer readings as a JSON response.
- `POST /recalibrate` — Triggers a new accelerometer calibration cycle.
- `POST /retrain` — Executes `train.py` as a subprocess to retrain the neural network with
  updated data and reload the new model.
- `GET /health` — Returns the current connection status of the glove.

The web frontend polls this API and displays the gesture predictions, sensor data, and
confidence levels in a real-time visual dashboard.

---

## System Output

Once the final response is prepared — whether spoken audio or a JSON response to the
dashboard — it is delivered to the user in under **50 milliseconds** from the moment the
gesture is performed. The system then continues monitoring the serial stream and is
immediately ready to classify the next gesture, making the interaction feel natural and
seamless for the user.
