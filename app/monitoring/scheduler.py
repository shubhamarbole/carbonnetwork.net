"""
Monitoring Scheduler
Integrates APScheduler for scheduled background sweeps and on-demand execution.
Phase 6: Proactive Monitoring & Event Detection
"""

import logging
import threading
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger("monitoring_scheduler")


class MonitoringScheduler:
    """Manages periodic background monitoring sweeps using APScheduler."""

    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.is_running = False
        self._lock = threading.Lock()
        self.sweep_callbacks: List[Callable[[], None]] = []
        self.last_sweep_time: Optional[datetime] = None
        self.last_sweep_status: str = "IDLE"

    def register_sweep_callback(self, callback: Callable[[], None]) -> None:
        """Registers a callback function to run during monitoring sweeps."""
        self.sweep_callbacks.append(callback)

    def start(self) -> None:
        """Starts the background scheduler with default recurring schedules."""
        with self._lock:
            if not self.is_running:
                # Add recurring sweeps
                # Hourly health/delta check
                self.scheduler.add_job(
                    self.execute_sweep,
                    trigger=IntervalTrigger(hours=1),
                    id="hourly_sweep",
                    name="Hourly Monitoring Sweep",
                    replace_existing=True
                )
                # Daily comprehensive sweep
                self.scheduler.add_job(
                    self.execute_sweep,
                    trigger=CronTrigger(hour=0, minute=0),
                    id="daily_midnight_sweep",
                    name="Daily Comprehensive Sweep",
                    replace_existing=True
                )
                self.scheduler.start()
                self.is_running = True
                logger.info("MonitoringScheduler started with hourly and daily sweeps.")

    def shutdown(self) -> None:
        """Gracefully shuts down the background scheduler."""
        with self._lock:
            if self.is_running:
                try:
                    self.scheduler.shutdown(wait=False)
                except Exception as e:
                    logger.warning(f"Error shutting down scheduler: {e}")
                self.is_running = False
                logger.info("MonitoringScheduler stopped.")

    def execute_sweep(self) -> Dict[str, Any]:
        """Executes all registered sweep callbacks."""
        self.last_sweep_time = datetime.utcnow()
        self.last_sweep_status = "RUNNING"
        executed = 0
        errors = 0

        for cb in self.sweep_callbacks:
            try:
                cb()
                executed += 1
            except Exception as e:
                logger.error(f"Error during sweep callback execution: {e}")
                errors += 1

        self.last_sweep_status = "SUCCESS" if errors == 0 else "PARTIAL_FAILURE"
        return {
            "status": self.last_sweep_status,
            "executed_callbacks": executed,
            "errors": errors,
            "timestamp": self.last_sweep_time.isoformat()
        }

    def trigger_on_demand(self) -> Dict[str, Any]:
        """Manually triggers an immediate on-demand monitoring sweep."""
        logger.info("Triggering on-demand monitoring sweep...")
        return self.execute_sweep()


default_monitoring_scheduler = MonitoringScheduler()
