# main.py
import uvicorn
import time
from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware  # Import CORS

# Create a 10MB chunk of dummy data (bytes)
# We create this once at startup
DUMMY_DATA = b'x' * (1024 * 1024 * 10) 

app = FastAPI()

# --- IMPORTANT: Add CORS Middleware ---
# This allows your React app (e.g., from localhost:3000)
# to talk to your FastAPI server (e.g., at localhost:8000)
origins = [
    "http://localhost:3000",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --------------------------------------

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for latency testing.
    It just echoes back any message it receives.
    """
    await websocket.accept()
    try:
        while True:
            # Wait for a message, then immediately send it back
            data = await websocket.receive_text()
            await websocket.send_text(data)
    except Exception:
        print("WebSocket client disconnected")


@app.get("/download")
async def download_test():
    """
    Serves a 10MB file for the download test.
    We return our pre-made DUMMY_DATA.
    """
    return DUMMY_DATA

@app.post("/upload")
async def upload_test(request: Request):
    """
    Accepts and 'discards' data for the upload test.
    We just need to read the stream to completion.
    """
    await request.body()
    return {"status": "upload complete"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)