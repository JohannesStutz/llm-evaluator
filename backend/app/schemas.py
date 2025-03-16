from pydantic import BaseModel, Field
from typing import List, Optional, Union, Dict
from datetime import datetime
from enum import Enum


class QualityRating(str, Enum):
    BAD = "bad"
    OK = "ok"
    GOOD = "good"


# Input set schemas
class InputSetBase(BaseModel):
    name: str
    description: Optional[str] = None


class InputSetCreate(InputSetBase):
    pass


class InputSetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class InputSet(InputSetBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# Input schemas
class InputBase(BaseModel):
    text: str
    name: Optional[str] = None


class InputCreate(InputBase):
    pass


class InputUpdate(BaseModel):
    text: Optional[str] = None
    name: Optional[str] = None
    input_set_id: Optional[int] = None


class Input(InputBase):
    id: int
    input_set_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# InputSet with detailed inputs
class InputSetDetail(InputSet):
    inputs: List[Input] = []


# Model schemas
class LLMModelBase(BaseModel):
    name: str
    description: Optional[str] = None


class LLMModelCreate(LLMModelBase):
    pass


class LLMModel(LLMModelBase):
    id: int

    model_config = {"from_attributes": True}


# Prompt version schemas
class PromptVersionBase(BaseModel):
    template: str
    system_prompt: Optional[str] = None  # Add system prompt field


class PromptVersionCreate(PromptVersionBase):
    pass


class PromptVersion(PromptVersionBase):
    id: int
    prompt_id: int
    version_number: int
    created_at: datetime

    model_config = {"from_attributes": True}


# Prompt schemas
class PromptBase(BaseModel):
    name: str
    description: Optional[str] = None


class PromptCreate(PromptBase):
    template: str  # Initial template for first version
    system_prompt: Optional[str] = None  # Add system prompt field


class PromptUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class Prompt(PromptBase):
    id: int

    model_config = {"from_attributes": True}


class PromptDetail(Prompt):
    versions: List[PromptVersion] = []


# Output schemas
class OutputBase(BaseModel):
    text: str
    processing_time: float


class OutputCreate(OutputBase):
    input_id: int
    model_id: int
    prompt_id: int
    prompt_version_id: Optional[int] = None


class Output(OutputBase):
    id: int
    input_id: int
    model_id: int
    prompt_id: int
    prompt_version_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


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

    model_config = {"from_attributes": True}


# For LLM processing
class ProcessRequest(BaseModel):
    text: str
    model_ids: List[int]
    prompt_ids: List[int]
    prompt_version_ids: Optional[Dict[int, int]] = None  # Map prompt_id to version_id


class BatchProcessRequest(BaseModel):
    texts: List[str]
    model_ids: List[int]
    prompt_ids: List[int]
    prompt_version_ids: Optional[Dict[int, int]] = None


# New: For comparing prompts
class ComparePromptsRequest(BaseModel):
    input_ids: List[int]
    prompt_ids: List[int]
    model_ids: List[int]
    prompt_version_ids: Optional[Dict[int, int]] = None  # Map prompt_id to version_id


class ProcessResult(BaseModel):
    input_id: int
    results: List[Output]
