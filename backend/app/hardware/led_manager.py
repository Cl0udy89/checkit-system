import logging
import asyncio
import time
from app.simple_config import settings
from app.hardware.gpio_manager import IS_RPI

logger = logging.getLogger(__name__)

class LEDManager:
    def __init__(self):
        self.led_count = 8      # Number of LED pixels.
        self.led_pin = 18       # GPIO pin connected to the pixels (18 uses PWM!).
        self.led_freq_hz = 800000  # LED signal frequency in hertz (usually 800khz)
        self.led_dma = 10       # DMA channel to use for generating signal (try 10)
        self.led_brightness = 255  # Set to 0 for darkest and 255 for brightest
        self.led_invert = False   # True to invert the signal (when using NPN transistor level shift)
        self.led_channel = 0       # set to '1' for GPIOs 13, 19, 41, 45 or 53
        
        self.strip = None
        
        # Current state mapping
        self.current_state = "blocked" # blocked, animating, solved
        
        if IS_RPI:
            try:
                from rpi_ws281x import PixelStrip, Color
                # Create NeoPixel object with appropriate configuration.
                self.strip = PixelStrip(
                    self.led_count, 
                    self.led_pin, 
                    self.led_freq_hz, 
                    self.led_dma, 
                    self.led_invert, 
                    self.led_brightness, 
                    self.led_channel
                )
                # Intialize the library (must be called once before other functions).
                self.strip.begin()
                self._set_solid_color("red")
                logger.info("LED Strip initialized (WS281x).")
            except Exception as e:
                logger.error(f"Failed to initialize LED strip: {e}")
                self.strip = None

    def _set_solid_color(self, color_name):
        if not self.strip:
            return
            
        from rpi_ws281x import Color
        if color_name == "red":
            color = Color(255, 0, 0)
        elif color_name == "green":
            color = Color(0, 255, 0)
        elif color_name == "black":
            color = Color(0, 0, 0)
        else:
            color = Color(0, 0, 0)
            
        for i in range(self.strip.numPixels()):
            self.strip.setPixelColor(i, color)
        self.strip.show()

    async def trigger_connection_pulse(self):
        """Breathing effect from Red to Black and back to Red."""
        if not self.strip or self.current_state == "solved":
            return
            
        self.current_state = "animating"
        from rpi_ws281x import Color
        
        # Fade Out (Red to Black)
        for brightness in range(255, -1, -10):
            if self.current_state == "solved": # Interrupt if solved mid-animation
                return
            for i in range(self.strip.numPixels()):
                # rpi_ws281x Color takes (R, G, B) or (G, R, B) depending on the strip, usually (R,G,B) is GRB internally but library handles it.
                # Just scale the R value
                self.strip.setPixelColor(i, Color(max(0, brightness), 0, 0))
            self.strip.show()
            await asyncio.sleep(0.01)
            
        # Fade In (Black to Red)
        for brightness in range(0, 256, 10):
            if self.current_state == "solved":
                return
            for i in range(self.strip.numPixels()):
                self.strip.setPixelColor(i, Color(min(255, brightness), 0, 0))
            self.strip.show()
            await asyncio.sleep(0.01)
            
        # Ensure it's fully red at the end
        if self.current_state != "solved":
            self._set_solid_color("red")
            self.current_state = "blocked"

    def set_solved(self):
        """Set to solid green."""
        if self.strip and self.current_state != "solved":
            self.current_state = "solved"
            self._set_solid_color("green")
            
    def set_blocked(self):
        """Set to solid red."""
        if self.strip and self.current_state != "blocked":
            self.current_state = "blocked"
            self._set_solid_color("red")

led_manager = LEDManager()
