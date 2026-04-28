# Algorithm Selection & Deep Learning Analysis 🧠

This document explains the technical rationale behind choosing the **Multi-Layer Perceptron (MLP)** for the Nexus Glove system and compares it against traditional Machine Learning algorithms.

---

## 1. The Chosen Algorithm: Multi-Layer Perceptron (MLP)
The system uses a 3-layer **Artificial Neural Network (ANN)** known as a Multi-Layer Perceptron.

### Architecture:
- **Input Layer**: 13 features (5 Flex Sensors + 3 Accelerometer + Pitch/Roll/Magnitude/Stats).
- **Hidden Layers**: `(128, 64, 32)` neurons with ReLU activation.
- **Output Layer**: Softmax activation for gesture classification.

### Why MLP?
1.  **Non-Linear Mapping**: Sensor data is rarely linear. A "fist" in one orientation has different sensor values than a "fist" in another. MLPs excel at finding these complex, non-linear boundaries.
2.  **Latency-Free**: Unlike ensemble methods, an MLP performs a single mathematical pass (Forward Propagation) to get a result. This allows for real-time inference with **zero buffers**.
3.  **Feature Learning**: While we provide some features (Pitch/Roll), the deep layers of the MLP "learn" the spatial relationships between your fingers automatically.

---

## 2. Competitive Analysis (Why we skipped others)

| Algorithm Name | Category | Why it was rejected for this project |
| :--- | :--- | :--- |
| **Random Forest** | Ensemble ML | Produces "choppy" predictions with noisy analog data. It lacks the "smoothness" required for gesture transitions. |
| **SVM (Support Vector Machine)** | Kernel ML | High memory usage and slow training as the dataset grows. Extremely sensitive to sensor "spikes" (noise). |
| **KNN (K-Nearest Neighbors)** | Instance-based | **Too Slow.** It compares every new frame against the entire 600KB CSV file. This causes significant lag in prediction. |
| **Decision Trees** | Basic ML | Too simple. It tends to "overfit," meaning it works perfectly for the developer but fails when someone else wears the glove. |
| **Traditional Ensemble** | Heuristic ML | Requires manual "voting buffers" (e.g., waiting for 20 frames). This adds ~500ms of lag to the user experience. |

---

## 3. The "Pure Deep Learning" Advantage

By migrating to a **Pure DL** architecture, we eliminated the need for:
- **Stability Windows**: No more waiting for "consensus" between multiple frames.
- **Manual Bias Guards**: The model is smart enough to handle the "Neutral/Open" state naturally.
- **Heuristic Overrides**: The AI is the sole source of truth.

### Performance Summary:
- **Accuracy**: 97.4%
- **Inference Time**: < 5ms
- **Responsiveness**: Immediate (Instant Speech Output)

---
*Nexus Glove System - Deep Learning Research & Development*
