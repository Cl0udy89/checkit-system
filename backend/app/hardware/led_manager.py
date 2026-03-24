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
        
        self.led_freq_hz = 800000  # LED signal frequency in hertz (usually 800khz)
        self.led_dma = 10       # DMA channel to use for generating signal
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
        elif effect_name == "timeout_red":
            self._bg_task = asyncio.create_task(self._fx_timeout_red())
        elif effect_name == "pulse":
            self._bg_task = asyncio.create_task(self._fx_pulse())
        elif effect_name == "blink_red":
            self._bg_task = asyncio.create_task(self._fx_blink_red())
        elif effect_name == "wire_pulse":
            self._bg_task = asyncio.create_task(self._fx_wire_pulse())
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
        if not self.strip or not self.color_lib: return
        Color = self.color_lib
        
        if isinstance(color_name, tuple) and len(color_name) == 3:
            color = Color(color_name[0], color_name[1], color_name[2])
        elif color_name == "red": color = Color(255, 0, 0)
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
                            self.strip.setPixelColor(i + q, Color(0, 0, 0))
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

    async def _fx_pulse(self):
        """Brief green breathing pulse – used when a patchcord is connected.
        Works regardless of current_state (unlike trigger_connection_pulse).
        Total duration ≈ 180 ms, then returns to solid red (game-active state)."""
        Color = self.color_lib
        try:
            for brightness in range(0, 256, 26):
                for i in range(self.strip.numPixels()):
                    self.strip.setPixelColor(i, Color(0, min(255, brightness), 0))
                self.strip.show()
                await asyncio.sleep(0.008)
            for brightness in range(255, -1, -26):
                for i in range(self.strip.numPixels()):
                    self.strip.setPixelColor(i, Color(0, max(0, brightness), 0))
                self.strip.show()
                await asyncio.sleep(0.008)
        except asyncio.CancelledError:
            pass
        finally:
            self._set_solid_color("red")
            self.current_state = "manual"  # Game is still active

    async def _fx_blink_red(self):
        """Slow red heartbeat – game idle state during PatchMaster (loops until cancelled)."""
        Color = self.color_lib
        try:
            while True:
                # Fade up
                for b in range(30, 220, 8):
                    for i in range(self.strip.numPixels()):
                        self.strip.setPixelColor(i, Color(b, 0, 0))
                    self.strip.show()
                    await asyncio.sleep(0.018)
                # Fade down
                for b in range(220, 30, -8):
                    for i in range(self.strip.numPixels()):
                        self.strip.setPixelColor(i, Color(b, 0, 0))
                    self.strip.show()
                    await asyncio.sleep(0.018)
                await asyncio.sleep(0.12)  # brief pause at bottom
        except asyncio.CancelledError:
            pass
        finally:
            self._set_solid_color("red")
            self.current_state = "manual"

    async def _fx_wire_pulse(self):
        """Symmetric cyan impulse from both ends converging to center – SINGLE PASS per cable plug.
        On normal completion → restarts blink_red.
        On cancellation (next effect called) → solid red and exits.
        Color: electric cyan with fading trail."""
        Color = self.color_lib
        n = self.strip.numPixels()
        half = n // 2
        completed = False
        try:
            # Single pass: both pulses travel from ends toward center
            for step in range(half + 3):
                # Clear all pixels
                for i in range(n):
                    self.strip.setPixelColor(i, Color(0, 0, 0))

                # Draw 4-pixel trailing pulse from each side
                for trail in range(4):
                    brightness = max(0, 255 - trail * 68)
                    r_val = brightness // 6       # slight red tint
                    g_val = brightness * 2 // 3   # medium green
                    b_val = brightness             # full blue → cyan

                    left_pos = step - trail
                    right_pos = (n - 1 - step) + trail

                    if 0 <= left_pos < n:
                        self.strip.setPixelColor(left_pos, Color(r_val, g_val, b_val))
                    if 0 <= right_pos < n and right_pos != left_pos:
                        self.strip.setPixelColor(right_pos, Color(r_val, g_val, b_val))

                self.strip.show()
                await asyncio.sleep(0.018)

            # Brief dark gap at end of pass
            for i in range(n):
                self.strip.setPixelColor(i, Color(0, 0, 0))
            self.strip.show()
            await asyncio.sleep(0.06)
            completed = True

        except asyncio.CancelledError:
            # Cancelled by next play_effect → do NOT override color, the caller already set it
            self.current_state = "manual"
            return

        if completed:
            # Pulse finished normally → chain back into blink_red
            self.current_state = "manual"
            self._bg_task = asyncio.create_task(self._fx_blink_red())

    async def trigger_connection_pulse(self):
        """Breathing effect for successful connection (Green pulse)"""
        if not self.strip or self.current_state in ["solved", "manual"]:
            return
            
        self._cancel_bg()
        self.current_state = "animating"
        Color = self.color_lib
        
        try:
            for brightness in range(0, 256, 15):
                for i in range(self.strip.numPixels()):
                    self.strip.setPixelColor(i, Color(0, min(255, brightness), 0))
                self.strip.show()
                await asyncio.sleep(0.01)
                
            for brightness in range(255, -1, -15):
                for i in range(self.strip.numPixels()):
                   self.strip.setPixelColor(i, Color(0, max(0, brightness), 0))
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
