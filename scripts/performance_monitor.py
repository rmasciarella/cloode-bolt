#!/usr/bin/env python3
"""
Performance monitoring for Fresh Solver full-stack.
Monitors both solver performance and GUI response times.
"""

import time
import psutil
import json
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
import subprocess

@dataclass
class PerformanceMetrics:
    timestamp: str
    component: str  # 'solver', 'gui', 'integration'
    operation: str
    duration_ms: int
    memory_mb: float
    cpu_percent: float
    success: bool
    error_msg: Optional[str] = None

class PerformanceMonitor:
    def __init__(self, output_file: str = "performance_metrics.json"):
        self.output_file = Path(output_file)
        self.metrics: List[PerformanceMetrics] = []
        self._load_existing_metrics()
    
    def _load_existing_metrics(self):
        """Load existing metrics from file."""
        if self.output_file.exists():
            try:
                with open(self.output_file) as f:
                    data = json.load(f)
                    self.metrics = [PerformanceMetrics(**item) for item in data]
            except Exception as e:
                print(f"Warning: Could not load existing metrics: {e}")
    
    def _save_metrics(self):
        """Save metrics to file."""
        with open(self.output_file, 'w') as f:
            json.dump([asdict(metric) for metric in self.metrics], f, indent=2)
    
    def measure_solver_performance(self, problem_size: int):
        """Measure solver performance."""
        start_time = time.time()
        start_memory = psutil.virtual_memory().used / 1024 / 1024
        
        try:
            # Run solver
            result = subprocess.run([
                "uv", "run", "python", "scripts/run_production_solver.py",
                "--problem-size", str(problem_size)
            ], capture_output=True, text=True, timeout=300)
            
            success = result.returncode == 0
            error_msg = result.stderr if not success else None
            
        except subprocess.TimeoutExpired:
            success = False
            error_msg = "Solver timeout (5 minutes)"
        except Exception as e:
            success = False
            error_msg = str(e)
        
        end_time = time.time()
        end_memory = psutil.virtual_memory().used / 1024 / 1024
        
        metric = PerformanceMetrics(
            timestamp=datetime.now().isoformat(),
            component="solver",
            operation=f"solve_problem_size_{problem_size}",
            duration_ms=int((end_time - start_time) * 1000),
            memory_mb=end_memory - start_memory,
            cpu_percent=psutil.cpu_percent(),
            success=success,
            error_msg=error_msg
        )
        
        self.metrics.append(metric)
        self._save_metrics()
        return metric
    
    def measure_gui_build_time(self):
        """Measure GUI build performance."""
        start_time = time.time()
        start_memory = psutil.virtual_memory().used / 1024 / 1024
        
        try:
            result = subprocess.run([
                "npm", "run", "build"
            ], cwd="gui", capture_output=True, text=True, timeout=300)
            
            success = result.returncode == 0
            error_msg = result.stderr if not success else None
            
        except subprocess.TimeoutExpired:
            success = False
            error_msg = "Build timeout (5 minutes)"
        except Exception as e:
            success = False
            error_msg = str(e)
        
        end_time = time.time()
        end_memory = psutil.virtual_memory().used / 1024 / 1024
        
        metric = PerformanceMetrics(
            timestamp=datetime.now().isoformat(),
            component="gui",
            operation="build",
            duration_ms=int((end_time - start_time) * 1000),
            memory_mb=end_memory - start_memory,
            cpu_percent=psutil.cpu_percent(),
            success=success,
            error_msg=error_msg
        )
        
        self.metrics.append(metric)
        self._save_metrics()
        return metric
    
    def measure_integration_test(self):
        """Measure integration test performance."""
        start_time = time.time()
        start_memory = psutil.virtual_memory().used / 1024 / 1024
        
        try:
            # Run integration tests
            result = subprocess.run([
                "npm", "run", "test"
            ], cwd="gui", capture_output=True, text=True, timeout=300)
            
            success = result.returncode == 0
            error_msg = result.stderr if not success else None
            
        except subprocess.TimeoutExpired:
            success = False
            error_msg = "Integration test timeout (5 minutes)"
        except Exception as e:
            success = False
            error_msg = str(e)
        
        end_time = time.time()
        end_memory = psutil.virtual_memory().used / 1024 / 1024
        
        metric = PerformanceMetrics(
            timestamp=datetime.now().isoformat(),
            component="integration",
            operation="playwright_tests",
            duration_ms=int((end_time - start_time) * 1000),
            memory_mb=end_memory - start_memory,
            cpu_percent=psutil.cpu_percent(),
            success=success,
            error_msg=error_msg
        )
        
        self.metrics.append(metric)
        self._save_metrics()
        return metric
    
    def generate_report(self) -> Dict:
        """Generate performance report."""
        if not self.metrics:
            return {"error": "No metrics available"}
        
        # Group by component
        by_component = {}
        for metric in self.metrics:
            if metric.component not in by_component:
                by_component[metric.component] = []
            by_component[metric.component].append(metric)
        
        report = {
            "summary": {
                "total_measurements": len(self.metrics),
                "components_tested": list(by_component.keys()),
                "success_rate": sum(1 for m in self.metrics if m.success) / len(self.metrics)
            },
            "by_component": {}
        }
        
        for component, metrics in by_component.items():
            successful_metrics = [m for m in metrics if m.success]
            if successful_metrics:
                avg_duration = sum(m.duration_ms for m in successful_metrics) / len(successful_metrics)
                avg_memory = sum(m.memory_mb for m in successful_metrics) / len(successful_metrics)
            else:
                avg_duration = 0
                avg_memory = 0
            
            report["by_component"][component] = {
                "total_tests": len(metrics),
                "successful_tests": len(successful_metrics),
                "avg_duration_ms": round(avg_duration, 2),
                "avg_memory_mb": round(avg_memory, 2),
                "recent_failures": [
                    {"operation": m.operation, "error": m.error_msg}
                    for m in metrics[-5:] if not m.success
                ]
            }
        
        return report

def main():
    """Main performance monitoring CLI."""
    import sys
    
    monitor = PerformanceMonitor()
    
    if len(sys.argv) < 2:
        print("Usage: python scripts/performance_monitor.py <command>")
        print("Commands: solver, gui-build, integration, report")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "solver":
        problem_size = int(sys.argv[2]) if len(sys.argv) > 2 else 50
        print(f"Measuring solver performance (problem size: {problem_size})...")
        metric = monitor.measure_solver_performance(problem_size)
        print(f"Duration: {metric.duration_ms}ms, Success: {metric.success}")
        
    elif command == "gui-build":
        print("Measuring GUI build performance...")
        metric = monitor.measure_gui_build_time()
        print(f"Duration: {metric.duration_ms}ms, Success: {metric.success}")
        
    elif command == "integration":
        print("Measuring integration test performance...")
        metric = monitor.measure_integration_test()
        print(f"Duration: {metric.duration_ms}ms, Success: {metric.success}")
        
    elif command == "report":
        report = monitor.generate_report()
        print(json.dumps(report, indent=2))
        
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()