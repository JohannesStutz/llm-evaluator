from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models
from .. import schemas

# Try to import the llm library
try:
    import llm
except ImportError:
    llm = None
    print("Warning: llm library not found. Templates will be handled manually.")


class PromptService:
    def create_prompt(self, db: Session, prompt: schemas.PromptCreate) -> models.Prompt:
        """Create a new prompt template with initial version"""
        # Create the prompt
        db_prompt = models.Prompt(
            name=prompt.name,
            description=prompt.description
        )
        db.add(db_prompt)
        db.commit()
        db.refresh(db_prompt)
        
        # Create the initial version (version 1)
        self.create_prompt_version(db, db_prompt.id, schemas.PromptVersionCreate(
            template=prompt.template
        ))
        
        # Optionally save as an llm template if library is available
        if llm is not None:
            try:
                # Extract system prompt if it exists
                if prompt.template.startswith("System:"):
                    try:
                        system_part, prompt_part = prompt.template.split("Prompt:", 1)
                        system_prompt = system_part.replace("System:", "").strip()
                        # Save as an llm template
                        llm.set_alias(prompt.name.lower().replace(" ", "_"), 
                                     {"system": system_prompt})
                    except ValueError:
                        # If splitting fails, don't create a system template
                        pass
            except Exception as e:
                print(f"Could not save as llm template: {e}")
        
        return db_prompt
    
    def get_prompt(self, db: Session, prompt_id: int) -> Optional[models.Prompt]:
        """Get a prompt by ID"""
        return db.query(models.Prompt).filter(models.Prompt.id == prompt_id).first()
    
    def get_prompt_with_versions(self, db: Session, prompt_id: int) -> Optional[Dict[str, Any]]:
        """Get a prompt by ID with all its versions"""
        prompt = self.get_prompt(db, prompt_id)
        if not prompt:
            return None
            
        versions = db.query(models.PromptVersion).filter(
            models.PromptVersion.prompt_id == prompt_id
        ).order_by(models.PromptVersion.version_number).all()
        
        return {
            "id": prompt.id,
            "name": prompt.name,
            "description": prompt.description,
            "versions": versions
        }
    
    def get_prompts(self, db: Session, skip: int = 0, limit: int = 100) -> List[models.Prompt]:
        """Get all prompts with pagination"""
        return db.query(models.Prompt).offset(skip).limit(limit).all()
    
    def update_prompt(self, db: Session, prompt_id: int, prompt: schemas.PromptUpdate) -> Optional[models.Prompt]:
        """Update an existing prompt (metadata only, not versions)"""
        db_prompt = self.get_prompt(db, prompt_id)
        if db_prompt:
            update_data = prompt.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(db_prompt, key, value)
            db.commit()
            db.refresh(db_prompt)
        return db_prompt
    
    def delete_prompt(self, db: Session, prompt_id: int) -> bool:
        """Delete a prompt and all its versions"""
        db_prompt = self.get_prompt(db, prompt_id)
        if not db_prompt:
            return False
        
        # Delete all versions first
        versions = db.query(models.PromptVersion).filter(
            models.PromptVersion.prompt_id == prompt_id
        ).all()
        
        for version in versions:
            db.delete(version)
        
        # Delete the prompt
        db.delete(db_prompt)
        db.commit()
        return True
    
    def create_prompt_version(self, db: Session, prompt_id: int, 
                              version: schemas.PromptVersionCreate) -> models.PromptVersion:
        """Create a new version for an existing prompt"""
        # Verify the prompt exists
        db_prompt = self.get_prompt(db, prompt_id)
        if not db_prompt:
            raise ValueError(f"Prompt with ID {prompt_id} not found")
        
        # Get the next version number
        latest_version = db.query(func.max(models.PromptVersion.version_number)).filter(
            models.PromptVersion.prompt_id == prompt_id
        ).scalar() or 0
        
        next_version = latest_version + 1
        
        # Create the new version
        db_version = models.PromptVersion(
            prompt_id=prompt_id,
            version_number=next_version,
            template=version.template
        )
        db.add(db_version)
        db.commit()
        db.refresh(db_version)
        
        return db_version
    
    def get_prompt_version(self, db: Session, version_id: int) -> Optional[models.PromptVersion]:
        """Get a specific prompt version by ID"""
        return db.query(models.PromptVersion).filter(models.PromptVersion.id == version_id).first()
    
    def get_prompt_versions(self, db: Session, prompt_id: int) -> List[models.PromptVersion]:
        """Get all versions of a prompt"""
        return db.query(models.PromptVersion).filter(
            models.PromptVersion.prompt_id == prompt_id
        ).order_by(models.PromptVersion.version_number).all()
    
    def get_latest_prompt_version(self, db: Session, prompt_id: int) -> Optional[models.PromptVersion]:
        """Get the latest version of a prompt"""
        return db.query(models.PromptVersion).filter(
            models.PromptVersion.prompt_id == prompt_id
        ).order_by(models.PromptVersion.version_number.desc()).first()
    
    def format_prompt(self, template: str, input_text: str) -> Dict[str, Any]:
        """Format a prompt template with input text
        
        Returns a dictionary with:
        - prompt: The formatted prompt text
        - system: Optional system prompt if specified
        """
        # Replace placeholder in template
        prompt = template.replace("{{input}}", input_text)
        
        # Extract system prompt if specified
        system = None
        if prompt.startswith("System:"):
            try:
                system_part, prompt_part = prompt.split("Prompt:", 1)
                system = system_part.replace("System:", "").strip()
                prompt = prompt_part.strip()
            except ValueError:
                # If splitting fails, use the entire prompt
                pass
                
        return {
            "prompt": prompt,
            "system": system
        }
