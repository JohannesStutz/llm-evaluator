from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from .. import models
from .. import schemas
from .llm_service import LLMService

class EvaluationService:
    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
    
    def create_input(self, db: Session, input_data: schemas.InputCreate) -> models.Input:
        """Create a new input text"""
        db_input = models.Input(text=input_data.text)
        db.add(db_input)
        db.commit()
        db.refresh(db_input)
        return db_input
    
    def get_input(self, db: Session, input_id: int) -> Optional[models.Input]:
        """Get an input by ID"""
        return db.query(models.Input).filter(models.Input.id == input_id).first()
    
    def create_model(self, db: Session, model_data: schemas.LLMModelCreate) -> models.LLMModel:
        """Create a new model entry"""
        db_model = models.LLMModel(name=model_data.name, description=model_data.description)
        db.add(db_model)
        db.commit()
        db.refresh(db_model)
        return db_model
    
    def get_model(self, db: Session, model_id: int) -> Optional[models.LLMModel]:
        """Get a model by ID"""
        return db.query(models.LLMModel).filter(models.LLMModel.id == model_id).first()
    
    def get_models(self, db: Session, skip: int = 0, limit: int = 100) -> List[models.LLMModel]:
        """Get all models with pagination"""
        return db.query(models.LLMModel).offset(skip).limit(limit).all()
    
    def process_text(self, db: Session, request: schemas.ProcessRequest) -> Dict[str, Any]:
        """Process a single text with multiple models and prompts"""
        # Create input
        db_input = models.Input(text=request.text)
        db.add(db_input)
        db.commit()
        db.refresh(db_input)
        
        results = []
        
        # Process with each model and prompt combination
        for model_id in request.model_ids:
            db_model = self.get_model(db, model_id)
            if not db_model:
                continue
                
            for prompt_id in request.prompt_ids:
                db_prompt = db.query(models.Prompt).filter(models.Prompt.id == prompt_id).first()
                if not db_prompt:
                    continue
                
                # Process with the LLM service
                output_data = self.llm_service.process_text(
                    db_model.name,
                    db_prompt.template,
                    request.text
                )
                
                # Create output record
                db_output = models.Output(
                    input_id=db_input.id,
                    model_id=model_id,
                    prompt_id=prompt_id,
                    text=output_data["text"],
                    processing_time=output_data["processing_time"]
                )
                db.add(db_output)
                db.commit()
                db.refresh(db_output)
                
                results.append(db_output)
        
        return {
            "input_id": db_input.id,
            "results": results
        }
    
    def batch_process(self, db: Session, request: schemas.BatchProcessRequest) -> List[Dict[str, Any]]:
        """Process multiple texts with multiple models and prompts"""
        results = []
        
        for text in request.texts:
            process_request = schemas.ProcessRequest(
                text=text,
                model_ids=request.model_ids,
                prompt_ids=request.prompt_ids
            )
            result = self.process_text(db, process_request)
            results.append(result)
        
        return results
    
    def create_evaluation(self, db: Session, evaluation: schemas.EvaluationCreate) -> models.Evaluation:
        """Create or update an evaluation for an output"""
        # Check if evaluation already exists
        db_eval = db.query(models.Evaluation).filter(models.Evaluation.output_id == evaluation.output_id).first()
        
        if db_eval:
            # Update existing evaluation
            db_eval.quality = evaluation.quality
            db_eval.notes = evaluation.notes
        else:
            # Create new evaluation
            db_eval = models.Evaluation(
                output_id=evaluation.output_id,
                quality=evaluation.quality,
                notes=evaluation.notes
            )
            db.add(db_eval)
            
        db.commit()
        db.refresh(db_eval)
        return db_eval
    
    def get_evaluations(self, db: Session, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all evaluations with related data"""
        evaluations = db.query(models.Evaluation).offset(skip).limit(limit).all()
        
        result = []
        for eval in evaluations:
            output = eval.output
            result.append({
                "id": eval.id,
                "quality": eval.quality.value,
                "notes": eval.notes,
                "created_at": eval.created_at,
                "output": {
                    "id": output.id,
                    "text": output.text,
                    "processing_time": output.processing_time,
                    "input": {
                        "id": output.input.id,
                        "text": output.input.text
                    },
                    "model": {
                        "id": output.model.id,
                        "name": output.model.name
                    },
                    "prompt": {
                        "id": output.prompt.id,
                        "name": output.prompt.name
                    }
                }
            })
        
        return result
