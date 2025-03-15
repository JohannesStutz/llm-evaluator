import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from .. import models
from .. import schemas
from .llm_service import LLMService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EvaluationService:
    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        logger.info("EvaluationService initialized")
    
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
        # IMPORTANT FIX: First ensure LLM models are synchronized with the database
        self.sync_models_with_db(db)
        
        return db.query(models.LLMModel).offset(skip).limit(limit).all()
    
    def sync_models_with_db(self, db: Session) -> None:
        """Synchronize models from LLMService with the database"""
        logger.info("Synchronizing models with database")
        
        # Get models from LLMService
        service_models = self.llm_service.get_available_models()
        logger.info(f"Found {len(service_models)} models from LLMService")
        
        # Get existing models from database
        db_models = db.query(models.LLMModel).all()
        db_model_names = {model.name for model in db_models}
        
        # Add missing models to database
        models_added = 0
        for model_info in service_models:
            if model_info["name"] not in db_model_names:
                logger.info(f"Adding new model to database: {model_info['name']}")
                db_model = models.LLMModel(
                    name=model_info["name"],
                    description=model_info["description"]
                )
                db.add(db_model)
                models_added += 1
        
        if models_added > 0:
            logger.info(f"Added {models_added} new models to database")
            db.commit()
        else:
            logger.info("No new models to add to database")
    
    def process_text(self, db: Session, request: schemas.ProcessRequest) -> Dict[str, Any]:
        """Process a single text with multiple models and prompts"""
        logger.info(f"Processing text with {len(request.model_ids)} models and {len(request.prompt_ids)} prompts")
        
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
                logger.warning(f"Model with ID {model_id} not found")
                continue
                
            for prompt_id in request.prompt_ids:
                db_prompt = db.query(models.Prompt).filter(models.Prompt.id == prompt_id).first()
                if not db_prompt:
                    logger.warning(f"Prompt with ID {prompt_id} not found")
                    continue
                
                logger.info(f"Processing with model: {db_model.name}, prompt: {db_prompt.name}")
                
                # Process with the LLM service
                try:
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
                    
                    # Load relationships for the response
                    db_output.model = db_model
                    db_output.prompt = db_prompt
                    db_output.input = db_input
                    
                    results.append(db_output)
                    logger.info(f"Processing successful, output length: {len(output_data['text'])} chars")
                except Exception as e:
                    logger.exception(f"Error processing text: {e}")
        
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
