from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime, Enum
from sqlalchemy.orm import relationship
import datetime
import enum
from .database import Base


class QualityRating(enum.Enum):
    BAD = "bad"
    OK = "ok"
    GOOD = "good"


# New: Input Set model for grouping related inputs
class InputSet(Base):
    __tablename__ = "input_sets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    inputs = relationship("Input", back_populates="input_set")


# Updated Input model with reference to InputSet
class Input(Base):
    __tablename__ = "inputs"

    id = Column(Integer, primary_key=True, index=True)
    input_set_id = Column(Integer, ForeignKey("input_sets.id"), nullable=True)
    text = Column(Text, nullable=False)
    name = Column(String, nullable=True)  # Optional name for identification
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    input_set = relationship("InputSet", back_populates="inputs")
    outputs = relationship("Output", back_populates="input")


class LLMModel(Base):
    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)

    outputs = relationship("Output", back_populates="model")


# Updated Prompt model with versioning support
class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)

    # New relationship to versions
    versions = relationship("PromptVersion", back_populates="prompt")
    outputs = relationship("Output", back_populates="prompt")


class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id"))
    version_number = Column(Integer)
    template = Column(Text, nullable=False)
    system_prompt = Column(Text, nullable=True)  # New field for system prompts
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    prompt = relationship("Prompt", back_populates="versions")
    outputs = relationship("Output", back_populates="prompt_version")


# Updated Output model with reference to PromptVersion
class Output(Base):
    __tablename__ = "outputs"

    id = Column(Integer, primary_key=True, index=True)
    input_id = Column(Integer, ForeignKey("inputs.id"))
    model_id = Column(Integer, ForeignKey("models.id"))
    prompt_id = Column(Integer, ForeignKey("prompts.id"))
    prompt_version_id = Column(Integer, ForeignKey("prompt_versions.id"), nullable=True)
    text = Column(Text, nullable=False)
    processing_time = Column(Float)  # Time in seconds
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    input = relationship("Input", back_populates="outputs")
    model = relationship("LLMModel", back_populates="outputs")
    prompt = relationship("Prompt", back_populates="outputs")
    prompt_version = relationship("PromptVersion", back_populates="outputs")
    evaluation = relationship("Evaluation", back_populates="output", uselist=False)


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    output_id = Column(Integer, ForeignKey("outputs.id"))
    quality = Column(String, nullable=False)  # Change from Enum to String
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    output = relationship("Output", back_populates="evaluation")
