import asyncio
import logging
from app.hardware.gpio_manager import gpio_manager, GPIO
from app.simple_config import settings

logger = logging.getLogger(__name__)

class Solenoid:
    def __init__(self):
        self.pin = settings.hardware.solenoid_pin
        self.duration = settings.hardware.solenoid_open_time_sec
        self._is_active = False
        
        # Setup GPIO
        gpio_manager.setup_output(self.pin)
        # Ensure it's off initially (assuming HIGH is ON or LOW is ON? Usually relay is Active Low or High. 
        # Standard relay modules are often Active Low. Ssolenoids via MOSFET are Active High.
        # Let's assume Active HIGH for MOSFET solenoid driver.
        gpio_manager.write(self.pin, GPIO.LOW) 
        
        # Command Queue for Agent (Server Mode)
        self._command_queue = []

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
