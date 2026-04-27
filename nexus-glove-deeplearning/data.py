import serial
import serial.tools.list_ports
import csv
import time
import sys
import os
import shutil
from datetime import datetime
import config

def find_arduino_port():
    """Find the Arduino port with an interactive fallback."""
    ports = list(serial.tools.list_ports.comports())
    # 1. Try Auto-Discovery
    for p in ports:
        port_desc = (p.description + " " + p.device).lower()
        if any(keyword in port_desc for keyword in config.PORT_SEARCH_KEYWORDS):
            return p.device
            
    # 2. Fallback: Manual Selection
    if not ports:
        return None
        
    print("\n⚠️  No glove found automatically. Please select from available ports:")
    for i, p in enumerate(ports):
        print(f"  [{i}] {p.device} ({p.description})")
    
    try:
        idx = int(input(f"\nSelect port index (0-{len(ports)-1}): "))
        return ports[idx].device
    except:
        return None

def is_float(value):
    try:
        float(value)
        return True
    except ValueError:
        return False

def create_backup():
    """Create a backup of the current dataset."""
    if os.path.exists(config.CSV_FILE):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"backup_{config.CSV_FILE}_{timestamp}.csv"
        shutil.copy2(config.CSV_FILE, backup_name)
        print(f"💾 Safety Backup created: {backup_name}")

def live_monitor(ser):
    """Show a live preview of sensor data to ensure everything is working."""
    print("\n--- LIVE MONITOR (Press Ctrl+C to stop preview) ---")
    print("F1   F2   F3   F4   F5   AccX  AccY  AccZ")
    try:
        while True:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line: continue
            vals = line.split(",")
            if len(vals) >= 8:
                formatted = " ".join([f"{v.strip():>4}" for v in vals[:8]])
                print(f"\r{formatted}", end="", flush=True)
    except KeyboardInterrupt:
        print("\n--- Monitoring Stopped ---\n")

# --- Main Setup ---
create_backup()

port = find_arduino_port()
if not port:
    print("❌ Error: No port selected or found. Exiting.")
    sys.exit()

print(f"Connecting to {port} at {config.SERIAL_BAUD} baud...")
try:
    ser = serial.Serial(port, config.SERIAL_BAUD, timeout=1)
    time.sleep(2)
    ser.reset_input_buffer()
except Exception as e:
    print(f"❌ Connection Error: {e}")
    sys.exit()

# Optional Monitor
choice = input("Do you want to see a live sensor preview first? (y/n): ").strip().lower()
if choice == 'y':
    live_monitor(ser)

print("\n--- SYSTEM CALIBRATION ---")
print("[!] Keep hand still in 'neutral' position.")
input("Press ENTER to start calibration...")

print("Calibrating...")
base_ax, base_ay, base_az = 0.0, 0.0, 0.0
calib_count = 0
ser.reset_input_buffer()

while calib_count < config.CALIBRATION_SAMPLES:
    line = ser.readline().decode('utf-8', errors='ignore').strip()
    if not line: continue
    values = line.split(",")
    if len(values) >= 8 and all(is_float(v.strip()) for v in values[:8]):
        base_ax += float(values[5]); base_ay += float(values[6]); base_az += float(values[7])
        calib_count += 1

base_ax /= float(config.CALIBRATION_SAMPLES)
base_ay /= float(config.CALIBRATION_SAMPLES)
base_az /= float(config.CALIBRATION_SAMPLES)
print(f"🎯 Calibration Complete: [{base_ax:.1f}, {base_ay:.1f}, {base_az:.1f}]")

while True:
    print("\n" + "="*50)
    gesture_label = input("Enter gesture label (or 'exit'): ").strip()
    if gesture_label.lower() == 'exit': break
    if not gesture_label: continue

    REQUIRED_FRAMES = 1200
    input(f"\n[?] Ready for '{gesture_label}'? Press ENTER to record...")
    
    # 🔔 Start Beep
    print("\a", end="") 
    print(f"---> RECORDING '{gesture_label}' NOW! <---")
    
    ser.reset_input_buffer()
    start_time = time.time()
    record_count = 0
    
    with open(config.CSV_FILE, "a", newline="") as f:
        writer = csv.writer(f)
        while record_count < REQUIRED_FRAMES:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line: continue
            
            values = line.split(",")
            if len(values) >= 8 and all(is_float(v.strip()) for v in values[:8]):
                row = [
                    float(values[0]), float(values[1]), float(values[2]), float(values[3]), float(values[4]),
                    round(float(values[5]) - base_ax, 1),
                    round(float(values[6]) - base_ay, 1),
                    round(float(values[7]) - base_az, 1),
                    gesture_label
                ]
                writer.writerow(row)
                record_count += 1
                
                if record_count % 50 == 0:
                    hz = record_count / (time.time() - start_time)
                    print(f"Recording... {record_count}/{REQUIRED_FRAMES} | Speed: {hz:.1f} Hz", end="\r")
    
    # 🔔 End Beep
    print("\a", end="")
    print(f"\n[✓] Done! Saved to {config.CSV_FILE}")

print("\nSession Complete. Goodbye!")
