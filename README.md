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
