import time
from typing import List, Dict, Any, Optional

# Try to import the llm library
try:
    import llm
except ImportError:
    llm = None
    print("Warning: llm library not found. Using dummy implementations.")


class LLMService:
    def __init__(self):
        self.models = {}
        self._load_available_models()

    def _load_available_models(self):
        """Load all available models from the llm library"""
        try:
            if llm is None:
                raise ImportError("llm library not installed")

            # Get all available models from the llm library
            available_models = llm.get_models()
            
            # Store models by name for easy lookup
            for model in available_models:
                self.models[model.model_id] = model
                
            if not self.models:
                print("No models found. Loading default models.")
                self._load_default_models()
                
        except Exception as e:
            print(f"Error loading models: {e}")
            # Load some default models for testing if actual loading fails
            self._load_default_models()

    def _load_default_models(self):
        """Load some default models for testing"""
        # This is just a placeholder until we can properly integrate with the llm library
        self.models = {
            "gpt-4o-mini": DummyModel("gpt-4o-mini", "OpenAI GPT-4o mini model"),
            "llama2": DummyModel("llama2", "Local Llama2 model"),
            "mistral": DummyModel("mistral", "Local Mistral model"),
        }

    def get_available_models(self) -> List[Dict[str, Any]]:
        """Return a list of available models"""
        return [
            {"name": model_id, "description": getattr(model, "description", None) or ""}
            for model_id, model in self.models.items()
        ]

    def process_text(
        self, model_name: str, prompt_template: str, input_text: str
    ) -> Dict[str, Any]:
        """Process a single text with a given model and prompt"""
        if model_name not in self.models:
            raise ValueError(f"Model {model_name} not found")

        model = self.models[model_name]

        # Replace placeholder in prompt template
        # The prompt template uses {{input}} as a placeholder
        prompt = prompt_template.replace("{{input}}", input_text)

        # Extract any system prompt if specified in template
        # For example: "System: Be concise\nPrompt: {{input}}"
        system_prompt = None
        if prompt.startswith("System:"):
            try:
                system_part, prompt_part = prompt.split("Prompt:", 1)
                system_prompt = system_part.replace("System:", "").strip()
                prompt = prompt_part.strip()
            except ValueError:
                # If splitting fails, use the entire prompt
                pass

        # Measure processing time
        start_time = time.time()

        # Call the model
        try:
            if llm is not None and not isinstance(model, DummyModel):
                # Use the actual llm library
                if system_prompt:
                    response = model.prompt(prompt, system=system_prompt)
                else:
                    response = model.prompt(prompt)
                
                # Get the full text response
                output = response.text()
                
                # Optionally get token usage information
                try:
                    usage = response.usage()
                    print(f"Token usage - Input: {usage.input}, Output: {usage.output}")
                except Exception as usage_err:
                    print(f"Could not retrieve token usage: {usage_err}")
            else:
                # Use the dummy model for testing
                result = model.generate(prompt, system=system_prompt)
                output = result if isinstance(result, str) else "Dummy response"
        except Exception as e:
            print(f"Error generating output: {e}")
            output = f"Error: {str(e)}"

        processing_time = time.time() - start_time

        return {"text": output, "processing_time": processing_time}


class DummyModel:
    """A dummy model for testing when actual models aren't available"""

    def __init__(self, name, description=None):
        self.name = name
        self.model_id = name
        self.description = description

    def generate(self, prompt, system=None):
        """Simulate generating text"""
        # Add a small delay to simulate processing time
        time.sleep(0.5)

        system_prefix = f"[System: {system}]\n" if system else ""
        
        # Simple mock response based on prompt length
        responses = {
            "gpt-4o-mini": f"{system_prefix}GPT-4o mini summary: This is a simulated response. The input was {len(prompt)} characters long.",
            "llama2": f"{system_prefix}Llama2 summary: Here's a brief summary of the input which had {len(prompt)} characters.",
            "mistral": f"{system_prefix}Mistral processed your input of {len(prompt)} characters and generated this simulated response.",
        }

        return responses.get(self.name, f"{system_prefix}Generated response for {self.name}")
    
    def prompt(self, text, system=None):
        """Implement the llm model's prompt interface for compatibility"""
        result = self.generate(text, system)
        
        # Return an object with a text() method to match llm's API
        class DummyResponse:
            def text(self):
                return result
                
            def usage(self):
                class DummyUsage:
                    def __init__(self):
                        self.input = len(text)
                        self.output = len(result)
                return DummyUsage()
                
        return DummyResponse()
