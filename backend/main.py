# main.py
import uvicorn
import io
from fastapi import FastAPI, WebSocket, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

DUMMY_DATA = b'x' * (1024 * 1024 * 10)

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://localhost",
    "https://cn-app-bay.vercel.app",  # 👈 add your actual Vercel URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(data)
    except Exception:
        print("WebSocket client disconnected")

@app.get("/download")
async def download_test():
    return StreamingResponse(io.BytesIO(DUMMY_DATA), media_type="application/octet-stream")

@app.post("/upload")
async def upload_test(request: Request):
    await request.body()
    return {"status": "upload complete"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
