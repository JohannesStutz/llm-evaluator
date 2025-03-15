/**
 * Main application for LLM Evaluator
 */
class App {
    constructor() {
        this.ui = new UI();
        
        // Default prompts for testing
        this.defaultPrompts = [
            {
                name: "Basic Summary",
                template: "Summarize the following text in 1-2 sentences: {{input}}",
                description: "Simple summarization"
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
        
        // Initialize app
        this.init();
    }
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            // Load models
            const models = await this.loadModels();
            this.ui.displayModels(models);
            
            // Load prompts
            let prompts = await this.loadPrompts();
            
            // Add default prompts if none exist
            if (prompts.length === 0) {
                prompts = await this.addDefaultPrompts();
            }
            
            this.ui.displayPrompts(prompts);
            
            // Add one batch input by default
            this.ui.addBatchInput();
            
        } catch (error) {
            console.error('Error initializing app:', error);
            alert('Error initializing application. Check console for details.');
        }
    }
    
    /**
     * Load models from the backend
     * @returns {Promise<Array>} - List of models
     */
    async loadModels() {
        try {
            return await api.getModels();
        } catch (error) {
            console.error('Error loading models:', error);
            
            // If can't load models, show message
            this.ui.modelList.innerHTML = 
                '<div class="error">Failed to load models. Please ensure the backend is running.</div>';
            
            return [];
        }
    }
    
    /**
     * Load prompts from the backend
     * @returns {Promise<Array>} - List of prompts
     */
    async loadPrompts() {
        try {
            return await api.getPrompts();
        } catch (error) {
            console.error('Error loading prompts:', error);
            
            // If can't load prompts, show message
            this.ui.promptList.innerHTML = 
                '<div class="error">Failed to load prompts. Please ensure the backend is running.</div>';
            
            return [];
        }
    }
    
    /**
     * Add default prompts to the backend
     * @returns {Promise<Array>} - List of created prompts
     */
    async addDefaultPrompts() {
        const createdPrompts = [];
        
        for (const promptData of this.defaultPrompts) {
            try {
                const prompt = await api.createPrompt(promptData);
                createdPrompts.push(prompt);
            } catch (error) {
                console.error(`Error creating default prompt "${promptData.name}":`, error);
            }
        }
        
        return createdPrompts;
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
