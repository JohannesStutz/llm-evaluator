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
        # Debug log
        print(
            f"Creating prompt: {prompt.name} with system_prompt: {prompt.system_prompt}"
        )

        # Create the prompt
        db_prompt = models.Prompt(name=prompt.name, description=prompt.description)
        db.add(db_prompt)
        db.commit()
        db.refresh(db_prompt)

        # Create the initial version (version 1) with system_prompt
        version = schemas.PromptVersionCreate(
            template=prompt.template, system_prompt=prompt.system_prompt
        )
        print(
            f"Creating version with template: {prompt.template[:50]}... and system_prompt: {prompt.system_prompt}"
        )
        self.create_prompt_version(db, db_prompt.id, version)

        # Skip the llm template creation for now to avoid errors

        return db_prompt

    def create_prompt_version(
        self, db: Session, prompt_id: int, version: schemas.PromptVersionCreate
    ) -> models.PromptVersion:
        """Create a new version for an existing prompt"""
        # Debug log
        print(
            f"Creating prompt version for prompt {prompt_id} with system_prompt: {version.system_prompt}"
        )

        # Verify the prompt exists
        db_prompt = self.get_prompt(db, prompt_id)
        if not db_prompt:
            raise ValueError(f"Prompt with ID {prompt_id} not found")

        # Get the next version number
        latest_version = (
            db.query(func.max(models.PromptVersion.version_number))
            .filter(models.PromptVersion.prompt_id == prompt_id)
            .scalar()
            or 0
        )

        next_version = latest_version + 1

        # Create the new version with system_prompt
        db_version = models.PromptVersion(
            prompt_id=prompt_id,
            version_number=next_version,
            template=version.template,
            system_prompt=version.system_prompt,
        )
        db.add(db_version)
        db.commit()
        db.refresh(db_version)

        return db_version

    def get_prompt(self, db: Session, prompt_id: int) -> Optional[models.Prompt]:
        """Get a prompt by ID"""
        return db.query(models.Prompt).filter(models.Prompt.id == prompt_id).first()

    def get_prompt_with_versions(
        self, db: Session, prompt_id: int
    ) -> Optional[Dict[str, Any]]:
        """Get a prompt by ID with all its versions"""
        prompt = self.get_prompt(db, prompt_id)
        if not prompt:
            return None

        versions = (
            db.query(models.PromptVersion)
            .filter(models.PromptVersion.prompt_id == prompt_id)
            .order_by(models.PromptVersion.version_number)
            .all()
        )

        return {
            "id": prompt.id,
            "name": prompt.name,
            "description": prompt.description,
            "versions": versions,
        }

    def get_prompts(
        self, db: Session, skip: int = 0, limit: int = 100
    ) -> List[models.Prompt]:
        """Get all prompts with pagination"""
        return db.query(models.Prompt).offset(skip).limit(limit).all()

    def update_prompt(
        self, db: Session, prompt_id: int, prompt: schemas.PromptUpdate
    ) -> Optional[models.Prompt]:
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
        versions = (
            db.query(models.PromptVersion)
            .filter(models.PromptVersion.prompt_id == prompt_id)
            .all()
        )

        for version in versions:
            db.delete(version)

        # Delete the prompt
        db.delete(db_prompt)
        db.commit()
        return True

    def create_prompt_version(
        self, db: Session, prompt_id: int, version: schemas.PromptVersionCreate
    ) -> models.PromptVersion:
        """Create a new version for an existing prompt"""
        # Verify the prompt exists
        db_prompt = self.get_prompt(db, prompt_id)
        if not db_prompt:
            raise ValueError(f"Prompt with ID {prompt_id} not found")

        # Get the next version number
        latest_version = (
            db.query(func.max(models.PromptVersion.version_number))
            .filter(models.PromptVersion.prompt_id == prompt_id)
            .scalar()
            or 0
        )

        next_version = latest_version + 1

        # Create the new version
        db_version = models.PromptVersion(
            prompt_id=prompt_id, version_number=next_version, template=version.template
        )
        db.add(db_version)
        db.commit()
        db.refresh(db_version)

        return db_version

    def get_prompt_version(
        self, db: Session, version_id: int
    ) -> Optional[models.PromptVersion]:
        """Get a specific prompt version by ID"""
        return (
            db.query(models.PromptVersion)
            .filter(models.PromptVersion.id == version_id)
            .first()
        )

    def get_prompt_versions(
        self, db: Session, prompt_id: int
    ) -> List[models.PromptVersion]:
        """Get all versions of a prompt"""
        return (
            db.query(models.PromptVersion)
            .filter(models.PromptVersion.prompt_id == prompt_id)
            .order_by(models.PromptVersion.version_number)
            .all()
        )

    def get_latest_prompt_version(
        self, db: Session, prompt_id: int
    ) -> Optional[models.PromptVersion]:
        """Get the latest version of a prompt"""
        return (
            db.query(models.PromptVersion)
            .filter(models.PromptVersion.prompt_id == prompt_id)
            .order_by(models.PromptVersion.version_number.desc())
            .first()
        )

    def format_prompt(
        self, template: str, input_text: str, system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """Format a prompt template with input text

        Returns a dictionary with:
        - prompt: The formatted prompt text
        - system: System prompt if specified
        """
        # Replace placeholder in template
        prompt = template.replace("{{input}}", input_text)

        # Use the provided system_prompt
        system = system_prompt

        return {"prompt": prompt, "system": system}
