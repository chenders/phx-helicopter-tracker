from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
from typing import List

from app.core.config import settings
from app.api import api_router
from app.db.database import engine
from app.models import Base
from app.services.websocket_manager import WebSocketManager

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Phoenix PD Helicopter Tracker - Comprehensive Platform",
    description="Real-time helicopter surveillance tracking and analysis platform",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")

# WebSocket manager for real-time updates
websocket_manager = WebSocketManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)

            # Handle different message types
            if message.get("type") == "subscribe_area":
                # Subscribe to helicopter activity in a specific area
                await websocket_manager.subscribe_to_area(
                    websocket, message.get("area")
                )
            elif message.get("type") == "unsubscribe_area":
                await websocket_manager.unsubscribe_from_area(
                    websocket, message.get("area")
                )

    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)


@app.get("/")
async def root():
    return {
        "message": "Phoenix PD Helicopter Tracker - Comprehensive Platform",
        "version": "1.0.0",
        "status": "operational",
        "features": [
            "Real-time ADS-B tracking",
            "Historical flight analysis",
            "Pattern detection",
            "Cost analysis",
            "Legal documentation",
            "Community reporting",
        ],
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": "2025-08-26"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=9000)
