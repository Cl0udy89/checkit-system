import logging
import platform

logger = logging.getLogger(__name__)

# Mock GPIO for non-RPi development
class MockGPIO:
    BCM = "BCM"
    IN = "IN"
    OUT = "OUT"
    HIGH = 1
    LOW = 0
    PUD_UP = "PUD_UP"
    PUD_DOWN = "PUD_DOWN"

    @staticmethod
    def setmode(mode):
        logger.debug(f"[MockGPIO] Set mode: {mode}")

    @staticmethod
    def setup(pin, mode, pull_up_down=None):
        logger.debug(f"[MockGPIO] Setup Pin {pin} as {mode} (PUD={pull_up_down})")

    @staticmethod
    def output(pin, state):
        logger.debug(f"[MockGPIO] Output Pin {pin} -> {state}")

    @staticmethod
    def input(pin):
        # Default to HIGH (Not connected) for PULL_UP
        # We can implement a state store here if we want to simulate connections later via API
        return 1 

    @staticmethod
    def cleanup():
        logger.debug("[MockGPIO] Cleanup")

    @staticmethod
    def setwarnings(flag):
        pass

import os

# Check if RPi mode is forced via environment variable
FORCE_RPI = os.environ.get("CHECKIT_IS_RPI", "false").lower() == "true"

try:
    import RPi.GPIO as GPIO
    logger.info("✅ RASBERRY PI DETECTED: RPi.GPIO imported successfully. Hardware control ENABLED.")
    IS_RPI = True
except (ImportError, RuntimeError):
    if FORCE_RPI:
        logger.error("🚨 FORCE RPi MODE ENABLED but 'RPi.GPIO' is missing!")
        logger.error("👉 To fix: Run 'pip install rpi-lgpio' (recommended for Pi 5/Bookworm) or 'pip install RPi.GPIO'")
        logger.warning("⚠️ Falling back to MOCK GPIO because library is missing, despite FORCE_RPI=true.")
    else:
        logger.warning("⚠️  RASBERRY PI NOT DETECTED: RPi.GPIO not found. Using MOCK GPIO (Simulation Mode).")
    
    GPIO = MockGPIO()
    # If forced, we MIGHT want to set IS_RPI=True to trick the UI, 
    # but hardware won't work. The user requested "let me specify".
    # So we set IS_RPI = FORCE_RPI, but use MockGPIO to prevent crash.
    IS_RPI = FORCE_RPI

class GPIOManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GPIOManager, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def initialize(self):
        if not self.initialized:
            GPIO.setwarnings(False)
            GPIO.setmode(GPIO.BCM)
            self.initialized = True
            logger.info("GPIO Initialized (BCM mode).")

    def cleanup(self):
        GPIO.cleanup()
        self.initialized = False
        logger.info("GPIO Cleaned up.")

    # Expose GPIO methods directly or wrap them? 
    # Let's verify we are using the singleton wrapping or direct access.
    # For now, let's expose the library object to consumers via a property or just wrap calls.
    # Wrapping calls is safer for maintaing the abstraction.
    
    def setup_input(self, pin: int, pull_up_down=GPIO.PUD_UP):
        self.initialize()
        GPIO.setup(pin, GPIO.IN, pull_up_down=pull_up_down)

    def setup_output(self, pin: int):
        self.initialize()
        GPIO.setup(pin, GPIO.OUT)

    def read(self, pin: int) -> int:
        return GPIO.input(pin)

    def write(self, pin: int, state: int):
        GPIO.output(pin, state)

    def is_rpi_mode(self) -> bool:
        return IS_RPI

gpio_manager = GPIOManager()
