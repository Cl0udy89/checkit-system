import asyncio
import logging
from app.hardware.gpio_manager import gpio_manager, GPIO
from app.simple_config import settings

logger = logging.getLogger(__name__)

class Solenoid:
    def __init__(self):
        self.pin = settings.hardware.solenoid_pin
        self.sensor_pin = settings.hardware.solenoid_sensor_pin
        self.duration = 1.0 # Forced to 1s safety limit
        self._is_active = False # Tracks if we're sending current
        self._is_open = False   # Tracks physical box state
        self._command_queue = [] # Queue for commands from Server to Agent
        
        # Setup GPIO
        if gpio_manager.is_rpi_mode():
            try:
                gpio_manager.setup_output(self.pin)
                gpio_manager.write(self.pin, GPIO.LOW)
                
                # Setup Sensor Pin (Input with Pull-Up. Assuming it pulls to GND when closed)
                gpio_manager.setup_input(self.sensor_pin, GPIO.PUD_UP)
            except Exception as e:
                logger.error(f"Solenoid/Sensor Init Error: {e}") 
        
        # Remote State Storage (for Server Mode)
        self._remote_state = {
            "is_active": False,
            "is_open": False
        }
        
    def update_remote_state(self, is_active: bool, is_open: bool):
        """Called by the API when Agent sends an update."""
        self._remote_state["is_active"] = is_active
        self._remote_state["is_open"] = is_open

    def get_state(self) -> dict:
        """Returns the local or remote state of the solenoid/box."""
        if not gpio_manager.is_rpi_mode():
            return self._remote_state
            
        # Read physical sensor if we are the RPi
        # Assuming PULL_UP: CLOSED (magnet near) = LOW (0), OPEN (away) = HIGH (1)
        # Note: Depending on reed switch NO/NC this might be inverted. Assuming generic NC door sensor.
        is_open = False
        try:
            sensor_val = gpio_manager.read(self.sensor_pin)
            is_open = (sensor_val == GPIO.HIGH)
            self._is_open = is_open
        except Exception:
            pass
            
        return {
            "is_active": self._is_active,
            "is_open": self._is_open
        }

    def queue_open(self):
        """Called by Server to request open on Agent."""
        self._command_queue.append("OPEN")
        logger.info("Solenoid OPEN command queued for Agent.")

    def pop_pending_command(self) -> str:
        """Called by Agent API to get pending commands."""
        if self._command_queue:
            return self._command_queue.pop(0)
        return None 

    async def open_box(self):
        # Check if we are Server or Client
        if not gpio_manager.is_rpi_mode():
            # Server Mode: Queue command
            self.queue_open()
            return

        # Client Mode: Execute Hardware
        if self._is_active:
            logger.warning("Solenoid trigger requested but already active.")
            return

        logger.info(f"Opening solenoid on PIN {self.pin} for {self.duration}s")
        self._is_active = True
        try:
            # Ensure pin is set up (Safe to call repeatedly)
            gpio_manager.setup_output(self.pin)
            gpio_manager.write(self.pin, GPIO.HIGH)
            # Use asyncio sleep to not block the event loop
            await asyncio.sleep(self.duration)
        except Exception as e:
            logger.error(f"Error during solenoid control: {e}")
        finally:
            logger.info("Closing solenoid.")
            gpio_manager.write(self.pin, GPIO.LOW)
            self._is_active = False

    def force_close(self):
        """Emergency override"""
        gpio_manager.write(self.pin, GPIO.LOW)
        self._is_active = False
        logger.info("Solenoid forced closed.")

solenoid = Solenoid()
