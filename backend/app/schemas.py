from pydantic import BaseModel
from typing import List, Optional, Union
from datetime import datetime
from enum import Enum

class QualityRating(str, Enum):
    BAD = "bad"
    OK = "ok"
    GOOD = "good"

# Input schemas
class InputBase(BaseModel):
    text: str

class InputCreate(InputBase):
    pass

class Input(InputBase):
    id: int
    created_at: datetime
    
    class Config:
        orm_mode = True

# Model schemas
class LLMModelBase(BaseModel):
    name: str
    description: Optional[str] = None

class LLMModelCreate(LLMModelBase):
    pass

class LLMModel(LLMModelBase):
    id: int
    
    class Config:
        orm_mode = True

# Prompt schemas
class PromptBase(BaseModel):
    name: str
    template: str
    description: Optional[str] = None

class PromptCreate(PromptBase):
    pass

class Prompt(PromptBase):
    id: int
    
    class Config:
        orm_mode = True

# Output schemas
class OutputBase(BaseModel):
    text: str
    processing_time: float

class OutputCreate(OutputBase):
    input_id: int
    model_id: int
    prompt_id: int

class Output(OutputBase):
    id: int
    input_id: int
    model_id: int
    prompt_id: int
    created_at: datetime
    
    class Config:
        orm_mode = True

# Evaluation schemas
class EvaluationBase(BaseModel):
    quality: QualityRating
    notes: Optional[str] = None

class EvaluationCreate(EvaluationBase):
    output_id: int

class Evaluation(EvaluationBase):
    id: int
    output_id: int
    created_at: datetime
    
    class Config:
        orm_mode = True

# For LLM processing
class ProcessRequest(BaseModel):
    text: str
    model_ids: List[int]
    prompt_ids: List[int]

class BatchProcessRequest(BaseModel):
    texts: List[str]
    model_ids: List[int]
    prompt_ids: List[int]

class ProcessResult(BaseModel):
    input_id: int
    results: List[Output]
