# LLM Evaluator

**Important: this is very much a work in progress as I'm experimenting with Claude for coding. I don't recommend using it yet.**

A tool for evaluating local LLMs and different prompts for summarization and reformatting of transcribed voice memos.

## Features

- Test multiple local LLMs against the same input
- Compare different prompt templates
- Side-by-side comparison of outputs
- Evaluate quality of results (Good/OK/Bad)
- Measure processing time
- Single or batch processing modes
- Save results for later analysis

## Project Structure

```
llm-evaluator/
├── backend/            # FastAPI backend
│   ├── app/
│   │   ├── main.py     # FastAPI application
│   │   ├── models.py   # Database models
│   │   └── services/   # Services for LLM processing
│   └── requirements.txt
└── frontend/           # Web frontend
    ├── index.html      # Main HTML
    ├── css/            # Stylesheets
    └── js/             # JavaScript files
```

## Setup and Installation

### Backend

1. Navigate to the backend directory:
   ```
   cd llm-evaluator/backend
   ```

2. Create a virtual environment (optional but recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Start the FastAPI server:
   ```
   uvicorn app.main:app --reload
   ```

   The API will be available at http://localhost:8000

### Frontend

The frontend is a static web application that can be served from any web server. For development, you can use Python's built-in HTTP server:

```
cd llm-evaluator/frontend
python -m http.server 8080
```

Then open http://localhost:8080 in your browser.

## Usage

1. **Add Models**: The system will detect available local models automatically. You can also add custom models through the UI.

2. **Create Prompts**: Define prompt templates using the `{{input}}` placeholder where the original text should be inserted.

3. **Process Text**:
   - Enter a single text or add multiple texts in batch mode
   - Select the models and prompts you want to evaluate
   - Click "Process" to run the LLMs

4. **Evaluate Results**:
   - Compare the outputs side-by-side
   - Rate each output as Good, OK, or Bad
   - Add optional notes to your evaluations

5. **Browse History**: You can view previous evaluations to track performance over time.

## Notes for Extending the Tool

### Adding New Model Support

To add support for new types of models, modify the `LLMService` class in `app/services/llm_service.py` to interface with the model library.

### Creating Custom Prompts

Effective prompts are key to good summarization results. Some tips:
- Be specific about the desired length and format
- Include details about what to preserve or emphasize
- Consider the style/tone you want for the output

### Database

The application uses SQLite by default. To use a different database:
1. Update the `SQLALCHEMY_DATABASE_URL` in `database.py`
2. Install any required database drivers