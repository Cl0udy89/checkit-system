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
        self.led_dma = 10       # DMA channel to use for generating signal
        self.led_brightness = 255  # Set to 0 for darkest and 255 for brightest
        self.led_invert = False   # True to invert the signal
        self.led_channel = 0       # set to '1' for GPIOs 13, 19, 41, 45 or 53
        
        self.strip = None
        self.current_state = "blocked" # blocked, animating, solved, manual
        self.color_lib = None
        
        # Admin command queuing
        self._command_queue = []
        self._bg_task = None
        
        if IS_RPI:
            try:
                from rpi_ws281x import PixelStrip, Color
                self.color_lib = Color
                self.strip = PixelStrip(
                    self.led_count, 
                    self.led_pin, 
                    self.led_freq_hz, 
                    self.led_dma, 
                    self.led_invert, 
                    self.led_brightness, 
                    self.led_channel
                )
                self.strip.begin()
                self._set_solid_color("red")
                logger.info("LED Strip initialized (WS281x).")
            except Exception as e:
                logger.error(f"Failed to initialize LED strip: {e}")
                self.strip = None

    def queue_command(self, cmd: str):
        self._command_queue.append(cmd)
        
    def pop_pending_command(self) -> str:
        if self._command_queue:
            return self._command_queue.pop(0)
        return None

    def _cancel_bg(self):
        if self._bg_task and not self._bg_task.done():
            self._bg_task.cancel()

    def play_effect(self, effect_name: str):
        """Called by Server/Agent to override normal behavior"""
        if not self.strip: return
        self._cancel_bg()
        self.current_state = "manual"
        
        if effect_name == "rainbow":
            self._bg_task = asyncio.create_task(self._fx_rainbow())
        elif effect_name == "chase":
            self._bg_task = asyncio.create_task(self._fx_chase())
        elif effect_name == "off":
            self._set_solid_color("black")
        elif effect_name == "red":
            self._set_solid_color("red")
        elif effect_name == "green":
            self._set_solid_color("green")
        elif effect_name == "police":
            self._bg_task = asyncio.create_task(self._fx_police())
        else:
            self.current_state = "blocked"
            self._set_solid_color("red")

    def _set_solid_color(self, color_name):
        if not self.strip or not self.color_lib: return
        Color = self.color_lib
        
        if color_name == "red": color = Color(255, 0, 0)
        elif color_name == "green": color = Color(0, 255, 0)
        elif color_name == "blue": color = Color(0, 0, 255)
        elif color_name == "black": color = Color(0, 0, 0)
        else: color = Color(0, 0, 0)
            
        for i in range(self.strip.numPixels()):
            self.strip.setPixelColor(i, color)
        self.strip.show()

    # --- Effects ---
    def _wheel(self, pos):
        """Generate rainbow colors across 0-255 positions."""
        Color = self.color_lib
        if pos < 85:
            return Color(pos * 3, 255 - pos * 3, 0)
        elif pos < 170:
            pos -= 85
            return Color(255 - pos * 3, 0, pos * 3)
        else:
            pos -= 170
            return Color(0, pos * 3, 255 - pos * 3)
            
    async def _fx_rainbow(self):
        try:
            j = 0
            while True:
                for i in range(self.strip.numPixels()):
                    self.strip.setPixelColor(i, self._wheel((int(i * 256 / self.strip.numPixels()) + j) & 255))
                self.strip.show()
                j = (j + 5) % 256
                await asyncio.sleep(0.05)
        except asyncio.CancelledError:
            pass

    async def _fx_chase(self):
        Color = self.color_lib
        try:
            while True:
                for q in range(3):
                    for i in range(0, self.strip.numPixels(), 3):
                        if i + q < self.strip.numPixels():
                            self.strip.setPixelColor(i + q, Color(255, 255, 255))
                    self.strip.show()
                    await asyncio.sleep(0.1)
                    for i in range(0, self.strip.numPixels(), 3):
                        if i + q < self.strip.numPixels():
                            self.strip.setPixelColor(i + q, 0)
        except asyncio.CancelledError:
            pass
            
    async def _fx_police(self):
        Color = self.color_lib
        try:
            while True:
                # Flash Red
                for _ in range(3):
                    for i in range(self.strip.numPixels()):
                        self.strip.setPixelColor(i, Color(255, 0, 0))
                    self.strip.show()
                    await asyncio.sleep(0.1)
                    self._set_solid_color("black")
                    await asyncio.sleep(0.1)
                # Flash Blue
                for _ in range(3):
                    for i in range(self.strip.numPixels()):
                        self.strip.setPixelColor(i, Color(0, 0, 255))
                    self.strip.show()
                    await asyncio.sleep(0.1)
                    self._set_solid_color("black")
                    await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            pass

    async def trigger_connection_pulse(self):
        """Breathing effect from current to Red"""
        if not self.strip or self.current_state in ["solved", "manual"]:
            return
            
        self._cancel_bg()
        self.current_state = "animating"
        Color = self.color_lib
        
        try:
            for brightness in range(255, -1, -15):
                for i in range(self.strip.numPixels()):
                   self.strip.setPixelColor(i, Color(max(0, brightness), 0, 0))
                self.strip.show()
                await asyncio.sleep(0.01)
                
            for brightness in range(0, 256, 15):
                for i in range(self.strip.numPixels()):
                    self.strip.setPixelColor(i, Color(min(255, brightness), 0, 0))
                self.strip.show()
                await asyncio.sleep(0.01)
        except asyncio.CancelledError:
            pass
        finally:
            if self.current_state == "animating":
                self._set_solid_color("red")
                self.current_state = "blocked"

    def set_solved(self):
        if self.strip and self.current_state != "solved":
            self._cancel_bg()
            self.current_state = "solved"
            self._set_solid_color("green")
            
    def set_blocked(self):
        if self.strip and self.current_state != "blocked":
            self._cancel_bg()
            self.current_state = "blocked"
            self._set_solid_color("red")

led_manager = LEDManager()
