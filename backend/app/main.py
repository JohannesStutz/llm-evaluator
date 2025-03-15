from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
from database import engine, get_db
from services.llm_service import LLMService
from services.prompt_service import PromptService
from services.evaluation_service import EvaluationService

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(title="LLM Evaluator")

# Add CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
llm_service = LLMService()
prompt_service = PromptService()
evaluation_service = EvaluationService(llm_service)

# Model endpoints
@app.get("/models/", response_model=List[schemas.LLMModel])
def get_models(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return evaluation_service.get_models(db, skip=skip, limit=limit)

@app.post("/models/", response_model=schemas.LLMModel)
def create_model(model: schemas.LLMModelCreate, db: Session = Depends(get_db)):
    return evaluation_service.create_model(db, model)

# Prompt endpoints
@app.get("/prompts/", response_model=List[schemas.Prompt])
def get_prompts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return prompt_service.get_prompts(db, skip=skip, limit=limit)

@app.post("/prompts/", response_model=schemas.Prompt)
def create_prompt(prompt: schemas.PromptCreate, db: Session = Depends(get_db)):
    return prompt_service.create_prompt(db, prompt)

@app.put("/prompts/{prompt_id}", response_model=schemas.Prompt)
def update_prompt(prompt_id: int, prompt: schemas.PromptCreate, db: Session = Depends(get_db)):
    db_prompt = prompt_service.update_prompt(db, prompt_id, prompt)
    if db_prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return db_prompt

@app.delete("/prompts/{prompt_id}")
def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    success = prompt_service.delete_prompt(db, prompt_id)
    if not success:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {"detail": "Prompt deleted"}

# Processing endpoints
@app.post("/process/")
def process_text(request: schemas.ProcessRequest, db: Session = Depends(get_db)):
    return evaluation_service.process_text(db, request)

@app.post("/batch-process/")
def batch_process(request: schemas.BatchProcessRequest, db: Session = Depends(get_db)):
    return evaluation_service.batch_process(db, request)

# Evaluation endpoints
@app.post("/evaluations/", response_model=schemas.Evaluation)
def create_evaluation(evaluation: schemas.EvaluationCreate, db: Session = Depends(get_db)):
    return evaluation_service.create_evaluation(db, evaluation)

@app.get("/evaluations/")
def get_evaluations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return evaluation_service.get_evaluations(db, skip=skip, limit=limit)

# For direct running with Python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
