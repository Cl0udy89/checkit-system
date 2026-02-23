import logging
from typing import List, Dict
from app.hardware.gpio_manager import gpio_manager, GPIO
from app.simple_config import settings

logger = logging.getLogger(__name__)

class PatchPanel:
    def __init__(self):
        # Mapping: Port Number (Physical Label) -> GPIO Pin (BCM)
        # As per the hardware schematic, we use BCM numbering in code.
        # To test the patch panel, short the following Physical Pins together:
        # Pair 1: GND (Physical Pin 9)  <-> Physical Pin 11 (BCM 17)
        # Pair 2: GND (Physical Pin 14) <-> Physical Pin 13 (BCM 27)
        # Pair 3: GND (Physical Pin 14) <-> Physical Pin 15 (BCM 22)
        # Pair 4: GND (Physical Pin 20) <-> Physical Pin 19 (BCM 10)
        # Pair 5: GND (Physical Pin 20) <-> Physical Pin 21 (BCM 9)
        # Pair 6: GND (Physical Pin 25) <-> Physical Pin 23 (BCM 11)
        # Pair 7: GND (Physical Pin 30) <-> Physical Pin 29 (BCM 5)
        # Pair 8: GND (Physical Pin 30) <-> Physical Pin 31 (BCM 6)
        
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
        self._remote_state = []
        self._forced_state = {} # index -> bool
        # Fallback initial state (all disconnected)
        for pair in self.pin_mapping:
            self._remote_state.append({
                "label": pair["label"],
                "gpio": pair["gpio"],
                "connected": False
            })

    def set_force_state(self, index: int, state: bool):
        """Forces a specific port to a simulated state (for Admin override)."""
        self._forced_state[index] = state

    def clear_force_state(self, index: int = None):
        """Clears the forced state for a specific port or all if None."""
        if index is None:
            self._forced_state.clear()
        elif index in self._forced_state:
            del self._forced_state[index]

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
        state_list = []
        if not gpio_manager.is_rpi_mode():
             # Server Mode (or Dev PC) - Return what the Agent sent us
             state_list = self._remote_state
        else:
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
            state_list = results
        
        # Apply Overrides
        for i, pair in enumerate(state_list):
            if i in self._forced_state:
                pair["connected"] = self._forced_state[i]
                pair["forced"] = True
            else:
                pair["forced"] = False

        return state_list

    def is_solved(self) -> bool:
        """Returns True if ALL pairs are connected."""
        state = self.get_state()
        return all(pair["connected"] for pair in state)

patch_panel = PatchPanel()
