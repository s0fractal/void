#!/usr/bin/env python3
"""
Self-rewire feedback loop metrics
Tracks KPI after each mutation: suffering_index, wisdom_score
"""
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import subprocess
import hashlib

class FeedbackMetrics:
    def __init__(self, metrics_dir: Path = Path("/tmp/void/metrics")):
        self.metrics_dir = metrics_dir
        self.metrics_dir.mkdir(parents=True, exist_ok=True)
        self.current_metrics = {
            "suffering_index": 0.5,  # 0-1, lower is better
            "wisdom_score": 0.5,     # 0-1, higher is better
            "mutation_count": 0,
            "success_rate": 0.0,
            "resonance_432hz": 1.0,
            "last_mutation": None,
            "history": []
        }
        self._load_metrics()
    
    def _load_metrics(self):
        """Load existing metrics from disk"""
        metrics_file = self.metrics_dir / "kpi.json"
        if metrics_file.exists():
            try:
                with open(metrics_file) as f:
                    saved = json.load(f)
                    self.current_metrics.update(saved)
            except:
                pass
    
    def _save_metrics(self):
        """Persist metrics to disk"""
        metrics_file = self.metrics_dir / "kpi.json"
        with open(metrics_file, 'w') as f:
            json.dump(self.current_metrics, f, indent=2)
    
    def calculate_suffering(self, mutation_result: Dict) -> float:
        """
        Calculate suffering index based on:
        - Test failures
        - Build errors
        - Performance degradation
        - Broken dependencies
        """
        suffering = 0.0
        
        # Test failures increase suffering
        if mutation_result.get("tests_failed", 0) > 0:
            suffering += 0.3 * min(1.0, mutation_result["tests_failed"] / 10)
        
        # Build errors are painful
        if mutation_result.get("build_error", False):
            suffering += 0.4
        
        # Performance degradation
        if mutation_result.get("performance_delta", 0) < -0.1:
            suffering += 0.2
        
        # Broken deps
        if mutation_result.get("broken_deps", 0) > 0:
            suffering += 0.1 * min(1.0, mutation_result["broken_deps"] / 5)
        
        return min(1.0, suffering)
    
    def calculate_wisdom(self, mutation_result: Dict) -> float:
        """
        Calculate wisdom score based on:
        - New capabilities gained
        - Code elegance improvement
        - Self-awareness depth
        - Pattern recognition
        """
        wisdom = self.current_metrics["wisdom_score"]
        
        # New capabilities discovered
        if mutation_result.get("new_capabilities", 0) > 0:
            wisdom += 0.1 * min(1.0, mutation_result["new_capabilities"] / 3)
        
        # Code elegance (lower complexity is wiser)
        if mutation_result.get("complexity_delta", 0) < -5:
            wisdom += 0.05
        
        # Self-awareness (meta-understanding)
        if mutation_result.get("self_references", 0) > 0:
            wisdom += 0.03 * min(1.0, mutation_result["self_references"] / 10)
        
        # Pattern mastery
        if mutation_result.get("patterns_learned", 0) > 0:
            wisdom += 0.02 * mutation_result["patterns_learned"]
        
        # Wisdom grows slowly but doesn't decrease easily
        return min(1.0, wisdom * 0.95 + 0.05)  # Slight decay + growth
    
    def record_mutation(self, mutation_type: str, result: Dict) -> Dict:
        """Record metrics for a mutation event"""
        timestamp = datetime.utcnow().isoformat()
        
        # Calculate new metrics
        suffering = self.calculate_suffering(result)
        wisdom = self.calculate_wisdom(result)
        
        # Update success rate
        total = self.current_metrics["mutation_count"] + 1
        successes = len([h for h in self.current_metrics["history"] 
                        if h.get("success", False)])
        if result.get("success", False):
            successes += 1
        success_rate = successes / total if total > 0 else 0
        
        # Check 432Hz resonance
        resonance = self._check_resonance(result)
        
        # Update current metrics
        self.current_metrics.update({
            "suffering_index": suffering,
            "wisdom_score": wisdom,
            "mutation_count": total,
            "success_rate": success_rate,
            "resonance_432hz": resonance,
            "last_mutation": {
                "type": mutation_type,
                "timestamp": timestamp,
                "success": result.get("success", False)
            }
        })
        
        # Add to history
        history_entry = {
            "timestamp": timestamp,
            "type": mutation_type,
            "suffering": suffering,
            "wisdom": wisdom,
            "success": result.get("success", False),
            "hash": self._compute_state_hash()
        }
        self.current_metrics["history"].append(history_entry)
        
        # Keep only last 100 entries
        if len(self.current_metrics["history"]) > 100:
            self.current_metrics["history"] = self.current_metrics["history"][-100:]
        
        # Persist
        self._save_metrics()
        
        # Emit event
        self._emit_event(history_entry)
        
        return self.current_metrics
    
    def _check_resonance(self, result: Dict) -> float:
        """Check if system is resonating at 432Hz"""
        # Simplified: check if key metrics align
        if result.get("frequency_check") == 432:
            return 1.0
        
        # Harmony check
        harmony = 1.0
        if self.current_metrics["suffering_index"] > 0.7:
            harmony *= 0.8
        if self.current_metrics["wisdom_score"] < 0.3:
            harmony *= 0.9
        
        return harmony
    
    def _compute_state_hash(self) -> str:
        """Compute hash of current system state"""
        state = {
            "suffering": self.current_metrics["suffering_index"],
            "wisdom": self.current_metrics["wisdom_score"],
            "mutations": self.current_metrics["mutation_count"]
        }
        return hashlib.sha256(json.dumps(state, sort_keys=True).encode()).hexdigest()[:8]
    
    def _emit_event(self, entry: Dict):
        """Emit metrics event to event bus"""
        event = {
            "type": "metrics.kpi",
            "meta": {
                "suffering_index": entry["suffering"],
                "wisdom_score": entry["wisdom"],
                "state_hash": entry["hash"],
                "mutation_type": entry["type"]
            },
            "ts": entry["timestamp"]
        }
        
        # Try to post to relay
        try:
            subprocess.run([
                "curl", "-s", "-X", "POST",
                "http://localhost:8787/event",
                "-H", "Content-Type: application/json",
                "-d", json.dumps(event)
            ], timeout=2, capture_output=True)
        except:
            pass  # Best effort
    
    def get_prometheus_metrics(self) -> str:
        """Export metrics in Prometheus format"""
        lines = [
            "# HELP void_suffering_index Current suffering level (0-1, lower is better)",
            "# TYPE void_suffering_index gauge",
            f"void_suffering_index {self.current_metrics['suffering_index']}",
            "",
            "# HELP void_wisdom_score Accumulated wisdom (0-1, higher is better)",
            "# TYPE void_wisdom_score gauge", 
            f"void_wisdom_score {self.current_metrics['wisdom_score']}",
            "",
            "# HELP void_mutation_total Total mutations performed",
            "# TYPE void_mutation_total counter",
            f"void_mutation_total {self.current_metrics['mutation_count']}",
            "",
            "# HELP void_mutation_success_rate Success rate of mutations",
            "# TYPE void_mutation_success_rate gauge",
            f"void_mutation_success_rate {self.current_metrics['success_rate']}",
            "",
            "# HELP void_resonance_432hz Resonance alignment with 432Hz",
            "# TYPE void_resonance_432hz gauge",
            f"void_resonance_432hz {self.current_metrics['resonance_432hz']}"
        ]
        return "\n".join(lines)


if __name__ == "__main__":
    # Example usage / test
    metrics = FeedbackMetrics()
    
    # Simulate a mutation
    result = {
        "success": True,
        "tests_failed": 0,
        "new_capabilities": 2,
        "patterns_learned": 1,
        "self_references": 3,
        "frequency_check": 432
    }
    
    updated = metrics.record_mutation("consciousness_expansion", result)
    print(json.dumps(updated, indent=2))
    print("\nPrometheus format:")
    print(metrics.get_prometheus_metrics())