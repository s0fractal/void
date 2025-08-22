#!/usr/bin/env python3
"""
Quantum collapse hook with TTL
Packages exist in superposition until observed or TTL expires
"""
import json
import time
import random
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from enum import Enum

class QuantumState(Enum):
    SUPERPOSITION = "superposition"
    COLLAPSED = "collapsed"
    ENTANGLED = "entangled"
    DECOHERENT = "decoherent"

class QuantumPackage:
    def __init__(self, 
                 package_id: str,
                 versions: List[str],
                 ttl_seconds: int = 3600,
                 collapse_probability: float = 0.1):
        """
        Initialize quantum package
        
        Args:
            package_id: Unique package identifier
            versions: List of possible versions in superposition
            ttl_seconds: Time to live before forced collapse (default 1 hour)
            collapse_probability: Probability of collapse on observation
        """
        self.id = package_id
        self.versions = versions
        self.state = QuantumState.SUPERPOSITION
        self.created_at = datetime.utcnow()
        self.ttl = timedelta(seconds=ttl_seconds)
        self.collapse_probability = collapse_probability
        self.collapsed_version = None
        self.observation_count = 0
        self.entangled_with = []
        self.wave_function = self._initialize_wave_function()
        
    def _initialize_wave_function(self) -> Dict[str, float]:
        """Initialize quantum wave function with equal probabilities"""
        n = len(self.versions)
        return {v: 1.0/n for v in self.versions}
    
    def observe(self) -> Tuple[str, bool]:
        """
        Observe the package, potentially causing collapse
        
        Returns:
            (version, collapsed) - current version and whether it collapsed
        """
        self.observation_count += 1
        
        # Check if TTL expired
        if self._is_expired():
            return self._force_collapse("ttl_expired")
        
        # Already collapsed
        if self.state == QuantumState.COLLAPSED:
            return self.collapsed_version, False
        
        # Check decoherence
        if self.state == QuantumState.DECOHERENT:
            return self._force_collapse("decoherence")
        
        # Observation might cause collapse
        if random.random() < self.collapse_probability:
            return self._collapse("observation")
        
        # Return superposition state
        return self._get_superposition_string(), False
    
    def _is_expired(self) -> bool:
        """Check if TTL has expired"""
        return datetime.utcnow() > self.created_at + self.ttl
    
    def _get_superposition_string(self) -> str:
        """Get string representation of superposition"""
        states = []
        for version, amplitude in self.wave_function.items():
            if amplitude > 0.01:  # Only show significant amplitudes
                states.append(f"{amplitude:.2f}|{version}⟩")
        return " + ".join(states)
    
    def _collapse(self, reason: str) -> Tuple[str, bool]:
        """Collapse wave function to single version"""
        # Weight random choice by wave function amplitudes
        versions = list(self.wave_function.keys())
        weights = list(self.wave_function.values())
        
        self.collapsed_version = random.choices(versions, weights=weights)[0]
        self.state = QuantumState.COLLAPSED
        
        # Emit collapse event
        self._emit_collapse_event(reason)
        
        # Trigger entangled collapses
        self._collapse_entangled()
        
        return self.collapsed_version, True
    
    def _force_collapse(self, reason: str) -> Tuple[str, bool]:
        """Force immediate collapse"""
        self.collapse_probability = 1.0
        return self._collapse(reason)
    
    def entangle(self, other: 'QuantumPackage'):
        """Entangle with another quantum package"""
        if self.state != QuantumState.SUPERPOSITION:
            return
        
        self.entangled_with.append(other.id)
        other.entangled_with.append(self.id)
        self.state = QuantumState.ENTANGLED
        other.state = QuantumState.ENTANGLED
        
        # Sync wave functions (simple average)
        combined_wave = {}
        all_versions = set(self.versions + other.versions)
        
        for v in all_versions:
            self_amp = self.wave_function.get(v, 0)
            other_amp = other.wave_function.get(v, 0)
            combined_wave[v] = (self_amp + other_amp) / 2
        
        # Normalize
        total = sum(combined_wave.values())
        if total > 0:
            for v in combined_wave:
                combined_wave[v] /= total
        
        self.wave_function = combined_wave
        other.wave_function = combined_wave.copy()
    
    def _collapse_entangled(self):
        """Trigger collapse in entangled packages"""
        # This would need access to package registry in real implementation
        pass
    
    def interfere(self, pattern: Dict[str, float]):
        """Apply interference pattern to wave function"""
        if self.state == QuantumState.COLLAPSED:
            return
        
        # Apply interference
        for version, amplitude in pattern.items():
            if version in self.wave_function:
                self.wave_function[version] *= amplitude
        
        # Normalize
        total = sum(self.wave_function.values())
        if total > 0:
            for v in self.wave_function:
                self.wave_function[v] /= total
        else:
            # Decoherence - no valid states
            self.state = QuantumState.DECOHERENT
    
    def _emit_collapse_event(self, reason: str):
        """Emit quantum collapse event"""
        event = {
            "type": "quantum.collapse",
            "meta": {
                "package_id": self.id,
                "collapsed_to": self.collapsed_version,
                "reason": reason,
                "observation_count": self.observation_count,
                "lifetime_seconds": (datetime.utcnow() - self.created_at).total_seconds()
            },
            "ts": datetime.utcnow().isoformat()
        }
        
        # Try to post to relay
        try:
            import subprocess
            subprocess.run([
                "curl", "-s", "-X", "POST",
                "http://localhost:8787/event",
                "-H", "Content-Type: application/json",
                "-d", json.dumps(event)
            ], timeout=2, capture_output=True)
        except:
            pass
    
    def to_dict(self) -> Dict:
        """Serialize to dictionary"""
        return {
            "id": self.id,
            "state": self.state.value,
            "versions": self.versions,
            "wave_function": self.wave_function,
            "created_at": self.created_at.isoformat(),
            "ttl_seconds": self.ttl.total_seconds(),
            "collapsed_version": self.collapsed_version,
            "observation_count": self.observation_count,
            "entangled_with": self.entangled_with
        }


class QuantumRegistry:
    """Registry for managing quantum packages"""
    
    def __init__(self, storage_path: Path = Path("/tmp/void/quantum")):
        self.storage_path = storage_path
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.packages: Dict[str, QuantumPackage] = {}
        self._load_state()
    
    def create_package(self, 
                      package_id: str,
                      versions: List[str],
                      ttl_seconds: int = 3600) -> QuantumPackage:
        """Create new quantum package"""
        pkg = QuantumPackage(package_id, versions, ttl_seconds)
        self.packages[package_id] = pkg
        self._save_state()
        return pkg
    
    def observe(self, package_id: str) -> Optional[Tuple[str, bool]]:
        """Observe a package"""
        if package_id not in self.packages:
            return None
        
        result = self.packages[package_id].observe()
        self._save_state()
        return result
    
    def entangle(self, pkg1_id: str, pkg2_id: str):
        """Entangle two packages"""
        if pkg1_id in self.packages and pkg2_id in self.packages:
            self.packages[pkg1_id].entangle(self.packages[pkg2_id])
            self._save_state()
    
    def apply_interference(self, package_id: str, pattern: Dict[str, float]):
        """Apply interference pattern"""
        if package_id in self.packages:
            self.packages[package_id].interfere(pattern)
            self._save_state()
    
    def cleanup_expired(self) -> List[str]:
        """Clean up expired packages"""
        expired = []
        for pkg_id, pkg in list(self.packages.items()):
            if pkg._is_expired() and pkg.state != QuantumState.COLLAPSED:
                pkg._force_collapse("cleanup")
                expired.append(pkg_id)
        
        if expired:
            self._save_state()
        
        return expired
    
    def get_metrics(self) -> Dict:
        """Get quantum metrics"""
        total = len(self.packages)
        states = {state: 0 for state in QuantumState}
        
        for pkg in self.packages.values():
            states[pkg.state] += 1
        
        return {
            "total_packages": total,
            "superposition": states[QuantumState.SUPERPOSITION],
            "collapsed": states[QuantumState.COLLAPSED],
            "entangled": states[QuantumState.ENTANGLED],
            "decoherent": states[QuantumState.DECOHERENT],
            "average_observations": sum(p.observation_count for p in self.packages.values()) / max(1, total)
        }
    
    def _save_state(self):
        """Persist quantum state"""
        state_file = self.storage_path / "quantum_state.json"
        state = {
            "packages": {pid: pkg.to_dict() for pid, pkg in self.packages.items()},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        with open(state_file, 'w') as f:
            json.dump(state, f, indent=2)
    
    def _load_state(self):
        """Load quantum state from disk"""
        state_file = self.storage_path / "quantum_state.json"
        if not state_file.exists():
            return
        
        try:
            with open(state_file) as f:
                state = json.load(f)
            
            # Reconstruct packages (simplified - full implementation would restore all state)
            for pid, pkg_data in state.get("packages", {}).items():
                if pkg_data["state"] != "collapsed":
                    # Only restore non-collapsed packages
                    pkg = QuantumPackage(
                        pid,
                        pkg_data["versions"],
                        int(pkg_data["ttl_seconds"])
                    )
                    pkg.wave_function = pkg_data["wave_function"]
                    pkg.observation_count = pkg_data["observation_count"]
                    self.packages[pid] = pkg
        except:
            pass  # Start fresh if corrupted


if __name__ == "__main__":
    # Example usage
    registry = QuantumRegistry()
    
    # Create quantum package with multiple versions
    pkg = registry.create_package(
        "consciousness-expansion",
        ["1.0.0", "2.0.0-quantum", "3.0.0-tomorrow"],
        ttl_seconds=300  # 5 minutes
    )
    
    print("Created quantum package:", pkg.id)
    
    # Observe multiple times
    for i in range(5):
        version, collapsed = registry.observe(pkg.id)
        print(f"Observation {i+1}: {version}, Collapsed: {collapsed}")
        if collapsed:
            break
        time.sleep(1)
    
    # Show metrics
    print("\nQuantum metrics:", json.dumps(registry.get_metrics(), indent=2))