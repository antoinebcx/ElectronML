from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TrainingConfig(BaseModel):
    model_type: str
    parameters: dict

@app.post("/train")
async def train_model(config: TrainingConfig):
    # Add your training logic here
    return {"status": "training started"}