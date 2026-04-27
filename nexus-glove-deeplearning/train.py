import pandas as pd
import numpy as np
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils import resample
from features import extract_features, get_feature_names
import config
import os

# ── 1. LOAD DATA ──────────────────────────────────────────
DATA_PATH = "gesture_data.csv"
print(f"🚀 Loading data from {DATA_PATH}...")
try:
    df = pd.read_csv(DATA_PATH, header=None)
except Exception as e:
    print(f"❌ Error loading CSV: {e}")
    exit()

# ── 2. DATA CLEANING ──────────────────────────────────────
initial_count = len(df)
df = df.drop_duplicates()
print(f"🧹 Removed {initial_count - len(df)} duplicate rows.")

# Extract raw X and y
# Assuming columns 0-7 are sensors, column 8 is the label
X_raw = df.iloc[:, 0:8].values   
y_raw = df.iloc[:, 8].to_numpy(dtype=str)

# Encode labels
le = LabelEncoder()
y_encoded = le.fit_transform(y_raw)
joblib.dump(le, config.LABEL_ENCODER_FILE)
print(f"🏷️  Classes detected: {list(le.classes_)}")

# ── 3. DATA BALANCING & AUGMENTATION ───────────────────────
print("⚖️  Balancing and Augmenting dataset for Neural Network...")

def balance_and_augment(df_raw):
    counts = df_raw[8].value_counts()
    target_count = counts.max()
    
    balanced_dfs = []
    for label in counts.index:
        label_df = df_raw[df_raw[8] == label]
        if len(label_df) < target_count:
            label_df = resample(label_df, replace=True, n_samples=target_count, random_state=42)
        balanced_dfs.append(label_df)
    
    df_balanced = pd.concat(balanced_dfs)
    X_bal = df_balanced.iloc[:, 0:8].values
    y_bal = df_balanced.iloc[:, 8].values
    
    X_final, y_final = [], []
    for x, y_label in zip(X_bal, y_bal):
        # 1. Original
        X_final.append(extract_features(x))
        y_final.append(y_label)
        
        # 2. Augmented (Noise/Jitter) - crucial for NNs
        noise = np.random.normal(0, 5, x.shape)
        X_final.append(extract_features(x + noise))
        y_final.append(y_label)
        
    return np.array(X_final), np.array(y_final)

X_aug, y_aug_labels = balance_and_augment(df)
y_aug = le.transform(y_aug_labels)
feature_names = get_feature_names()
print(f"📊 Final Dataset: {len(X_aug)} samples, {X_aug.shape[1]} features.")

# ── 4. BUILD NEURAL NETWORK PIPELINE ──────────────────────
# MLPClassifier requires scaling (StandardScaler) for convergence
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('mlp', MLPClassifier(
        max_iter=1000, 
        random_state=42, 
        early_stopping=True,
        validation_fraction=0.1
    ))
])

# ── 5. HYPERPARAMETER TUNING ──────────────────────────────
# Tuning layers, activation, and alpha (regularization)
param_grid = {
    'mlp__hidden_layer_sizes': [(128, 64, 32), (64, 64, 64), (100, 50)],
    'mlp__activation': ['relu', 'tanh'],
    'mlp__alpha': [0.0001, 0.001, 0.01, 0.1],
    'mlp__learning_rate_init': [0.001, 0.005]
}

print("\n🧠 Training Neural Network with GridSearchCV...")
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
grid_search = GridSearchCV(pipeline, param_grid, cv=cv, n_jobs=-1, verbose=1)
grid_search.fit(X_aug, y_aug)

best_pipeline = grid_search.best_estimator_
print(f"✅ Best NN Params: {grid_search.best_params_}")

# ── 6. EVALUATION ──────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(X_aug, y_aug, test_size=0.2, random_state=42, stratify=y_aug)
best_pipeline.fit(X_train, y_train)
y_pred = best_pipeline.predict(X_test)

print("\n📈 Neural Network Performance:")
print(classification_report(y_test, y_pred, target_names=le.classes_))

# Confusion Matrix
plt.figure(figsize=(10, 8))
cm = confusion_matrix(y_test, y_pred)
sns.heatmap(cm, annot=True, fmt='d', xticklabels=le.classes_, yticklabels=le.classes_, cmap='Purples')
plt.title('Neural Network: Gesture Confusion Matrix')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.savefig('confusion_matrix_nn.png')
print("🖼️  Saved confusion_matrix_nn.png")

# 6b. Scientific Analytics: Feature Correlation
plt.figure(figsize=(12, 10))
df_features = pd.DataFrame(X_aug, columns=feature_names)
corr = df_features.corr()
sns.heatmap(corr, annot=False, cmap='coolwarm')
plt.title('Feature Correlation Matrix (Sensor Relationships)')
plt.savefig('feature_correlation.png')
print("📈 Saved feature_correlation.png")

# 6c. Learning Curve (Loss over time)
# Note: MLPClassifier with early_stopping saves loss_curve_ if we train on the whole set or manually
plt.figure(figsize=(10, 5))
mlp_model = best_pipeline.named_steps['mlp']
plt.plot(mlp_model.loss_curve_)
plt.title('Neural Network Training Loss Curve')
plt.xlabel('Iterations')
plt.ylabel('Loss (Error Rate)')
plt.grid(True)
plt.savefig('learning_curve.png')
print("📉 Saved learning_curve.png")

# ── 7. SAVE FULL-FLEDGED MODEL ────────────────────────────
print(f"💾 Saving Neural Network pipeline to {config.MODEL_FILE}...")
joblib.dump(best_pipeline, config.MODEL_FILE)
print("\n✨ FULL-FLEDGED NEURAL NETWORK SYSTEM READY!")
