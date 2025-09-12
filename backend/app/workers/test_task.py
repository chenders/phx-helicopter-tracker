"""
Simple test task to verify task monitoring
"""
from app.workers.celery_app import celery_app
import time
import random


@celery_app.task(bind=True, name="app.workers.test_task.simple_test")
def simple_test(self):
    """A simple test task that completes quickly"""
    time.sleep(2)  # Simulate some work
    return {
        "status": "success",
        "message": "Test task completed",
        "records_processed": random.randint(10, 100),
        "credits_used": random.randint(5, 50)
    }


@celery_app.task(bind=True, name="app.workers.test_task.failing_test")
def failing_test(self):
    """A test task that always fails"""
    time.sleep(1)
    raise Exception("This is a test failure to verify error tracking")