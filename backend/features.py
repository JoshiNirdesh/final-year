import numpy as np

class EMAFilter:
    def __init__(self, alpha=0.3):
        self.alpha = alpha
        self.state = None

    def filter(self, data):
        if self.state is None:
            self.state = np.array(data)
        else:
            self.state = self.alpha * np.array(data) + (1 - self.alpha) * self.state
        return self.state

def extract_features(row, calibration=None):
    """
    Extract PROFESSIONAL features including Hand Orientation (Pitch/Roll).
    Row: [f1, f2, f3, f4, f5, ax, ay, az]
    """
    row_np = np.array(row, dtype=float)
    flex = row_np[0:5]
    accel = row_np[5:8]
    
    # 1. Normalization (DISABLED: Let StandardScaler handle this)
    # if calibration and 'min' in calibration and 'max' in calibration:
    #     flex_min = np.array(calibration['min'])
    #     flex_max = np.array(calibration['max'])
    #     flex = np.clip((flex - flex_min) / (flex_max - flex_min + 1e-6), 0, 1)
    #     row_np[0:5] = flex

    # 2. Physics: Pitch & Roll (Hand Orientation in degrees)
    # Pitch: Angle around X axis
    # Roll: Angle around Y axis
    ax, ay, az = accel
    pitch = np.arctan2(ay, np.sqrt(ax**2 + az**2)) * 180 / np.pi
    roll = np.arctan2(-ax, az) * 180 / np.pi
    
    # 3. Stats
    flex_avg = np.mean(flex)
    flex_range = np.max(flex) - np.min(flex)
    accel_mag = np.linalg.norm(accel)
    
    # 4. Final Feature Vector (8 raw + 5 new = 13 features)
    features = list(row_np) + [pitch, roll, accel_mag, flex_avg, flex_range]
    return np.array(features)

def get_feature_names():
    return [
        'Flex1', 'Flex2', 'Flex3', 'Flex4', 'Flex5', 
        'AccX', 'AccY', 'AccZ', 
        'Pitch', 'Roll', 'AccMag', 'FlexAvg', 'FlexRange'
    ]
