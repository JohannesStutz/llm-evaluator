/**
 * API client for communicating with the backend
 */
class API {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
    }

    /**
     * Make an API request
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {object} data - Request body
     * @returns {Promise} - Promise with the response
     */
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'An error occurred');
            }
            
            return await response.json();
        } catch (error) {
            console.error('API error:', error);
            throw error;
        }
    }
    
    // Models
    
    /**
     * Get all models
     * @returns {Promise<Array>} - List of models
     */
    async getModels() {
        return this.request('/models/');
    }
    
    /**
     * Create a new model
     * @param {object} model - Model data
     * @returns {Promise<object>} - Created model
     */
    async createModel(model) {
        return this.request('/models/', 'POST', model);
    }
    
    // Prompts
    
    /**
     * Get all prompts
     * @returns {Promise<Array>} - List of prompts
     */
    async getPrompts() {
        return this.request('/prompts/');
    }
    
    /**
     * Create a new prompt
     * @param {object} prompt - Prompt data
     * @returns {Promise<object>} - Created prompt
     */
    async createPrompt(prompt) {
        return this.request('/prompts/', 'POST', prompt);
    }
    
    /**
     * Update a prompt
     * @param {number} id - Prompt ID
     * @param {object} prompt - Prompt data
     * @returns {Promise<object>} - Updated prompt
     */
    async updatePrompt(id, prompt) {
        return this.request(`/prompts/${id}`, 'PUT', prompt);
    }
    
    /**
     * Delete a prompt
     * @param {number} id - Prompt ID
     * @returns {Promise<object>} - Response
     */
    async deletePrompt(id) {
        return this.request(`/prompts/${id}`, 'DELETE');
    }
    
    // Processing
    
    /**
     * Process a single text with selected models and prompts
     * @param {string} text - Input text
     * @param {Array<number>} modelIds - Selected model IDs
     * @param {Array<number>} promptIds - Selected prompt IDs
     * @returns {Promise<object>} - Processing result
     */
    async processText(text, modelIds, promptIds) {
        return this.request('/process/', 'POST', {
            text,
            model_ids: modelIds,
            prompt_ids: promptIds
        });
    }
    
    /**
     * Process multiple texts with selected models and prompts
     * @param {Array<string>} texts - Input texts
     * @param {Array<number>} modelIds - Selected model IDs
     * @param {Array<number>} promptIds - Selected prompt IDs
     * @returns {Promise<Array>} - Processing results
     */
    async batchProcess(texts, modelIds, promptIds) {
        return this.request('/batch-process/', 'POST', {
            texts,
            model_ids: modelIds,
            prompt_ids: promptIds
        });
    }
    
    // Evaluations
    
    /**
     * Get all evaluations
     * @returns {Promise<Array>} - List of evaluations
     */
    async getEvaluations() {
        return this.request('/evaluations/');
    }
    
    /**
     * Create or update an evaluation
     * @param {number} outputId - Output ID
     * @param {string} quality - Quality rating (BAD, OK, GOOD)
     * @param {string} notes - Evaluation notes
     * @returns {Promise<object>} - Created evaluation
     */
    async createEvaluation(outputId, quality, notes = '') {
        return this.request('/evaluations/', 'POST', {
            output_id: outputId,
            quality,
            notes
        });
    }
}

// Export API instance
const api = new API();
