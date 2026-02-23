# CheckIT System Instructions

## System Architecture

CheckIT is designed as a distributed system with two roles:

1.  **Central Server (Server):**
    *   Hosts the Database, Admin Panel, and Game Configurations.
    *   Aggregates scores from all terminals.
    *   Manages "Active Competition" state.
    *   **IP Address:** `57.128.247.85` (as configured)

2.  **Game Terminals (Clients / Raspberry Pi):**
    *   Run the Game UI for players.
    *   Control Hardware (Solenoid, Patch Panel) via GPIO.
    *   Sync scores and logs to the Central Server.
    *   **Heartbeat:** Sends a signal every 30s to the Server to say "I'm alive".

---

## Installation & Setup

### 1. Central Server Setup
(*Already configured on 57.128.247.85*)

*   **Backend:** Runs usually on port `8000`.
*   **Frontend:** Runs dev server or built static files.
*   **Role:** Ensure `config.yaml` has `system.platform_role: "server"`.

### 2. Raspberry Pi (Client) Setup

3.  **Run Dedicated RPi Agent:**
    This single script handles dependencies, config, and startup.
    ```bash
    chmod +x start_rpi.sh  # Make executable (one time)
    ./start_rpi.sh
    ```
    *It will automatically install `swig`, `liblgpio`, and fix `config.yaml` to point to the server.*

---

## Troubleshooting

### ⚠️ "RASBERRY PI NOT DETECTED"
If the logs say `Using MOCK GPIO (Simulation Mode)` on a real Pi:
1.  **Fix:** Install the missing library:
    ```bash
    pip install rpi-lgpio
    ```
2.  **Workaround (Force Mode):**
    If it still fails but you want to force the Admin Panel to show "RPi ONLINE":
    ```bash
    export CHECKIT_IS_RPI=true
    ./start.sh
    ```

### 📡 Connection Issues
*   **Check Server:** Open `http://57.128.247.85:8000/health` in a browser.
*   **Check Client Logs:** Look for `Sync Service started` and `Heartbeat success`.
*   **Admin Panel:** The top header should show a **green indicator** with `RPi [checkit-rpi-01]` when the Pi is connected.

---

## Admin Panel Features
*   **Hardware:** Manually trigger Solenoid or view Patch Panel connectivity.
*   **Connected Nodes:** (Top Bar) Shows live status of all connected Game Terminals.
*   **Competition Control:** Start/Stop the competition (blocks games).
*   **Email:** Configure SMTP and send bulk rewards.

---

## Hardware Pin Mapping (Raspberry Pi)

The system is hardcoded to use the following BCM GPIO pins for hardware integration. Ensure your jumpers match this layout.

### LED Strip (WS281x)
*   **Data Pin:** BCM 18 (Physical Pin 12) *Requires PWM support.*

### Solenoid Lock (Relay) & Door Sensor
*   **Solenoid Relay Control:** BCM 26 (Physical Pin 37)
*   **Door Sensor Input:** BCM 12 (Physical Pin 32) *Uses internal Pull-Up resistor. Short to GND to log as CLOSED.*

### Patch Panel (Patch Master Game)
The 8-wire patch cord puzzle relies on pulling inputs to Ground (GND). Connect one side of the patch cord to any GND pin on the Pi, and the other side to the corresponding BCM input pin.

*   **Pair 1:** BCM 17 (Physical Pin 11)
*   **Pair 2:** BCM 27 (Physical Pin 13)
*   **Pair 3:** BCM 22 (Physical Pin 15)
*   **Pair 4:** BCM 10 (Physical Pin 19)
*   **Pair 5:** BCM 9  (Physical Pin 21)
*   **Pair 6:** BCM 11 (Physical Pin 23)
*   **Pair 7:** BCM 5  (Physical Pin 29)
*   **Pair 8:** BCM 6  (Physical Pin 31)
