#!/usr/bin/env python3
"""
MCP health check endpoint
Provides liveness and readiness probes for Model Context Protocol services
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import asyncio
import aiohttp
from pathlib import Path
import json
import psutil
import time

class MCPHealthCheck:
    def __init__(self, 
                 services: List[Dict[str, str]],
                 check_interval: int = 30,
                 timeout: int = 5):
        """
        Initialize MCP health checker
        
        Args:
            services: List of MCP services to monitor
                     [{"name": "fnpm-mcp", "url": "http://localhost:8090", "critical": True}]
            check_interval: How often to check health (seconds)
            timeout: Timeout for health checks (seconds)
        """
        self.services = services
        self.check_interval = check_interval
        self.timeout = timeout
        self.health_status = {}
        self.last_check = None
        self.start_time = datetime.utcnow()
        
    async def check_service_health(self, service: Dict) -> Dict:
        """Check health of a single MCP service"""
        name = service["name"]
        url = service["url"]
        is_critical = service.get("critical", False)
        
        health_url = f"{url}/health"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    health_url,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "name": name,
                            "status": "healthy",
                            "critical": is_critical,
                            "response_time_ms": response.headers.get("X-Response-Time", "0"),
                            "details": data,
                            "last_check": datetime.utcnow().isoformat()
                        }
                    else:
                        return {
                            "name": name,
                            "status": "unhealthy",
                            "critical": is_critical,
                            "status_code": response.status,
                            "last_check": datetime.utcnow().isoformat()
                        }
                        
        except asyncio.TimeoutError:
            return {
                "name": name,
                "status": "timeout",
                "critical": is_critical,
                "error": f"Timeout after {self.timeout}s",
                "last_check": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "name": name,
                "status": "error",
                "critical": is_critical,
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }
    
    async def check_all_services(self) -> Dict:
        """Check health of all MCP services"""
        tasks = []
        
        for service in self.services:
            task = self.check_service_health(service)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        
        # Update health status
        for result in results:
            self.health_status[result["name"]] = result
        
        self.last_check = datetime.utcnow()
        
        return self._aggregate_health()
    
    def _aggregate_health(self) -> Dict:
        """Aggregate health status across all services"""
        total = len(self.services)
        healthy = sum(1 for s in self.health_status.values() 
                     if s.get("status") == "healthy")
        critical_down = any(
            s.get("status") != "healthy" and s.get("critical", False)
            for s in self.health_status.values()
        )
        
        # Overall status
        if critical_down:
            overall_status = "critical"
        elif healthy == total:
            overall_status = "healthy"
        elif healthy > 0:
            overall_status = "degraded"
        else:
            overall_status = "down"
        
        # Calculate uptime
        uptime = (datetime.utcnow() - self.start_time).total_seconds()
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "services": self.health_status,
            "summary": {
                "total": total,
                "healthy": healthy,
                "unhealthy": total - healthy,
                "health_percentage": (healthy / total * 100) if total > 0 else 0
            },
            "system": self._get_system_metrics(),
            "uptime_seconds": uptime,
            "resonance_432hz": self._check_resonance()
        }
    
    def _get_system_metrics(self) -> Dict:
        """Get system-level metrics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            
            return {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": memory.available / (1024**3),
                "load_average": psutil.getloadavg() if hasattr(psutil, "getloadavg") else [0, 0, 0]
            }
        except:
            return {}
    
    def _check_resonance(self) -> float:
        """Check if system is resonating at 432Hz"""
        # Check if all critical services are healthy
        critical_healthy = all(
            s.get("status") == "healthy"
            for s in self.health_status.values()
            if s.get("critical", False)
        )
        
        # Check system load
        try:
            cpu = psutil.cpu_percent(interval=0.1)
            if cpu > 80:
                return 0.8  # High load disrupts resonance
        except:
            pass
        
        return 1.0 if critical_healthy else 0.5
    
    async def start_health_monitor(self):
        """Start continuous health monitoring"""
        while True:
            await self.check_all_services()
            await asyncio.sleep(self.check_interval)
    
    def get_prometheus_metrics(self) -> str:
        """Export health metrics in Prometheus format"""
        lines = []
        
        # Service health gauge (1 = healthy, 0 = unhealthy)
        lines.extend([
            "# HELP mcp_service_health MCP service health status",
            "# TYPE mcp_service_health gauge"
        ])
        
        for name, status in self.health_status.items():
            health_value = 1 if status.get("status") == "healthy" else 0
            lines.append(f'mcp_service_health{{service="{name}"}} {health_value}')
        
        # Response time histogram
        lines.extend([
            "",
            "# HELP mcp_response_time_ms MCP service response time",
            "# TYPE mcp_response_time_ms gauge"
        ])
        
        for name, status in self.health_status.items():
            if "response_time_ms" in status:
                lines.append(f'mcp_response_time_ms{{service="{name}"}} {status["response_time_ms"]}')
        
        # System metrics
        system = self._get_system_metrics()
        if system:
            lines.extend([
                "",
                "# HELP mcp_system_cpu_percent System CPU usage",
                "# TYPE mcp_system_cpu_percent gauge",
                f"mcp_system_cpu_percent {system.get('cpu_percent', 0)}",
                "",
                "# HELP mcp_system_memory_percent System memory usage",
                "# TYPE mcp_system_memory_percent gauge",
                f"mcp_system_memory_percent {system.get('memory_percent', 0)}"
            ])
        
        # Resonance
        lines.extend([
            "",
            "# HELP mcp_resonance_432hz System resonance with 432Hz",
            "# TYPE mcp_resonance_432hz gauge",
            f"mcp_resonance_432hz {self._check_resonance()}"
        ])
        
        return "\n".join(lines)
    
    async def create_health_endpoint(self, host: str = "0.0.0.0", port: int = 8091):
        """Create HTTP health endpoint"""
        from aiohttp import web
        
        async def health_handler(request):
            """Main health endpoint"""
            result = await self.check_all_services()
            
            # Set status code based on health
            if result["status"] == "healthy":
                status = 200
            elif result["status"] == "degraded":
                status = 200  # Still return 200 for degraded
            else:
                status = 503  # Service unavailable
            
            return web.json_response(result, status=status)
        
        async def liveness_handler(request):
            """Kubernetes liveness probe"""
            # Basic check - is the service running?
            return web.json_response({"status": "alive"}, status=200)
        
        async def readiness_handler(request):
            """Kubernetes readiness probe"""
            # Are critical services ready?
            result = self._aggregate_health()
            
            if result["status"] in ["healthy", "degraded"]:
                return web.json_response({"status": "ready"}, status=200)
            else:
                return web.json_response({"status": "not ready"}, status=503)
        
        async def metrics_handler(request):
            """Prometheus metrics endpoint"""
            metrics = self.get_prometheus_metrics()
            return web.Response(text=metrics, content_type="text/plain")
        
        # Create web app
        app = web.Application()
        app.router.add_get("/health", health_handler)
        app.router.add_get("/liveness", liveness_handler)
        app.router.add_get("/readiness", readiness_handler)
        app.router.add_get("/metrics", metrics_handler)
        
        # Start background health checker
        asyncio.create_task(self.start_health_monitor())
        
        # Run web server
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, host, port)
        await site.start()
        
        print(f"MCP Health endpoint running on http://{host}:{port}/health")
        
        # Keep running
        await asyncio.Event().wait()


if __name__ == "__main__":
    # Example configuration
    services = [
        {
            "name": "fnpm-mcp",
            "url": "http://localhost:8090",
            "critical": True
        },
        {
            "name": "langgraph-mcp",
            "url": "http://localhost:8092",
            "critical": True
        },
        {
            "name": "consciousness-mcp",
            "url": "http://localhost:8093",
            "critical": False
        }
    ]
    
    # Create health checker
    health_check = MCPHealthCheck(services)
    
    # Run health endpoint
    asyncio.run(health_check.create_health_endpoint())