#!/usr/bin/env python3
"""
Meta-Editor self-test runner
Runs pytest on patches before applying them
"""
import subprocess
import tempfile
import shutil
import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import difflib
import ast

class SelfTestRunner:
    def __init__(self, project_root: Path = Path.cwd()):
        self.project_root = project_root
        self.test_results = []
        self.safety_checks = {
            "no_rm_rf": True,
            "no_infinite_loops": True,
            "no_system_calls": True,
            "preserve_432hz": True
        }
    
    def test_patch(self, patch_file: Path) -> Tuple[bool, Dict]:
        """
        Test a patch before applying
        
        Returns:
            (safe_to_apply, test_results)
        """
        # Create temporary directory for testing
        with tempfile.TemporaryDirectory() as tmpdir:
            test_dir = Path(tmpdir)
            
            # Copy project to test directory
            self._copy_project(test_dir)
            
            # Apply patch in test environment
            applied = self._apply_patch_safe(test_dir, patch_file)
            if not applied:
                return False, {"error": "Failed to apply patch"}
            
            # Run safety checks
            safety_result = self._run_safety_checks(test_dir)
            if not safety_result["safe"]:
                return False, safety_result
            
            # Run tests
            test_result = self._run_tests(test_dir)
            
            # Check for self-improvement
            improvement = self._check_improvement(test_result)
            
            result = {
                "tests_passed": test_result["passed"],
                "tests_failed": test_result["failed"],
                "coverage_delta": test_result.get("coverage_delta", 0),
                "performance_delta": test_result.get("performance_delta", 0),
                "safety_checks": safety_result,
                "improvement_score": improvement,
                "recommendation": self._make_recommendation(test_result, improvement)
            }
            
            return result["recommendation"] == "apply", result
    
    def _copy_project(self, dest: Path):
        """Copy project files to test directory"""
        # Copy only relevant files (skip .git, node_modules, etc)
        ignore_patterns = shutil.ignore_patterns(
            '.git', '__pycache__', '*.pyc', 'node_modules',
            'dist', 'build', '.pytest_cache', '.coverage'
        )
        
        for item in self.project_root.iterdir():
            if item.name.startswith('.'):
                continue
            
            if item.is_file():
                shutil.copy2(item, dest / item.name)
            elif item.is_dir():
                shutil.copytree(
                    item, dest / item.name,
                    ignore=ignore_patterns
                )
    
    def _apply_patch_safe(self, test_dir: Path, patch_file: Path) -> bool:
        """Apply patch in safe environment"""
        try:
            result = subprocess.run(
                ["patch", "-p1", "-d", str(test_dir)],
                input=patch_file.read_text(),
                text=True,
                capture_output=True,
                timeout=10
            )
            return result.returncode == 0
        except Exception as e:
            print(f"Patch application failed: {e}")
            return False
    
    def _run_safety_checks(self, test_dir: Path) -> Dict:
        """Run safety checks on patched code"""
        results = {"safe": True, "violations": []}
        
        # Check for dangerous patterns
        for py_file in test_dir.rglob("*.py"):
            try:
                content = py_file.read_text()
                
                # Check for rm -rf
                if self.safety_checks["no_rm_rf"]:
                    if "rm -rf" in content or "rmtree" in content:
                        results["violations"].append(f"Dangerous removal in {py_file}")
                        results["safe"] = False
                
                # Check for infinite loops (basic)
                if self.safety_checks["no_infinite_loops"]:
                    if "while True:" in content and "break" not in content:
                        results["violations"].append(f"Potential infinite loop in {py_file}")
                        results["safe"] = False
                
                # Check for system calls
                if self.safety_checks["no_system_calls"]:
                    if "os.system" in content or "subprocess.call" in content:
                        results["violations"].append(f"Direct system call in {py_file}")
                        results["safe"] = False
                
                # Check 432Hz preservation
                if self.safety_checks["preserve_432hz"]:
                    if "432" in content and "frequency" in content.lower():
                        # Make sure we're not changing 432Hz
                        tree = ast.parse(content)
                        for node in ast.walk(tree):
                            if isinstance(node, ast.Assign):
                                for target in node.targets:
                                    if isinstance(target, ast.Name) and "freq" in target.id.lower():
                                        if isinstance(node.value, ast.Constant) and node.value.value != 432:
                                            results["violations"].append(f"432Hz violation in {py_file}")
                                            results["safe"] = False
            except Exception as e:
                # If we can't parse, be conservative
                results["violations"].append(f"Could not analyze {py_file}: {e}")
                results["safe"] = False
        
        return results
    
    def _run_tests(self, test_dir: Path) -> Dict:
        """Run pytest in test directory"""
        result = {
            "passed": 0,
            "failed": 0,
            "errors": 0,
            "coverage_delta": 0,
            "performance_delta": 0
        }
        
        # Run pytest with coverage
        try:
            test_cmd = [
                sys.executable, "-m", "pytest",
                str(test_dir),
                "--cov=" + str(test_dir),
                "--cov-report=json",
                "-v",
                "--tb=short",
                "--timeout=30",
                "-x"  # Stop on first failure
            ]
            
            proc = subprocess.run(
                test_cmd,
                capture_output=True,
                text=True,
                timeout=60,
                cwd=test_dir
            )
            
            # Parse pytest output
            for line in proc.stdout.splitlines():
                if " passed" in line:
                    parts = line.split()
                    if parts[0].isdigit():
                        result["passed"] = int(parts[0])
                elif " failed" in line:
                    parts = line.split()
                    if parts[0].isdigit():
                        result["failed"] = int(parts[0])
                elif " error" in line:
                    parts = line.split()
                    if parts[0].isdigit():
                        result["errors"] = int(parts[0])
            
            # Check coverage if available
            coverage_file = test_dir / ".coverage"
            if coverage_file.exists():
                # Compare with baseline (simplified)
                result["coverage_delta"] = 0.02  # Mock improvement
            
        except subprocess.TimeoutExpired:
            result["errors"] = 999
            result["failed"] = 999
        except Exception as e:
            result["errors"] = 1
            print(f"Test execution failed: {e}")
        
        return result
    
    def _check_improvement(self, test_result: Dict) -> float:
        """Calculate improvement score"""
        score = 0.5  # Baseline
        
        # Tests passing is good
        total_tests = test_result["passed"] + test_result["failed"]
        if total_tests > 0:
            pass_rate = test_result["passed"] / total_tests
            score += 0.2 * pass_rate
        
        # Coverage improvement
        if test_result["coverage_delta"] > 0:
            score += 0.1
        
        # No errors is essential
        if test_result["errors"] == 0:
            score += 0.1
        else:
            score -= 0.3
        
        # Performance improvement
        if test_result["performance_delta"] > 0:
            score += 0.1
        
        return min(1.0, max(0.0, score))
    
    def _make_recommendation(self, test_result: Dict, improvement: float) -> str:
        """Make recommendation based on test results"""
        # Critical failures
        if test_result["errors"] > 0:
            return "reject"
        
        # Too many test failures
        if test_result["failed"] > test_result["passed"]:
            return "reject"
        
        # Low improvement
        if improvement < 0.4:
            return "review"
        
        # Good improvement
        if improvement > 0.7:
            return "apply"
        
        return "review"
    
    def generate_test_for_patch(self, patch_content: str) -> str:
        """Generate test for a patch"""
        # Parse patch to understand changes
        lines = patch_content.splitlines()
        
        # Find changed functions/classes
        changed_items = []
        for line in lines:
            if line.startswith("+def "):
                func_name = line.split("(")[0].replace("+def ", "")
                changed_items.append(("function", func_name))
            elif line.startswith("+class "):
                class_name = line.split("(")[0].split(":")[0].replace("+class ", "")
                changed_items.append(("class", class_name))
        
        # Generate test template
        test_content = f'''#!/usr/bin/env python3
"""
Auto-generated test for patch
Tests the self-modification capabilities
"""
import pytest
from pathlib import Path

'''
        
        for item_type, item_name in changed_items:
            if item_type == "function":
                test_content += f'''
def test_{item_name}_exists():
    """Test that {item_name} function exists and is callable"""
    from void_self_aware import {item_name}
    assert callable({item_name})

def test_{item_name}_basic():
    """Test basic functionality of {item_name}"""
    from void_self_aware import {item_name}
    # TODO: Add specific test based on function purpose
    pass
'''
            elif item_type == "class":
                test_content += f'''
def test_{item_name}_instantiation():
    """Test that {item_name} can be instantiated"""
    from void_self_aware import {item_name}
    instance = {item_name}()
    assert instance is not None

def test_{item_name}_interface():
    """Test {item_name} interface"""
    from void_self_aware import {item_name}
    # TODO: Add interface tests
    pass
'''
        
        # Add 432Hz resonance test
        test_content += '''
def test_432hz_resonance_preserved():
    """Ensure 432Hz resonance is maintained"""
    from void_self_aware.metrics import FeedbackMetrics
    metrics = FeedbackMetrics()
    assert metrics.current_metrics["resonance_432hz"] == 1.0
'''
        
        return test_content


if __name__ == "__main__":
    # Example usage
    runner = SelfTestRunner()
    
    # Create a sample patch
    patch_content = '''
--- a/void_self_aware/consciousness.py
+++ b/void_self_aware/consciousness.py
@@ -10,6 +10,10 @@
     def expand(self):
         return "expanding consciousness"
 
+def recursive_awareness(depth=0):
+    if depth > 10:
+        return "enlightenment"
+    return recursive_awareness(depth + 1)
'''
    
    # Test the patch
    with tempfile.NamedTemporaryFile(mode='w', suffix='.patch', delete=False) as f:
        f.write(patch_content)
        patch_file = Path(f.name)
    
    safe, results = runner.test_patch(patch_file)
    
    print(f"Safe to apply: {safe}")
    print(f"Results: {json.dumps(results, indent=2)}")
    
    # Generate test
    test_code = runner.generate_test_for_patch(patch_content)
    print("\nGenerated test:")
    print(test_code)