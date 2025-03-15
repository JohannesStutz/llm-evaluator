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
    
    // Input Set Methods
    
    /**
     * Get all input sets
     * @returns {Promise<Array>} - List of input sets
     */
    async getInputSets() {
        return this.request('/input-sets/');
    }
    
    /**
     * Create a new input set
     * @param {string} name - Input set name
     * @param {string} description - Input set description
     * @returns {Promise<object>} - Created input set
     */
    async createInputSet(name, description = '') {
        return this.request('/input-sets/', 'POST', {
            name,
            description
        });
    }
    
    /**
     * Get an input set by ID
     * @param {number} inputSetId - Input set ID
     * @returns {Promise<object>} - Input set with its inputs
     */
    async getInputSet(inputSetId) {
        return this.request(`/input-sets/${inputSetId}`);
    }
    
    /**
     * Update an input set
     * @param {number} inputSetId - Input set ID
     * @param {object} data - Input set data to update
     * @returns {Promise<object>} - Updated input set
     */
    async updateInputSet(inputSetId, data) {
        return this.request(`/input-sets/${inputSetId}`, 'PUT', data);
    }
    
    /**
     * Delete an input set
     * @param {number} inputSetId - Input set ID
     * @returns {Promise<object>} - Response
     */
    async deleteInputSet(inputSetId) {
        return this.request(`/input-sets/${inputSetId}`, 'DELETE');
    }
    
    // Input Methods
    
    /**
     * Get all inputs
     * @returns {Promise<Array>} - List of inputs
     */
    async getInputs() {
        return this.request('/inputs/');
    }
    
    /**
     * Create a new input
     * @param {string} text - Input text
     * @param {string} name - Input name
     * @returns {Promise<object>} - Created input
     */
    async createInput(text, name = '') {
        return this.request('/inputs/', 'POST', {
            text,
            name
        });
    }
    
    /**
     * Add an input to an input set
     * @param {number} inputSetId - Input set ID
     * @param {string} text - Input text
     * @param {string} name - Input name
     * @returns {Promise<object>} - Created input
     */
    async addInputToSet(inputSetId, text, name = '') {
        return this.request(`/input-sets/${inputSetId}/inputs`, 'POST', {
            text,
            name
        });
    }
    
    /**
     * Get inputs in an input set
     * @param {number} inputSetId - Input set ID
     * @returns {Promise<Array>} - List of inputs in the set
     */
    async getInputsInSet(inputSetId) {
        return this.request(`/input-sets/${inputSetId}/inputs`);
    }
    
    /**
     * Get an input by ID
     * @param {number} inputId - Input ID
     * @returns {Promise<object>} - Input
     */
    async getInput(inputId) {
        return this.request(`/inputs/${inputId}`);
    }
    
    /**
     * Update an input
     * @param {number} inputId - Input ID
     * @param {object} data - Input data to update
     * @returns {Promise<object>} - Updated input
     */
    async updateInput(inputId, data) {
        return this.request(`/inputs/${inputId}`, 'PUT', data);
    }
    
    /**
     * Delete an input
     * @param {number} inputId - Input ID
     * @returns {Promise<object>} - Response
     */
    async deleteInput(inputId) {
        return this.request(`/inputs/${inputId}`, 'DELETE');
    }
    
    // Model Methods
    
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
    
    // Prompt Methods
    
    /**
     * Get all prompts
     * @returns {Promise<Array>} - List of prompts
     */
    async getPrompts() {
        return this.request('/prompts/');
    }
    
    /**
     * Create a new prompt
     * @param {string} name - Prompt name
     * @param {string} template - Prompt template
     * @param {string} description - Prompt description
     * @returns {Promise<object>} - Created prompt
     */
    async createPrompt(name, template, description = '') {
        return this.request('/prompts/', 'POST', {
            name,
            template,
            description
        });
    }
    
    /**
     * Get a prompt by ID with its versions
     * @param {number} promptId - Prompt ID
     * @returns {Promise<object>} - Prompt with versions
     */
    async getPrompt(promptId) {
        return this.request(`/prompts/${promptId}`);
    }
    
    /**
     * Update a prompt
     * @param {number} promptId - Prompt ID
     * @param {object} data - Prompt data to update
     * @returns {Promise<object>} - Updated prompt
     */
    async updatePrompt(promptId, data) {
        return this.request(`/prompts/${promptId}`, 'PUT', data);
    }
    
    /**
     * Delete a prompt
     * @param {number} promptId - Prompt ID
     * @returns {Promise<object>} - Response
     */
    async deletePrompt(promptId) {
        return this.request(`/prompts/${promptId}`, 'DELETE');
    }
    
    /**
     * Get versions of a prompt
     * @param {number} promptId - Prompt ID
     * @returns {Promise<Array>} - List of prompt versions
     */
    async getPromptVersions(promptId) {
        return this.request(`/prompts/${promptId}/versions`);
    }
    
    /**
     * Create a new version for a prompt
     * @param {number} promptId - Prompt ID
     * @param {string} template - Prompt template
     * @returns {Promise<object>} - Created prompt version
     */
    async createPromptVersion(promptId, template) {
        return this.request(`/prompts/${promptId}/versions`, 'POST', {
            template
        });
    }
    
    /**
     * Get a specific prompt version
     * @param {number} versionId - Prompt version ID
     * @returns {Promise<object>} - Prompt version
     */
    async getPromptVersion(versionId) {
        return this.request(`/prompt-versions/${versionId}`);
    }
    
    // Processing Methods
    
    /**
     * Process a single text with selected models and prompts
     * @param {string} text - Input text
     * @param {Array<number>} modelIds - Selected model IDs
     * @param {Array<number>} promptIds - Selected prompt IDs
     * @param {object} promptVersionIds - Optional mapping of prompt ID to version ID
     * @returns {Promise<object>} - Processing result
     */
    async processText(text, modelIds, promptIds, promptVersionIds = null) {
        return this.request('/process/', 'POST', {
            text,
            model_ids: modelIds,
            prompt_ids: promptIds,
            prompt_version_ids: promptVersionIds
        });
    }
    
    /**
     * Process multiple texts with selected models and prompts
     * @param {Array<string>} texts - Input texts
     * @param {Array<number>} modelIds - Selected model IDs
     * @param {Array<number>} promptIds - Selected prompt IDs
     * @param {object} promptVersionIds - Optional mapping of prompt ID to version ID
     * @returns {Promise<Array>} - Processing results
     */
    async batchProcess(texts, modelIds, promptIds, promptVersionIds = null) {
        return this.request('/batch-process/', 'POST', {
            texts,
            model_ids: modelIds,
            prompt_ids: promptIds,
            prompt_version_ids: promptVersionIds
        });
    }
    
    /**
     * Process multiple inputs with selected models and prompts
     * This uses the compare-prompts endpoint for efficient batch processing
     * 
     * @param {Array<object>} inputs - Array of input objects with id property
     * @param {Array<number>} modelIds - Selected model IDs
     * @param {Array<number>} promptIds - Selected prompt IDs
     * @param {object} promptVersionIds - Optional mapping of prompt ID to version ID
     * @returns {Promise<Array>} - Array of processing results
     */
    async batchProcessInputs(inputs, modelIds, promptIds, promptVersionIds = null) {
        // Extract input IDs from the input objects
        const inputIds = inputs.map(input => input.id);
        
        console.log(`Batch processing ${inputIds.length} inputs with ${modelIds.length} models and ${promptIds.length} prompts`);
        
        return this.request('/compare-prompts/', 'POST', {
            input_ids: inputIds,
            model_ids: modelIds,
            prompt_ids: promptIds,
            prompt_version_ids: promptVersionIds
        });
    }
    
    /**
     * Compare multiple prompts on the same inputs
     * @param {Array<number>} inputIds - Input IDs
     * @param {Array<number>} promptIds - Prompt IDs
     * @param {Array<number>} modelIds - Model IDs
     * @param {object} promptVersionIds - Optional mapping of prompt ID to version ID
     * @returns {Promise<Array>} - Comparison results
     */
    async comparePrompts(inputIds, promptIds, modelIds, promptVersionIds = null) {
        return this.request('/compare-prompts/', 'POST', {
            input_ids: inputIds,
            prompt_ids: promptIds,
            model_ids: modelIds,
            prompt_version_ids: promptVersionIds
        });
    }
    
    // History Methods
    
    /**
     * Get historical results for a specific input
     * @param {number} inputId - Input ID
     * @returns {Promise<object>} - Input history
     */
    async getInputHistory(inputId) {
        return this.request(`/inputs/${inputId}/history`);
    }
    
    // Evaluation Methods
    
    /**
     * Create or update an evaluation for an output
     * @param {number} outputId - Output ID
     * @param {string} quality - Quality rating (bad, ok, good)
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
    
    /**
     * Get all evaluations
     * @returns {Promise<Array>} - List of evaluations
     */
    async getEvaluations() {
        return this.request('/evaluations/');
    }
}

// Export API instance
const api = new API();
