/**
 * Main application for LLM Evaluator - Modified version
 */
class App {
    constructor() {
        // Initialize state
        this.modelsLoaded = false;
        this.promptsLoaded = false;

        // Initialize app
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log("Initializing LLM Evaluator app...");

            // Load models
            await this.loadModels();

            // Load prompts
            await this.loadPrompts();

            // Initialize UI components - Do this after models and prompts are loaded
            this.initializeUIComponents();

            // Load the default view
            ui.switchView('inputSets');

            console.log("App initialization complete");
        } catch (error) {
            console.error('Error initializing app:', error);
            alert('Error initializing application. Check console for details.');
        }
    }

    /**
     * Initialize all UI components
     */
    initializeUIComponents() {
        // Initialize the batch evaluation UI if it hasn't been created yet
        if (!window.batchEvaluationUI) {
            window.batchEvaluationUI = new BatchEvaluationUI();
        }
    }

    /**
     * Load models from the backend
     */
    async loadModels() {
        try {
            console.log("Loading models...");

            const models = await api.getModels();
            ui.displayModels(models);

            this.modelsLoaded = true;
            console.log(`Loaded ${models.length} models`);

            // Add default models if none exist
            if (models.length === 0) {
                await this.addDefaultModel();
            }

            return models;
        } catch (error) {
            console.error('Error loading models:', error);

            // If can't load models, show message
            ui.modelList.innerHTML =
                '<div class="error">Failed to load models. Please ensure the backend is running.</div>';

            return [];
        }
    }

    /**
     * Load prompts from the backend
     */
    async loadPrompts() {
        try {
            console.log("Loading prompts...");

            const prompts = await api.getPrompts();
            ui.displayPrompts(prompts);

            this.promptsLoaded = true;
            console.log(`Loaded ${prompts.length} prompts`);

            // Add default prompts if none exist
            if (prompts.length === 0) {
                await this.addDefaultPrompts();
            }

            return prompts;
        } catch (error) {
            console.error('Error loading prompts:', error);

            // If can't load prompts, show message
            ui.promptList.innerHTML =
                '<div class="error">Failed to load prompts. Please ensure the backend is running.</div>';

            return [];
        }
    }

    /**
     * Add a default model if none exist
     */
    async addDefaultModel() {
        try {
            console.log("Adding default model...");

            const model = await api.createModel({
                name: "gpt-4o-mini",
                description: "OpenAI GPT-4o mini model"
            });

            ui.addModelToList(model);
            console.log("Default model added");

            return model;
        } catch (error) {
            console.error("Error adding default model:", error);
            return null;
        }
    }

    /**
     * Add default prompts if none exist
     */
    async addDefaultPrompts() {
        console.log("Adding default prompts...");

        const defaultPrompts = [
            {
                name: "Basic Summary",
                template: "Summarize the following text in 1-2 sentences: {{input}}",
                description: "Simple summarization prompt"
            },
            {
                name: "Bullet Points",
                template: "Extract the key points from this text as a bulleted list: {{input}}",
                description: "Extract key points as bullet points"
            },
            {
                name: "Professional Email",
                template: "Reformat the following voice memo into a professional email: {{input}}",
                description: "Convert to formal email format"
            }
        ];

        const createdPrompts = [];

        for (const promptData of defaultPrompts) {
            try {
                const prompt = await api.createPrompt(
                    promptData.name,
                    promptData.template,
                    promptData.description
                );

                ui.addPromptToList(prompt);
                createdPrompts.push(prompt);

                console.log(`Default prompt "${promptData.name}" added`);
            } catch (error) {
                console.error(`Error creating default prompt "${promptData.name}":`, error);
            }
        }

        console.log(`Added ${createdPrompts.length} default prompts`);
        return createdPrompts;
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.batchEvaluationUI = new BatchEvaluationUI();
});
