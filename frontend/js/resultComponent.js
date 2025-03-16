/**
 * Result Component - A reusable component for displaying LLM results across different views
 */
class ResultComponent {
    constructor() {
        // Template for the result component
        this.template = document.getElementById('result-component-template');
        
        // Event handlers registry - to clean up event listeners when removing components
        this.eventHandlers = new Map();
    }

    /**
     * Create a new result component
     * @param {object} result - The result data
     * @param {Function} onEvaluate - Callback function when evaluation is submitted
     * @returns {HTMLElement} - The result component element
     */
    create(result, onEvaluate) {
        // Clone the template
        const resultElement = this.template.content.cloneNode(true);
        const container = resultElement.querySelector('.result-component');
        
        // Set result data with fallbacks for when data might be missing
        this.populateResultData(container, result);
        
        // Set up event listeners
        this.setupEventListeners(container, result, onEvaluate);
        
        return container;
    }

    /**
     * Populate the result element with data
     * @param {HTMLElement} element - The result element
     * @param {object} result - The result data
     */
    populateResultData(element, result) {
        // Store the result data on the element for later reference
        element.dataset.resultId = result.output_id || result.id || '';
        element.dataset.modelId = result.model_id || '';
        element.dataset.promptId = result.prompt_id || '';
        
        // Set model name
        const modelNameElement = element.querySelector('.model-name');
        if (modelNameElement) {
            modelNameElement.textContent = result.model_name || 'Unknown model';
        }
        
        // Set prompt name and version
        const promptNameElement = element.querySelector('.prompt-name');
        if (promptNameElement) {
            let promptText = result.prompt_name || 'Unknown prompt';
            if (result.prompt_version_number) {
                promptText += ` (v${result.prompt_version_number})`;
            }
            promptNameElement.textContent = promptText;
        }
        
        // Set timestamp
        const timestampElement = element.querySelector('.result-timestamp');
        if (timestampElement) {
            const timestamp = result.created_at ? new Date(result.created_at) : new Date();
            timestampElement.textContent = timestamp.toLocaleString();
        }
        
        // Set processing time
        const processingTimeElement = element.querySelector('.processing-time');
        if (processingTimeElement) {
            const processingTime = typeof result.processing_time === 'number' ?
                result.processing_time.toFixed(2) : '?';
            processingTimeElement.textContent = `Processing: ${processingTime}s`;
        }
        
        // Set output text
        const outputTextElement = element.querySelector('.result-content');
        if (outputTextElement) {
            outputTextElement.textContent = result.text || 'No output text available';
        }
        
        // Set prompt template button state
        const viewPromptBtn = element.querySelector('.view-prompt-btn');
        if (viewPromptBtn) {
            if (result.prompt_template) {
                // Store the template on the button
                viewPromptBtn.dataset.template = result.prompt_template;
            } else {
                viewPromptBtn.disabled = true;
                viewPromptBtn.textContent = 'No template';
            }
        }
        
        // Set evaluation state if present
        if (result.evaluation) {
            const evalButtons = element.querySelectorAll('.eval-btn');
            evalButtons.forEach(button => {
                if (button.dataset.quality === result.evaluation.quality) {
                    button.classList.add('selected');
                }
            });
            
            // Set notes if present
            const notesTextarea = element.querySelector('.evaluation-notes textarea');
            if (notesTextarea && result.evaluation.notes) {
                notesTextarea.value = result.evaluation.notes;
            }
        }
    }

    /**
     * Set up event listeners for the result component
     * @param {HTMLElement} element - The result element
     * @param {object} result - The result data
     * @param {Function} onEvaluate - Callback function when evaluation is submitted
     */
    setupEventListeners(element, result, onEvaluate) {
        // View prompt button
        const viewPromptBtn = element.querySelector('.view-prompt-btn');
        if (viewPromptBtn && viewPromptBtn.dataset.template) {
            const viewPromptHandler = () => this.showPromptModal(viewPromptBtn.dataset.template);
            viewPromptBtn.addEventListener('click', viewPromptHandler);
            
            // Store the handler for potential cleanup
            this.eventHandlers.set(viewPromptBtn, viewPromptHandler);
        }
        
        // Evaluation buttons
        const evalButtons = element.querySelectorAll('.eval-btn');
        evalButtons.forEach(button => {
            const evalHandler = async () => {
                const quality = button.dataset.quality;
                const outputId = element.dataset.resultId;
                const notesTextarea = element.querySelector('.evaluation-notes textarea');
                const notes = notesTextarea ? notesTextarea.value : '';
                
                // Reset selection on all buttons
                evalButtons.forEach(btn => btn.classList.remove('selected'));
                
                // Select current button
                button.classList.add('selected');
                
                // Call the evaluation callback if provided
                if (typeof onEvaluate === 'function') {
                    try {
                        await onEvaluate(outputId, quality, notes);
                    } catch (error) {
                        console.error('Error in evaluation callback:', error);
                        alert(`Error saving evaluation: ${error.message || 'Unknown error'}`);
                        
                        // Revert selection if error occurs
                        button.classList.remove('selected');
                        if (result.evaluation) {
                            evalButtons.forEach(btn => {
                                if (btn.dataset.quality === result.evaluation.quality) {
                                    btn.classList.add('selected');
                                }
                            });
                        }
                    }
                }
            };
            
            button.addEventListener('click', evalHandler);
            
            // Store the handler for potential cleanup
            this.eventHandlers.set(button, evalHandler);
        });
    }

    /**
     * Remove event listeners from the result component
     * @param {HTMLElement} element - The result element
     */
    removeEventListeners(element) {
        // View prompt button
        const viewPromptBtn = element.querySelector('.view-prompt-btn');
        if (viewPromptBtn && this.eventHandlers.has(viewPromptBtn)) {
            viewPromptBtn.removeEventListener('click', this.eventHandlers.get(viewPromptBtn));
            this.eventHandlers.delete(viewPromptBtn);
        }
        
        // Evaluation buttons
        const evalButtons = element.querySelectorAll('.eval-btn');
        evalButtons.forEach(button => {
            if (this.eventHandlers.has(button)) {
                button.removeEventListener('click', this.eventHandlers.get(button));
                this.eventHandlers.delete(button);
            }
        });
    }

    /**
     * Update an existing result component with new data
     * @param {HTMLElement} element - The result element to update
     * @param {object} result - The new result data
     */
    update(element, result) {
        // Remove old event listeners
        this.removeEventListeners(element);
        
        // Update the element data
        this.populateResultData(element, result);
        
        // Set up new event listeners
        this.setupEventListeners(element, result);
    }

    /**
     * Show a modal with the prompt template
     * @param {string} template - Prompt template
     */
    showPromptModal(template) {
        // Create modal content
        const content = document.createElement('div');
        content.innerHTML = `
            <div class="prompt-preview">
                <h3>Prompt Template</h3>
                <pre class="prompt-template-display">${template}</pre>
            </div>
        `;
        
        // Show modal using UI helper
        if (window.ui && typeof window.ui.showModal === 'function') {
            window.ui.showModal('Prompt Template', content);
        } else {
            // Fallback if ui.showModal is not available
            alert('Prompt Template:\n\n' + template);
        }
    }

    /**
     * Utility function to handle saving evaluations
     * @param {string} outputId - The output ID
     * @param {string} quality - The quality rating (good, ok, bad)
     * @param {string} notes - Optional evaluation notes
     * @returns {Promise} - Promise that resolves when evaluation is saved
     */
    static async saveEvaluation(outputId, quality, notes = '') {
        if (!outputId) {
            throw new Error('Cannot save evaluation: Output ID is missing');
        }
        
        // Call the API to save the evaluation
        if (window.api && typeof window.api.createEvaluation === 'function') {
            return window.api.createEvaluation(outputId, quality, notes);
        } else {
            throw new Error('API not available for saving evaluation');
        }
    }
}

// Create a global instance
window.resultComponent = new ResultComponent();
