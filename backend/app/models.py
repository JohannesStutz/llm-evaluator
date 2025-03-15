from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime, Enum
from sqlalchemy.orm import relationship
import datetime
import enum
from database import Base

class QualityRating(enum.Enum):
    BAD = "bad"
    OK = "ok"
    GOOD = "good"

class Input(Base):
    __tablename__ = "inputs"
    
    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    outputs = relationship("Output", back_populates="input")

class LLMModel(Base):
    __tablename__ = "models"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    
    outputs = relationship("Output", back_populates="model")

class Prompt(Base):
    __tablename__ = "prompts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    template = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    
    outputs = relationship("Output", back_populates="prompt")

class Output(Base):
    __tablename__ = "outputs"
    
    id = Column(Integer, primary_key=True, index=True)
    input_id = Column(Integer, ForeignKey("inputs.id"))
    model_id = Column(Integer, ForeignKey("models.id"))
    prompt_id = Column(Integer, ForeignKey("prompts.id"))
    text = Column(Text, nullable=False)
    processing_time = Column(Float)  # Time in seconds
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    input = relationship("Input", back_populates="outputs")
    model = relationship("LLMModel", back_populates="outputs")
    prompt = relationship("Prompt", back_populates="outputs")
    evaluation = relationship("Evaluation", back_populates="output", uselist=False)

class Evaluation(Base):
    __tablename__ = "evaluations"
    
    id = Column(Integer, primary_key=True, index=True)
    output_id = Column(Integer, ForeignKey("outputs.id"))
    quality = Column(Enum(QualityRating))
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    output = relationship("Output", back_populates="evaluation")
