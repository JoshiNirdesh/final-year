## SYSTEM ARCHITECTURE
flowchart TD
    subgraph HW["HARDWARE LAYER"]
        F1["Flex Sensor 1<br/>Thumb"]
        F2["Flex Sensor 2<br/>Index"]
        F3["Flex Sensor 3<br/>Middle"]
        F4["Flex Sensor 4<br/>Ring"]
        F5["Flex Sensor 5<br/>Pinky"]
        MPU["MPU6050<br/>Accelerometer<br/>AcX, AcY, AcZ"]
        ARD["Arduino Uno<br/>ATmega328P<br/>16 MHz"]

        F1 -->|"Analog ADC 0–1023"| ARD
        F2 -->|"Analog ADC 0–1023"| ARD
        F3 -->|"Analog ADC 0–1023"| ARD
        F4 -->|"Analog ADC 0–1023"| ARD
        F5 -->|"Analog ADC 0–1023"| ARD
        MPU -->|"I2C Sensor Data"| ARD
    end

    ARD -->|"USB Serial Communication<br/>115200 baud<br/>F1,F2,F3,F4,F5,Ax,Ay,Az"| SERIAL

    subgraph ML["INTELLIGENCE LAYER "]
    
    
        SERIAL["Serial Reader<br/>pyserial readline()"]
        CAL["Calibration<br/>Remove MPU6050 base offsets"]
        EMA["Signal Smoothing<br/>EMA Filter"]
        FE["Feature Engineering<br/>Flex + Motion Features"]
        SC["Data Scaling<br/>StandardScaler"]
        MLP["MLP Neural Network<br/>Gesture Classification"]
        CG["Confidence Gate<br/>Accept / Searching"]

        SERIAL --> CAL --> EMA --> FE --> SC --> MLP --> CG
    end

    subgraph OUT["OUTPUT LAYER"]
        SPEECH["Text-to-Speech<br/>macOS say"]
        HUD["Terminal HUD<br/>Live Sensor Display"]
        API["Flask REST API<br/>localhost:5001"]
        BROWSER["React Web Dashboard<br/>Real-Time UI"]

        CG -->|"Predicted Gesture"| SPEECH
        CG -->|"Sensor + Confidence"| HUD
        CG -->|"JSON Response"| API
        API --> BROWSER
    end
    