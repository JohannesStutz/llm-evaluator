from typing import List, Optional
from sqlalchemy.orm import Session
import models
import schemas

class PromptService:
    def create_prompt(self, db: Session, prompt: schemas.PromptCreate) -> models.Prompt:
        """Create a new prompt template"""
        db_prompt = models.Prompt(
            name=prompt.name,
            template=prompt.template,
            description=prompt.description
        )
        db.add(db_prompt)
        db.commit()
        db.refresh(db_prompt)
        return db_prompt
    
    def get_prompt(self, db: Session, prompt_id: int) -> Optional[models.Prompt]:
        """Get a prompt by ID"""
        return db.query(models.Prompt).filter(models.Prompt.id == prompt_id).first()
    
    def get_prompts(self, db: Session, skip: int = 0, limit: int = 100) -> List[models.Prompt]:
        """Get all prompts with pagination"""
        return db.query(models.Prompt).offset(skip).limit(limit).all()
    
    def update_prompt(self, db: Session, prompt_id: int, prompt: schemas.PromptCreate) -> Optional[models.Prompt]:
        """Update an existing prompt"""
        db_prompt = self.get_prompt(db, prompt_id)
        if db_prompt:
            db_prompt.name = prompt.name
            db_prompt.template = prompt.template
            db_prompt.description = prompt.description
            db.commit()
            db.refresh(db_prompt)
        return db_prompt
    
    def delete_prompt(self, db: Session, prompt_id: int) -> bool:
        """Delete a prompt"""
        db_prompt = self.get_prompt(db, prompt_id)
        if db_prompt:
            db.delete(db_prompt)
            db.commit()
            return True
        return False
