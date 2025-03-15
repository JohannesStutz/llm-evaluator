from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

# Import database and models
from .database import engine, get_db
from . import models
from . import schemas

# Import services
from .services.llm_service import LLMService
from .services.prompt_service import PromptService
from .services.evaluation_service import EvaluationService
from .services.input_service import InputService  # New service

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
input_service = InputService()  # New service
evaluation_service = EvaluationService(llm_service)


# Model endpoints
@app.get("/models/", response_model=List[schemas.LLMModel])
def get_models(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return evaluation_service.get_models(db, skip=skip, limit=limit)


@app.post("/models/", response_model=schemas.LLMModel)
def create_model(model: schemas.LLMModelCreate, db: Session = Depends(get_db)):
    return evaluation_service.create_model(db, model)


# Input set endpoints
@app.get("/input-sets/", response_model=List[schemas.InputSet])
def get_input_sets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return input_service.get_input_sets(db, skip=skip, limit=limit)


@app.post("/input-sets/", response_model=schemas.InputSet)
def create_input_set(input_set: schemas.InputSetCreate, db: Session = Depends(get_db)):
    return input_service.create_input_set(db, input_set)


@app.get("/input-sets/{input_set_id}", response_model=schemas.InputSetDetail)
def get_input_set(input_set_id: int, db: Session = Depends(get_db)):
    input_set = input_service.get_input_set_with_inputs(db, input_set_id)
    if input_set is None:
        raise HTTPException(status_code=404, detail="Input set not found")
    return input_set


@app.put("/input-sets/{input_set_id}", response_model=schemas.InputSet)
def update_input_set(
    input_set_id: int, input_set: schemas.InputSetUpdate, db: Session = Depends(get_db)
):
    updated_set = input_service.update_input_set(db, input_set_id, input_set)
    if updated_set is None:
        raise HTTPException(status_code=404, detail="Input set not found")
    return updated_set


@app.delete("/input-sets/{input_set_id}")
def delete_input_set(input_set_id: int, db: Session = Depends(get_db)):
    success = input_service.delete_input_set(db, input_set_id)
    if not success:
        raise HTTPException(status_code=404, detail="Input set not found")
    return {"detail": "Input set deleted"}


# Input endpoints
@app.post("/inputs/", response_model=schemas.Input)
def create_input(input_data: schemas.InputCreate, db: Session = Depends(get_db)):
    return input_service.create_input(db, input_data)


@app.post("/input-sets/{input_set_id}/inputs", response_model=schemas.Input)
def create_input_in_set(
    input_set_id: int, input_data: schemas.InputCreate, db: Session = Depends(get_db)
):
    try:
        return input_service.create_input_in_set(db, input_set_id, input_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/inputs/", response_model=List[schemas.Input])
def get_inputs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return input_service.get_inputs(db, skip=skip, limit=limit)


@app.get("/input-sets/{input_set_id}/inputs", response_model=List[schemas.Input])
def get_inputs_by_set(
    input_set_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    return input_service.get_inputs_by_set(db, input_set_id, skip, limit)


@app.get("/inputs/{input_id}", response_model=schemas.Input)
def get_input(input_id: int, db: Session = Depends(get_db)):
    input_item = input_service.get_input(db, input_id)
    if input_item is None:
        raise HTTPException(status_code=404, detail="Input not found")
    return input_item


@app.put("/inputs/{input_id}", response_model=schemas.Input)
def update_input(
    input_id: int, input_data: schemas.InputUpdate, db: Session = Depends(get_db)
):
    updated_input = input_service.update_input(db, input_id, input_data)
    if updated_input is None:
        raise HTTPException(status_code=404, detail="Input not found")
    return updated_input


@app.delete("/inputs/{input_id}")
def delete_input(input_id: int, db: Session = Depends(get_db)):
    success = input_service.delete_input(db, input_id)
    if not success:
        raise HTTPException(status_code=404, detail="Input not found")
    return {"detail": "Input deleted"}


# Prompt endpoints
@app.get("/prompts/", response_model=List[schemas.Prompt])
def get_prompts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return prompt_service.get_prompts(db, skip=skip, limit=limit)


@app.post("/prompts/", response_model=schemas.Prompt)
def create_prompt(prompt: schemas.PromptCreate, db: Session = Depends(get_db)):
    return prompt_service.create_prompt(db, prompt)


@app.get("/prompts/{prompt_id}", response_model=schemas.PromptDetail)
def get_prompt(prompt_id: int, db: Session = Depends(get_db)):
    prompt_detail = prompt_service.get_prompt_with_versions(db, prompt_id)
    if prompt_detail is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt_detail


@app.put("/prompts/{prompt_id}", response_model=schemas.Prompt)
def update_prompt(
    prompt_id: int, prompt: schemas.PromptUpdate, db: Session = Depends(get_db)
):
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


# Prompt version endpoints
@app.get("/prompts/{prompt_id}/versions", response_model=List[schemas.PromptVersion])
def get_prompt_versions(prompt_id: int, db: Session = Depends(get_db)):
    return prompt_service.get_prompt_versions(db, prompt_id)


@app.post("/prompts/{prompt_id}/versions", response_model=schemas.PromptVersion)
def create_prompt_version(
    prompt_id: int, version: schemas.PromptVersionCreate, db: Session = Depends(get_db)
):
    try:
        return prompt_service.create_prompt_version(db, prompt_id, version)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/prompt-versions/{version_id}", response_model=schemas.PromptVersion)
def get_prompt_version(version_id: int, db: Session = Depends(get_db)):
    version = prompt_service.get_prompt_version(db, version_id)
    if version is None:
        raise HTTPException(status_code=404, detail="Prompt version not found")
    return version


# Processing endpoints
@app.post("/process/")
def process_text(request: schemas.ProcessRequest, db: Session = Depends(get_db)):
    return evaluation_service.process_text(db, request)


@app.post("/batch-process/")
def batch_process(request: schemas.BatchProcessRequest, db: Session = Depends(get_db)):
    return evaluation_service.batch_process(db, request)


# New: Prompt comparison endpoint
@app.post("/compare-prompts/")
def compare_prompts(
    request: schemas.ComparePromptsRequest, db: Session = Depends(get_db)
):
    """
    Compare multiple prompts on the same input(s)
    """
    return evaluation_service.compare_prompts(db, request)


# Evaluation endpoints
@app.post("/evaluations/", response_model=schemas.Evaluation)
def create_evaluation(
    evaluation: schemas.EvaluationCreate, db: Session = Depends(get_db)
):
    return evaluation_service.create_evaluation(db, evaluation)


@app.get("/evaluations/")
def get_evaluations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return evaluation_service.get_evaluations(db, skip=skip, limit=limit)


# Input history endpoint
@app.get("/inputs/{input_id}/history")
def get_input_history(input_id: int, db: Session = Depends(get_db)):
    """
    Get historical results for a specific input
    """
    return evaluation_service.get_input_history(db, input_id)


# For direct running with Python
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
