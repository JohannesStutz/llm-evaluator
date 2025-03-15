import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from .. import models
from .. import schemas
from .llm_service import LLMService
from .prompt_service import PromptService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EvaluationService:
    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        self.prompt_service = PromptService()
        logger.info("EvaluationService initialized")

    def create_input(
        self, db: Session, input_data: schemas.InputCreate
    ) -> models.Input:
        """Create a new input text"""
        db_input = models.Input(text=input_data.text)
        db.add(db_input)
        db.commit()
        db.refresh(db_input)
        return db_input

    def get_input(self, db: Session, input_id: int) -> Optional[models.Input]:
        """Get an input by ID"""
        return db.query(models.Input).filter(models.Input.id == input_id).first()

    def create_model(
        self, db: Session, model_data: schemas.LLMModelCreate
    ) -> models.LLMModel:
        """Create a new model entry"""
        db_model = models.LLMModel(
            name=model_data.name, description=model_data.description
        )
        db.add(db_model)
        db.commit()
        db.refresh(db_model)
        return db_model

    def get_model(self, db: Session, model_id: int) -> Optional[models.LLMModel]:
        """Get a model by ID"""
        return db.query(models.LLMModel).filter(models.LLMModel.id == model_id).first()

    def get_models(
        self, db: Session, skip: int = 0, limit: int = 100
    ) -> List[models.LLMModel]:
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
                    name=model_info["name"], description=model_info["description"]
                )
                db.add(db_model)
                models_added += 1

        if models_added > 0:
            logger.info(f"Added {models_added} new models to database")
            db.commit()
        else:
            logger.info("No new models to add to database")

    def _get_prompt_version(
        self, db: Session, prompt_id: int, version_id: Optional[int] = None
    ) -> Optional[models.PromptVersion]:
        """Get a specific prompt version or the latest if version_id is None"""
        if version_id:
            return (
                db.query(models.PromptVersion)
                .filter(models.PromptVersion.id == version_id)
                .first()
            )
        else:
            return (
                db.query(models.PromptVersion)
                .filter(models.PromptVersion.prompt_id == prompt_id)
                .order_by(models.PromptVersion.version_number.desc())
                .first()
            )

    def process_text(
        self, db: Session, request: schemas.ProcessRequest
    ) -> Dict[str, Any]:
        """Process a single text with multiple models and prompts"""
        logger.info(
            f"Processing text with {len(request.model_ids)} models and {len(request.prompt_ids)} prompts"
        )

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
                db_prompt = (
                    db.query(models.Prompt)
                    .filter(models.Prompt.id == prompt_id)
                    .first()
                )
                if not db_prompt:
                    logger.warning(f"Prompt with ID {prompt_id} not found")
                    continue

                # Get the specific prompt version or latest
                prompt_version_id = (
                    request.prompt_version_ids.get(str(prompt_id))
                    if request.prompt_version_ids
                    else None
                )
                db_prompt_version = self._get_prompt_version(
                    db, prompt_id, prompt_version_id
                )

                if not db_prompt_version:
                    logger.warning(
                        f"Prompt version not found for prompt ID {prompt_id}"
                    )
                    continue

                logger.info(
                    f"Processing with model: {db_model.name}, prompt: {db_prompt.name}, version: {db_prompt_version.version_number}"
                )

                # Process with the LLM service
                try:
                    output_data = self.llm_service.process_text(
                        db_model.name, db_prompt_version.template, request.text
                    )

                    # Create output record
                    db_output = models.Output(
                        input_id=db_input.id,
                        model_id=model_id,
                        prompt_id=prompt_id,
                        prompt_version_id=db_prompt_version.id,
                        text=output_data["text"],
                        processing_time=output_data["processing_time"],
                    )
                    db.add(db_output)
                    db.commit()
                    db.refresh(db_output)

                    # Load relationships for the response
                    db_output.model = db_model
                    db_output.prompt = db_prompt
                    db_output.input = db_input
                    db_output.prompt_version = db_prompt_version

                    results.append(db_output)
                    logger.info(
                        f"Processing successful, output length: {len(output_data['text'])} chars"
                    )
                except Exception as e:
                    logger.exception(f"Error processing text: {e}")

        return {"input_id": db_input.id, "results": results}

    def batch_process(
        self, db: Session, request: schemas.BatchProcessRequest
    ) -> List[Dict[str, Any]]:
        """Process multiple texts with multiple models and prompts"""
        results = []

        for text in request.texts:
            process_request = schemas.ProcessRequest(
                text=text,
                model_ids=request.model_ids,
                prompt_ids=request.prompt_ids,
                prompt_version_ids=request.prompt_version_ids,
            )
            result = self.process_text(db, process_request)
            results.append(result)

        return results

    def compare_prompts(
        self, db: Session, request: schemas.ComparePromptsRequest
    ) -> List[Dict[str, Any]]:
        """
        Compare multiple prompts on the same set of inputs
        """
        logger.info(
            f"Comparing {len(request.prompt_ids)} prompts on {len(request.input_ids)} inputs using {len(request.model_ids)} models"
        )

        results = []

        for input_id in request.input_ids:
            # Get the input
            db_input = self.get_input(db, input_id)
            if not db_input:
                logger.warning(f"Input with ID {input_id} not found")
                continue

            input_results = {
                "input_id": input_id,
                "input": db_input,
                "prompt_results": [],
            }

            for prompt_id in request.prompt_ids:
                # Get the prompt
                db_prompt = (
                    db.query(models.Prompt)
                    .filter(models.Prompt.id == prompt_id)
                    .first()
                )
                if not db_prompt:
                    logger.warning(f"Prompt with ID {prompt_id} not found")
                    continue

                # Get the specified prompt version or latest
                prompt_version_id = (
                    request.prompt_version_ids.get(str(prompt_id))
                    if request.prompt_version_ids
                    else None
                )
                db_prompt_version = self._get_prompt_version(
                    db, prompt_id, prompt_version_id
                )

                if not db_prompt_version:
                    logger.warning(
                        f"Prompt version not found for prompt ID {prompt_id}"
                    )
                    continue

                for model_id in request.model_ids:
                    # Get the model
                    db_model = self.get_model(db, model_id)
                    if not db_model:
                        logger.warning(f"Model with ID {model_id} not found")
                        continue

                    logger.info(
                        f"Comparing input {input_id} with model {db_model.name}, prompt {db_prompt.name}, version {db_prompt_version.version_number}"
                    )

                    # Check if we already have a result for this combination in the database
                    existing_output = (
                        db.query(models.Output)
                        .filter(
                            models.Output.input_id == input_id,
                            models.Output.model_id == model_id,
                            models.Output.prompt_id == prompt_id,
                            models.Output.prompt_version_id == db_prompt_version.id,
                        )
                        .first()
                    )

                    if existing_output:
                        logger.info(
                            f"Found existing output for this combination, using that"
                        )

                        # Use the existing output
                        prompt_result = {
                            "output_id": existing_output.id,
                            "prompt_id": prompt_id,
                            "prompt_name": db_prompt.name,
                            "prompt_version_id": db_prompt_version.id,
                            "prompt_version_number": db_prompt_version.version_number,
                            "prompt_template": db_prompt_version.template,
                            "model_id": model_id,
                            "model_name": db_model.name,
                            "text": existing_output.text,
                            "processing_time": existing_output.processing_time,
                            "created_at": existing_output.created_at,
                            "is_existing": True,
                        }

                    else:
                        # Process with the LLM service
                        try:
                            # Process the text
                            output_data = self.llm_service.process_text(
                                db_model.name, db_prompt_version.template, db_input.text
                            )

                            # Create output record
                            db_output = models.Output(
                                input_id=input_id,
                                model_id=model_id,
                                prompt_id=prompt_id,
                                prompt_version_id=db_prompt_version.id,
                                text=output_data["text"],
                                processing_time=output_data["processing_time"],
                            )
                            db.add(db_output)
                            db.commit()
                            db.refresh(db_output)

                            prompt_result = {
                                "output_id": db_output.id,
                                "prompt_id": prompt_id,
                                "prompt_name": db_prompt.name,
                                "prompt_version_id": db_prompt_version.id,
                                "prompt_version_number": db_prompt_version.version_number,
                                "prompt_template": db_prompt_version.template,
                                "model_id": model_id,
                                "model_name": db_model.name,
                                "text": db_output.text,
                                "processing_time": db_output.processing_time,
                                "created_at": db_output.created_at,
                                "is_existing": False,
                            }

                            logger.info(
                                f"Processing successful, output length: {len(output_data['text'])} chars"
                            )

                        except Exception as e:
                            logger.exception(f"Error processing comparison: {e}")
                            continue

                    input_results["prompt_results"].append(prompt_result)

            results.append(input_results)

        return results

    def get_input_history(self, db: Session, input_id: int) -> Dict[str, Any]:
        """
        Get historical results for a specific input
        """
        logger.info(f"Getting history for input {input_id}")

        # Get the input
        db_input = self.get_input(db, input_id)
        if not db_input:
            logger.warning(f"Input with ID {input_id} not found")
            return {"input_id": input_id, "input": None, "results": []}

        # Get all outputs for this input
        outputs = (
            db.query(models.Output)
            .filter(models.Output.input_id == input_id)
            .order_by(models.Output.created_at.desc())
            .all()
        )

        results = []
        for output in outputs:
            # Get the prompt version
            prompt_version = None
            if output.prompt_version_id:
                prompt_version = (
                    db.query(models.PromptVersion)
                    .filter(models.PromptVersion.id == output.prompt_version_id)
                    .first()
                )

            # Get evaluation if any
            evaluation = (
                db.query(models.Evaluation)
                .filter(models.Evaluation.output_id == output.id)
                .first()
            )

            result = {
                "output_id": output.id,
                "prompt_id": output.prompt_id,
                "prompt_name": output.prompt.name if output.prompt else None,
                "prompt_version_id": output.prompt_version_id,
                "prompt_version_number": (
                    prompt_version.version_number if prompt_version else None
                ),
                "prompt_template": prompt_version.template if prompt_version else None,
                "model_id": output.model_id,
                "model_name": output.model.name if output.model else None,
                "text": output.text,
                "processing_time": output.processing_time,
                "created_at": output.created_at,
                "evaluation": (
                    {
                        "id": evaluation.id,
                        "quality": evaluation.quality,  # Changed: no more .value
                        "notes": evaluation.notes,
                        "created_at": evaluation.created_at,
                    }
                    if evaluation
                    else None
                ),
            }

            results.append(result)

        return {"input_id": input_id, "input": db_input, "results": results}

    def create_evaluation(
        self, db: Session, evaluation: schemas.EvaluationCreate
    ) -> models.Evaluation:
        """Create or update an evaluation for an output"""
        # Check if evaluation already exists
        db_eval = (
            db.query(models.Evaluation)
            .filter(models.Evaluation.output_id == evaluation.output_id)
            .first()
        )

        # Basic validation
        valid_qualities = [q.value for q in schemas.QualityRating]
        if evaluation.quality not in valid_qualities:
            raise ValueError(f"Invalid quality: {evaluation.quality}")

        if db_eval:
            # Update existing evaluation
            db_eval.quality = evaluation.quality
            db_eval.notes = evaluation.notes
        else:
            # Create new evaluation
            db_eval = models.Evaluation(
                output_id=evaluation.output_id,
                quality=evaluation.quality,
                notes=evaluation.notes,
            )
            db.add(db_eval)

        db.commit()
        db.refresh(db_eval)
        return db_eval

    def get_evaluations(
        self, db: Session, skip: int = 0, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all evaluations with related data"""
        evaluations = db.query(models.Evaluation).offset(skip).limit(limit).all()

        result = []
        for eval in evaluations:
            output = eval.output
            result.append(
                {
                    "id": eval.id,
                    "quality": eval.quality,  # Changed: no more .value
                    "notes": eval.notes,
                    "created_at": eval.created_at,
                    "output": {
                        "id": output.id,
                        "text": output.text,
                        "processing_time": output.processing_time,
                        "input": {"id": output.input.id, "text": output.input.text},
                        "model": {"id": output.model.id, "name": output.model.name},
                        "prompt": {"id": output.prompt.id, "name": output.prompt.name},
                    },
                }
            )

        return result
