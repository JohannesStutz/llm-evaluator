from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
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
        """Create a new prompt template"""
        db_prompt = models.Prompt(
            name=prompt.name,
            template=prompt.template,
            description=prompt.description
        )
        db.add(db_prompt)
        db.commit()
        db.refresh(db_prompt)
        
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
