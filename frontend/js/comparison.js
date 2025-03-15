/**
 * Comparison UI component
 */
class ComparisonUI {
    constructor() {
        // Container elements
        this.resultsContainer = document.getElementById('comparison-results');
        this.inputSetFilter = document.getElementById('input-set-filter');
        this.inputFilter = document.getElementById('input-filter');
        
        // Action buttons
        this.runComparisonBtn = document.getElementById('run-comparison-btn');
        
        // Templates
        this.comparisonResultTemplate = document.getElementById('comparison-result-template');
        this.comparisonOutputTemplate = document.getElementById('comparison-output-template');
        
        // Initialize
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Input set filter
        this.inputSetFilter.addEventListener('change', () => {
            this.loadInputsForSet();
        });
        
        // Run comparison button
        this.runComparisonBtn.addEventListener('click', () => {
            this.runComparison();
        });
    }
    
    /**
     * Called when the comparison view is activated
     */
    onViewActivated() {
        this.loadInputSets();
    }
    
    /**
     * Load all input sets for the filter
     */
    async loadInputSets() {
        try {
            this.inputSetFilter.disabled = true;
            this.inputSetFilter.innerHTML = '<option value="">Loading...</option>';
            
            const inputSets = await api.getInputSets();
            
            this.inputSetFilter.innerHTML = '<option value="">All Input Sets</option>';
            
            if (inputSets.length === 0) {
                this.inputSetFilter.innerHTML += '<option value="" disabled>No input sets available</option>';
                this.inputSetFilter.disabled = false;
                return;
            }
            
            inputSets.forEach(inputSet => {
                const option = document.createElement('option');
                option.value = inputSet.id;
                option.textContent = inputSet.name;
                this.inputSetFilter.appendChild(option);
            });
            
            this.inputSetFilter.disabled = false;
        } catch (error) {
            console.error('Error loading input sets:', error);
            this.inputSetFilter.innerHTML = '<option value="">Error loading input sets</option>';
            this.inputSetFilter.disabled = false;
        }
    }
    
    /**
     * Load inputs for the selected input set
     */
    async loadInputsForSet() {
        const inputSetId = this.inputSetFilter.value;
        
        // Reset input filter
        this.inputFilter.innerHTML = '<option value="">All Inputs</option>';
        
        if (!inputSetId) {
            this.inputFilter.disabled = true;
            return;
        }
        
        try {
            this.inputFilter.disabled = true;
            this.inputFilter.innerHTML = '<option value="">Loading...</option>';
            
            const inputSet = await api.getInputSet(inputSetId);
            
            this.inputFilter.innerHTML = '<option value="">All Inputs</option>';
            
            if (inputSet.inputs.length === 0) {
                this.inputFilter.innerHTML += '<option value="" disabled>No inputs available</option>';
                this.inputFilter.disabled = false;
                return;
            }
            
            inputSet.inputs.forEach(input => {
                const option = document.createElement('option');
                option.value = input.id;
                option.textContent = input.name || `Input #${input.id}`;
                this.inputFilter.appendChild(option);
            });
            
            this.inputFilter.disabled = false;
        } catch (error) {
            console.error('Error loading inputs:', error);
            this.inputFilter.innerHTML = '<option value="">Error loading inputs</option>';
            this.inputFilter.disabled = false;
        }
    }
    
    /**
     * Run a comparison with selected inputs, prompts, and models
     */
    async runComparison() {
        // Get selected inputs
        const inputIds = [];
        const inputSetId = this.inputSetFilter.value;
        const inputId = this.inputFilter.value;
        
        if (inputId) {
            // If a specific input is selected
            inputIds.push(parseInt(inputId));
        } else if (inputSetId) {
            // If an input set is selected
            try {
                const inputSet = await api.getInputSet(inputSetId);
                inputSet.inputs.forEach(input => {
                    inputIds.push(input.id);
                });
            } catch (error) {
                console.error('Error getting inputs for set:', error);
                alert('Error loading inputs for the selected input set');
                return;
            }
        } else {
            alert('Please select at least one input set or input');
            return;
        }
        
        // Get selected prompts
        const selectedPromptIds = Array.from(document.querySelectorAll('.prompt-checkbox:checked'))
            .map(checkbox => parseInt(checkbox.dataset.id));
        
        if (selectedPromptIds.length === 0) {
            alert('Please select at least one prompt');
            return;
        }
        
        // Get selected models
        const selectedModelIds = Array.from(document.querySelectorAll('.model-checkbox:checked'))
            .map(checkbox => parseInt(checkbox.dataset.id));
        
        if (selectedModelIds.length === 0) {
            alert('Please select at least one model');
            return;
        }
        
        // Run comparison
        try {
            // Disable button and show loading
            this.runComparisonBtn.disabled = true;
            ui.showLoading(this.resultsContainer, 'Running comparison...');
            
            // Run the comparison
            const results = await api.comparePrompts(
                inputIds,
                selectedPromptIds,
                selectedModelIds
            );
            
            // Display results
            this.displayComparisonResults(results);
            
            // Re-enable button
            this.runComparisonBtn.disabled = false;
        } catch (error) {
            console.error('Error running comparison:', error);
            ui.showError(this.resultsContainer, 'Error running comparison');
            this.runComparisonBtn.disabled = false;
        }
    }
    
    /**
     * Display comparison results
     * @param {Array} results - Comparison results
     */
    displayComparisonResults(results) {
        // Clear the results container
        this.resultsContainer.innerHTML = '';
        
        if (results.length === 0) {
            ui.showNoItems(this.resultsContainer, 'No comparison results to display');
            return;
        }
        
        // Create a result container for each input
        results.forEach(inputResult => {
            const resultItem = this.comparisonResultTemplate.content.cloneNode(true);
            const container = resultItem.querySelector('.comparison-result');
            const nameElement = resultItem.querySelector('.input-name');
            const textElement = resultItem.querySelector('.input-text');
            const outputGrid = resultItem.querySelector('.output-grid');
            
            // Set input details
            nameElement.textContent = inputResult.input.name || `Input #${inputResult.input_id}`;
            textElement.textContent = inputResult.input.text;
            
            // Group prompt results by prompt
            const promptResultsByPrompt = {};
            inputResult.prompt_results.forEach(promptResult => {
                if (!promptResultsByPrompt[promptResult.prompt_id]) {
                    promptResultsByPrompt[promptResult.prompt_id] = [];
                }
                promptResultsByPrompt[promptResult.prompt_id].push(promptResult);
            });
            
            // Add each output
            Object.values(promptResultsByPrompt).forEach(promptResults => {
                promptResults.forEach(promptResult => {
                    const outputItem = this.comparisonOutputTemplate.content.cloneNode(true);
                    const cell = outputItem.querySelector('.output-cell');
                    const modelNameElement = outputItem.querySelector('.model-name');
                    const promptNameElement = outputItem.querySelector('.prompt-name');
                    const processingTimeElement = outputItem.querySelector('.processing-time');
                    const outputTextElement = outputItem.querySelector('.output-text');
                    const viewPromptBtn = outputItem.querySelector('.view-prompt-btn');
                    const evalButtons = outputItem.querySelectorAll('.eval-btn');
                    const evalNotes = outputItem.querySelector('.evaluation-notes textarea');
                    
                    cell.dataset.outputId = promptResult.output_id;
                    modelNameElement.textContent = promptResult.model_name;
                    promptNameElement.textContent = promptResult.prompt_name;
                    processingTimeElement.textContent = `(${promptResult.processing_time.toFixed(2)}s)`;
                    outputTextElement.textContent = promptResult.text;
                    
                    // Set up view prompt button
                    viewPromptBtn.addEventListener('click', () => {
                        this.showPromptModal(promptResult.prompt_template);
                    });
                    
                    // Set up evaluation buttons
                    evalButtons.forEach(button => {
                        button.addEventListener('click', async () => {
                            const quality = button.dataset.quality;
                            const notes = evalNotes.value;
                            
                            try {
                                await api.createEvaluation(promptResult.output_id, quality, notes);
                                
                                // Reset all buttons
                                evalButtons.forEach(btn => btn.classList.remove('selected'));
                                
                                // Select current button
                                button.classList.add('selected');
                                
                                // Show success message
                                alert('Evaluation saved');
                            } catch (error) {
                                console.error('Error saving evaluation:', error);
                                alert(`Error saving evaluation: ${error.message}`);
                            }
                        });
                    });
                    
                    outputGrid.appendChild(outputItem);
                });
            });
            
            this.resultsContainer.appendChild(resultItem);
        });
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
                <pre style="white-space: pre-wrap; background-color: #f5f5f5; padding: 1rem; border-radius: 4px;">${template}</pre>
            </div>
        `;
        
        // Show modal
        ui.showModal('Prompt Preview', content);
    }
}

// Create ComparisonUI instance
window.comparisonUI = new ComparisonUI();
