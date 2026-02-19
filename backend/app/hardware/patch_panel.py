import logging
from typing import List, Dict
from app.hardware.gpio_manager import gpio_manager, GPIO
from app.simple_config import settings

logger = logging.getLogger(__name__)

class PatchPanel:
    def __init__(self):
        # Mapping: Port Number (Physical Label) -> GPIO Pin (BCM)
        # As per prompt:
        # Pair 1: Port 1 (GND) <-> Port 14 (GPIO_17)
        # Pair 2: Port 2 (GND) <-> Port 19 (GPIO_27)
        # Pair 3: Port 4 (GND) <-> Port 17 (GPIO_22)
        # Pair 4: Port 5 (GND) <-> Port 24 (GPIO_10)
        # Pair 5: Port 6 (GND) <-> Port 18 (GPIO_09)
        # Pair 6: Port 7 (GND) <-> Port 21 (GPIO_11)
        # Pair 7: Port 9 (GND) <-> Port 22 (GPIO_05)
        # Pair 8: Port 11 (GND) <-> Port 23 (GPIO_06)
        
        self.pin_mapping = [
            {"label": "Pair 1", "gpio": 17},
            {"label": "Pair 2", "gpio": 27},
            {"label": "Pair 3", "gpio": 22},
            {"label": "Pair 4", "gpio": 10},
            {"label": "Pair 5", "gpio": 9},
            {"label": "Pair 6", "gpio": 11},
            {"label": "Pair 7", "gpio": 5},
            {"label": "Pair 8", "gpio": 6},
        ]
        
        # Initialize Pins
        for pair in self.pin_mapping:
            # Setup as Input with Pull Up. 
            # If connected to END (Ground), it will read LOW.
            gpio_manager.setup_input(pair["gpio"], GPIO.PUD_UP)
            
        # Remote State Storage (for Server Mode)
        # We store the last known state from the agent
        self._remote_state = []
        # Fallback initial state (all disconnected)
        for pair in self.pin_mapping:
            self._remote_state.append({
                "label": pair["label"],
                "gpio": pair["gpio"],
                "connected": False
            })

    def update_remote_state(self, state: List[Dict[str, any]]):
        """Called by the API when Agent sends an update."""
        # Validate or just replace? Just replace for now.
        # Ensure format match if needed, but for now trust the agent.
        self._remote_state = state
        # log debug?
        # logger.debug(f"PatchPanel remote state updated: {state}")

    def get_state(self) -> List[Dict[str, any]]:
        """
        Returns the state of all pairs.
        If on Server (no RPi GPIO), returns last known remote state.
        If on Client (RPi), reads local GPIO.
        """
        if not gpio_manager.is_rpi_mode():
             # Server Mode (or Dev PC) - Return what the Agent sent us
             return self._remote_state

        # Client Mode - Read Hardware
        results = []
        for pair in self.pin_mapping:
            state = gpio_manager.read(pair["gpio"])
            # LOW (0) means connected to GND -> True
            is_connected = (state == GPIO.LOW)
            results.append({
                "label": pair["label"],
                "gpio": pair["gpio"],
                "connected": is_connected
            })
        return results

    def is_solved(self) -> bool:
        """Returns True if ALL pairs are connected."""
        state = self.get_state()
        return all(pair["connected"] for pair in state)

patch_panel = PatchPanel()
