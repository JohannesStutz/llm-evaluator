import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from .. import models
from .. import schemas

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class InputService:
    def __init__(self):
        logger.info("InputService initialized")
    
    def get_input_sets(self, db: Session, skip: int = 0, limit: int = 100) -> List[models.InputSet]:
        """Get all input sets with pagination"""
        return db.query(models.InputSet).offset(skip).limit(limit).all()
    
    def create_input_set(self, db: Session, input_set: schemas.InputSetCreate) -> models.InputSet:
        """Create a new input set"""
        db_input_set = models.InputSet(
            name=input_set.name,
            description=input_set.description
        )
        db.add(db_input_set)
        db.commit()
        db.refresh(db_input_set)
        logger.info(f"Created input set: {db_input_set.name} (ID: {db_input_set.id})")
        return db_input_set
    
    def get_input_set(self, db: Session, input_set_id: int) -> Optional[models.InputSet]:
        """Get an input set by ID with its inputs"""
        return db.query(models.InputSet).filter(models.InputSet.id == input_set_id).first()
    
    def get_input_set_with_inputs(self, db: Session, input_set_id: int) -> Optional[dict]:
        """Get an input set by ID with all its inputs"""
        input_set = self.get_input_set(db, input_set_id)
        if not input_set:
            return None
            
        inputs = db.query(models.Input).filter(
            models.Input.input_set_id == input_set_id
        ).all()
        
        return {
            "id": input_set.id,
            "name": input_set.name,
            "description": input_set.description,
            "created_at": input_set.created_at,
            "inputs": inputs
        }
    
    def update_input_set(self, db: Session, input_set_id: int, 
                         input_set: schemas.InputSetUpdate) -> Optional[models.InputSet]:
        """Update an input set"""
        db_input_set = self.get_input_set(db, input_set_id)
        if not db_input_set:
            return None
            
        update_data = input_set.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_input_set, key, value)
            
        db.commit()
        db.refresh(db_input_set)
        logger.info(f"Updated input set: {db_input_set.name} (ID: {db_input_set.id})")
        return db_input_set
    
    def delete_input_set(self, db: Session, input_set_id: int) -> bool:
        """Delete an input set"""
        db_input_set = self.get_input_set(db, input_set_id)
        if not db_input_set:
            return False
            
        # Check if there are inputs in this set
        inputs = db.query(models.Input).filter(
            models.Input.input_set_id == input_set_id
        ).all()
        
        if inputs:
            # Option 1: Delete all inputs in the set
            for input_item in inputs:
                db.delete(input_item)
            
            # Option 2: Set input_set_id to None
            # for input_item in inputs:
            #     input_item.input_set_id = None
            
        db.delete(db_input_set)
        db.commit()
        logger.info(f"Deleted input set: ID {input_set_id}")
        return True
    
    def create_input(self, db: Session, input_data: schemas.InputCreate) -> models.Input:
        """Create a new input"""
        db_input = models.Input(
            text=input_data.text,
            name=input_data.name
        )
        db.add(db_input)
        db.commit()
        db.refresh(db_input)
        logger.info(f"Created input: ID {db_input.id}")
        return db_input
    
    def create_input_in_set(self, db: Session, input_set_id: int, 
                            input_data: schemas.InputCreate) -> models.Input:
        """Create a new input in a specific set"""
        # Verify the input set exists
        db_input_set = self.get_input_set(db, input_set_id)
        if not db_input_set:
            raise ValueError(f"Input set with ID {input_set_id} not found")
            
        db_input = models.Input(
            input_set_id=input_set_id,
            text=input_data.text,
            name=input_data.name
        )
        db.add(db_input)
        db.commit()
        db.refresh(db_input)
        logger.info(f"Created input in set {input_set_id}: Input ID {db_input.id}")
        return db_input
    
    def get_input(self, db: Session, input_id: int) -> Optional[models.Input]:
        """Get an input by ID"""
        return db.query(models.Input).filter(models.Input.id == input_id).first()
    
    def get_inputs(self, db: Session, skip: int = 0, limit: int = 100) -> List[models.Input]:
        """Get all inputs with pagination"""
        return db.query(models.Input).offset(skip).limit(limit).all()
    
    def get_inputs_by_set(self, db: Session, input_set_id: int, 
                          skip: int = 0, limit: int = 100) -> List[models.Input]:
        """Get all inputs in a specific set"""
        return db.query(models.Input).filter(
            models.Input.input_set_id == input_set_id
        ).offset(skip).limit(limit).all()
    
    def update_input(self, db: Session, input_id: int, 
                     input_data: schemas.InputUpdate) -> Optional[models.Input]:
        """Update an input"""
        db_input = self.get_input(db, input_id)
        if not db_input:
            return None
            
        update_data = input_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_input, key, value)
            
        db.commit()
        db.refresh(db_input)
        logger.info(f"Updated input: ID {db_input.id}")
        return db_input
    
    def delete_input(self, db: Session, input_id: int) -> bool:
        """Delete an input"""
        db_input = self.get_input(db, input_id)
        if not db_input:
            return False
            
        # Check if there are outputs for this input
        outputs = db.query(models.Output).filter(
            models.Output.input_id == input_id
        ).all()
        
        if outputs:
            # Option 1: Delete all related outputs
            for output in outputs:
                # Also delete evaluations if any
                evaluation = db.query(models.Evaluation).filter(
                    models.Evaluation.output_id == output.id
                ).first()
                
                if evaluation:
                    db.delete(evaluation)
                
                db.delete(output)
        
        db.delete(db_input)
        db.commit()
        logger.info(f"Deleted input: ID {input_id}")
        return True
