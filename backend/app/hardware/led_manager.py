import logging
import asyncio
import time
from app.simple_config import settings
from app.hardware.gpio_manager import IS_RPI

logger = logging.getLogger(__name__)

class LEDManager:
    def __init__(self):
        self.led_count = 87     # Number of LED pixels.
        self.led_pin = 18       # GPIO pin connected to the pixels
        self.led_brightness = 255  # Set to 0 for darkest and 255 for brightest
        
        self.strip = None
        self.current_state = "blocked" # blocked, animating, solved, manual
        
        # Admin command queuing
        self._command_queue = []
        self._bg_task = None
        
        if IS_RPI:
            try:
                import board
                import neopixel
                self.strip = neopixel.NeoPixel(
                    board.D18, 
                    self.led_count, 
                    brightness=self.led_brightness / 255.0, 
                    auto_write=False,
                    pixel_order=neopixel.GRB
                )
                self._set_solid_color("red")
                logger.info("LED Strip initialized (NeoPixel).")
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
        elif effect_name == "timeout_red":
            self._bg_task = asyncio.create_task(self._fx_timeout_red())
        elif effect_name.startswith("#") and len(effect_name) == 7:
            try:
                r = int(effect_name[1:3], 16)
                g = int(effect_name[3:5], 16)
                b = int(effect_name[5:7], 16)
                self._set_solid_color((r, g, b))
            except ValueError:
                self.current_state = "blocked"
                self._set_solid_color("red")
        else:
            self.current_state = "blocked"
            self._set_solid_color("red")

    def _set_solid_color(self, color_name):
        if not self.strip: return
        
        if isinstance(color_name, tuple) and len(color_name) == 3:
            color = color_name
        elif color_name == "red": color = (255, 0, 0)
        elif color_name == "green": color = (0, 255, 0)
        elif color_name == "blue": color = (0, 0, 255)
        elif color_name == "black": color = (0, 0, 0)
        else: color = (0, 0, 0)
            
        self.strip.fill(color)
        self.strip.show()

    # --- Effects ---
    def _wheel(self, pos):
        """Generate rainbow colors across 0-255 positions."""
        if pos < 85:
            return (int(pos * 3), int(255 - pos * 3), 0)
        elif pos < 170:
            pos -= 85
            return (int(255 - pos * 3), 0, int(pos * 3))
        else:
            pos -= 170
            return (0, int(pos * 3), int(255 - pos * 3))
            
    async def _fx_rainbow(self):
        try:
            j = 0
            while True:
                for i in range(self.led_count):
                    self.strip[i] = self._wheel((int(i * 256 / self.led_count) + j) & 255)
                self.strip.show()
                j = (j + 5) % 256
                await asyncio.sleep(0.05)
        except asyncio.CancelledError:
            pass

    async def _fx_chase(self):
        try:
            while True:
                for q in range(3):
                    for i in range(0, self.led_count, 3):
                        if i + q < self.led_count:
                            self.strip[i + q] = (255, 255, 255)
                    self.strip.show()
                    await asyncio.sleep(0.1)
                    for i in range(0, self.led_count, 3):
                        if i + q < self.led_count:
                            self.strip[i + q] = (0, 0, 0)
        except asyncio.CancelledError:
            pass
            
    async def _fx_police(self):
        try:
            while True:
                # Flash Red
                for _ in range(3):
                    self.strip.fill((255, 0, 0))
                    self.strip.show()
                    await asyncio.sleep(0.1)
                    self._set_solid_color("black")
                    await asyncio.sleep(0.1)
                # Flash Blue
                for _ in range(3):
                    self.strip.fill((0, 0, 255))
                    self.strip.show()
                    await asyncio.sleep(0.1)
                    self._set_solid_color("black")
                    await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            pass

    async def _fx_timeout_red(self):
        try:
            # Flash red for 5 seconds
            for _ in range(25): # 25 iterations of 0.2s = 5 seconds
                self._set_solid_color("red")
                await asyncio.sleep(0.1)
                self._set_solid_color("black")
                await asyncio.sleep(0.1)
            
            # Return to solid red block representation
            self.current_state = "blocked"
            self._set_solid_color("red")
        except asyncio.CancelledError:
            pass

    async def trigger_connection_pulse(self):
        """Breathing effect from current to Red"""
        if not self.strip or self.current_state in ["solved", "manual"]:
            return
            
        self._cancel_bg()
        self.current_state = "animating"
        
        try:
            for brightness in range(255, -1, -15):
                self.strip.fill((max(0, brightness), 0, 0))
                self.strip.show()
                await asyncio.sleep(0.01)
                
            for brightness in range(0, 256, 15):
                self.strip.fill((min(255, brightness), 0, 0))
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
