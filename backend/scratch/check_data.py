import pandas as pd
import numpy as np
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from features import extract_features

DATA_PATH = "gesture_data.csv"
if os.path.exists(DATA_PATH):
    df = pd.read_csv(DATA_PATH)
    if not isinstance(df.columns[0], str) or df.columns[0].isdigit():
        df = pd.read_csv(DATA_PATH, header=None)
    X_raw = df.iloc[:, 0:8].values
    
    X_extracted = []
    for x in X_raw:
        X_extracted.append(extract_features(x))
    
    X_extracted = np.array(X_extracted)
    print(f"Shape: {X_extracted.shape}")
    print(f"NaN count: {np.isnan(X_extracted).sum()}")
    print(f"Inf count: {np.isinf(X_extracted).sum()}")
    
    print("\nFeature stats:")
    for i, name in enumerate(extract_features(X_raw[0])):
        feat_col = X_extracted[:, i]
        print(f"Feature {i}: min={np.min(feat_col):.2f}, max={np.max(feat_col):.2f}, mean={np.mean(feat_col):.2f}")
else:
    print("File not found")
