import requests
import json
from typing import Dict, List, Any, Optional
from enum import Enum

BASE_URL = "http://localhost:8000"


# Define the same enums as in the backend for consistency
class QualityRating(str, Enum):
    BAD = "bad"
    OK = "ok"
    GOOD = "good"


class LLMEvaluatorClient:
    """
    A client for testing the LLM Evaluator API
    """

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url

    def _request(
        self, endpoint: str, method: str = "GET", data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Make a request to the API
        """
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}

        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, data=json.dumps(data))
        elif method == "PUT":
            response = requests.put(url, headers=headers, data=json.dumps(data))
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported method: {method}")

        if response.status_code >= 400:
            print(f"Error {response.status_code}: {response.text}")
            response.raise_for_status()

        # Some endpoints may return empty responses
        if response.text:
            return response.json()
        return {}

    # Input Set Methods

    def create_input_set(
        self, name: str, description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new input set
        """
        data = {"name": name}
        if description:
            data["description"] = description

        return self._request("/input-sets/", method="POST", data=data)

    def get_input_sets(self) -> List[Dict[str, Any]]:
        """
        Get all input sets
        """
        return self._request("/input-sets/")

    def get_input_set(self, input_set_id: int) -> Dict[str, Any]:
        """
        Get an input set by ID with its inputs
        """
        return self._request(f"/input-sets/{input_set_id}")

    # Input Methods

    def create_input(self, text: str, name: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new input
        """
        data = {"text": text}
        if name:
            data["name"] = name

        return self._request("/inputs/", method="POST", data=data)

    def add_input_to_set(
        self, input_set_id: int, text: str, name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Add a new input to an input set
        """
        data = {"text": text}
        if name:
            data["name"] = name

        return self._request(
            f"/input-sets/{input_set_id}/inputs", method="POST", data=data
        )

    # Prompt Methods

    def create_prompt(
        self, name: str, template: str, description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new prompt with initial version
        """
        data = {"name": name, "template": template}
        if description:
            data["description"] = description

        return self._request("/prompts/", method="POST", data=data)

    def get_prompts(self) -> List[Dict[str, Any]]:
        """
        Get all prompts
        """
        return self._request("/prompts/")

    def get_prompt(self, prompt_id: int) -> Dict[str, Any]:
        """
        Get a prompt by ID with its versions
        """
        return self._request(f"/prompts/{prompt_id}")

    def create_prompt_version(self, prompt_id: int, template: str) -> Dict[str, Any]:
        """
        Create a new version for a prompt
        """
        data = {"template": template}
        return self._request(f"/prompts/{prompt_id}/versions", method="POST", data=data)

    # Model Methods

    def get_models(self) -> List[Dict[str, Any]]:
        """
        Get all models
        """
        return self._request("/models/")

    # Comparison Methods

    def compare_prompts(
        self,
        input_ids: List[int],
        prompt_ids: List[int],
        model_ids: List[int],
        prompt_version_ids: Optional[Dict[str, int]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Compare multiple prompts on the same input(s)
        """
        data = {
            "input_ids": input_ids,
            "prompt_ids": prompt_ids,
            "model_ids": model_ids,
        }
        if prompt_version_ids:
            data["prompt_version_ids"] = prompt_version_ids

        return self._request("/compare-prompts/", method="POST", data=data)

    # History Methods

    def get_input_history(self, input_id: int) -> Dict[str, Any]:
        """
        Get historical results for a specific input
        """
        return self._request(f"/inputs/{input_id}/history")

    # Evaluation Methods

    def create_evaluation(
        self, output_id: int, quality: QualityRating, notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create or update an evaluation for an output

        Args:
            output_id: ID of the output to evaluate
            quality: Quality rating, use QualityRating enum (BAD, OK, GOOD)
            notes: Optional notes about the evaluation
        """
        # Convert enum to string value if needed
        quality_value = quality.value if isinstance(quality, QualityRating) else quality

        # Validate quality
        if quality_value not in [q.value for q in QualityRating]:
            raise ValueError(
                f"Quality must be one of: {', '.join([q.value for q in QualityRating])}"
            )

        data = {"output_id": output_id, "quality": quality_value}
        if notes:
            data["notes"] = notes

        return self._request("/evaluations/", method="POST", data=data)


def run_test():
    """
    Run a test of the API client
    """
    client = LLMEvaluatorClient()

    print("Testing API Client...")

    # Test getting models
    print("\nGetting available models...")
    models = client.get_models()
    print(f"Found {len(models)} models")

    if len(models) == 0:
        print("No models available. Please start the API server first.")
        return

    # Create an input set
    print("\nCreating input set...")
    input_set = client.create_input_set(
        name="Test Input Set", description="Input set for testing API client"
    )
    print(f"Created input set: {input_set['name']} (ID: {input_set['id']})")

    # Add inputs to the set
    print("\nAdding inputs to set...")
    inputs = [
        client.add_input_to_set(
            input_set["id"],
            "This is a test input for the API client. It should summarize this text.",
            name=f"Test Input {i+1}",
        )
        for i in range(2)
    ]
    print(f"Added {len(inputs)} inputs to set")

    # Create prompts
    print("\nCreating prompts...")
    prompts = [
        client.create_prompt(
            name="Basic Summary",
            template="Summarize the following text in 1-2 sentences: {{input}}",
            description="Simple summarization prompt",
        ),
        client.create_prompt(
            name="Bullet Points",
            template="Extract the key points from this text as a bulleted list: {{input}}",
            description="Extract key points as bullet points",
        ),
    ]
    print(f"Created {len(prompts)} prompts")

    # Create a new version for the first prompt
    print("\nCreating new prompt version...")
    prompt_version = client.create_prompt_version(
        prompts[0]["id"],
        "Provide a concise summary of this text in exactly one sentence: {{input}}",
    )
    print(
        f"Created prompt version: {prompt_version['version_number']} for prompt {prompts[0]['id']}"
    )

    # Run comparison
    print("\nRunning prompt comparison...")
    model_id = models[0]["id"]  # Use the first model
    comparison_results = client.compare_prompts(
        input_ids=[inputs[0]["id"]],
        prompt_ids=[prompts[0]["id"], prompts[1]["id"]],
        model_ids=[model_id],
    )
    print(f"Got comparison results for {len(comparison_results)} inputs")

    # If there are results, create an evaluation
    if comparison_results and comparison_results[0]["prompt_results"]:
        output_id = comparison_results[0]["prompt_results"][0]["output_id"]
        print("\nCreating evaluation...")
        evaluation = client.create_evaluation(
            output_id=output_id,
            quality=QualityRating.GOOD,  # Using the enum properly
            notes="This is a good output for testing purposes",
        )
        print(f"Created evaluation: {evaluation['quality']}")

    # Get input history
    print("\nGetting input history...")
    history = client.get_input_history(inputs[0]["id"])
    print(f"Got history with {len(history['results'])} results")

    print("\nAPI test completed successfully!")


if __name__ == "__main__":
    run_test()
