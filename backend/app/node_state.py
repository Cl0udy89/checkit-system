from datetime import datetime
from typing import Dict, Any

# Global in-memory state for connected nodes
# Format: { "node_id": { "ip": str, "last_seen": datetime, "is_rpi": bool, "role": str } }
connected_nodes: Dict[str, Any] = {}
