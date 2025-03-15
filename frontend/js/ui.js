/**
 * UI interactions for the LLM Evaluator
 */
class UI {
    constructor() {
        // Main containers
        this.modelList = document.getElementById('model-list');
        this.promptList = document.getElementById('prompt-list');
        this.resultsContainer = document.getElementById('results-container');
        this.batchInputsContainer = document.getElementById('batch-inputs');
        
        // Templates
        this.modelItemTemplate = document.getElementById('model-item-template');
        this.promptItemTemplate = document.getElementById('prompt-item-template');
        this.resultItemTemplate = document.getElementById('result-item-template');
        this.outputItemTemplate = document.getElementById('output-item-template');
        this.addModelTemplate = document.getElementById('add-model-template');
        this.addPromptTemplate = document.getElementById('add-prompt-template');
        
        // Modal
        this.modalContainer = document.getElementById('modal-container');
        this.modalTitle = document.getElementById('modal-title');
        this.modalContent = document.getElementById('modal-content');
        
        // Input toggle buttons
        this.singleInputBtn = document.getElementById('single-input');
        this.batchInputBtn = document.getElementById('batch-input');
        this.singleInputContainer = document.getElementById('single-input-container');
        this.batchInputContainer = document.getElementById('batch-input-container');
        
        // Action buttons
        this.processBtn = document.getElementById('process-btn');
        this.addModelBtn = document.getElementById('add-model-btn');
        this.addPromptBtn = document.getElementById('add-prompt-btn');
        this.addBatchInputBtn = document.getElementById('add-batch-input');
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Input toggle
        this.singleInputBtn.addEventListener('click', () => this.toggleInputMode('single'));
        this.batchInputBtn.addEventListener('click', () => this.toggleInputMode('batch'));
        
        // Process button
        this.processBtn.addEventListener('click', () => this.onProcessClick());
        
        // Add model button
        this.addModelBtn.addEventListener('click', () => this.showAddModelModal());
        
        // Add prompt button
        this.addPromptBtn.addEventListener('click', () => this.showAddPromptModal());
        
        // Add batch input button
        this.addBatchInputBtn.addEventListener('click', () => this.addBatchInput());
        
        // Close modal button
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.hideModal();
        });
        
        // Click outside modal to close
        this.modalContainer.addEventListener('click', (e) => {
            if (e.target === this.modalContainer) {
                this.hideModal();
            }
        });
    }
    
    /**
     * Toggle between single and batch input modes
     * @param {string} mode - Input mode ('single' or 'batch')
     */
    toggleInputMode(mode) {
        if (mode === 'single') {
            this.singleInputBtn.classList.add('active');
            this.batchInputBtn.classList.remove('active');
            this.singleInputContainer.classList.remove('hidden');
            this.batchInputContainer.classList.add('hidden');
        } else {
            this.singleInputBtn.classList.remove('active');
            this.batchInputBtn.classList.add('active');
            this.singleInputContainer.classList.add('hidden');
            this.batchInputContainer.classList.remove('hidden');
        }
    }
    
    /**
     * Show the modal with specified content
     * @param {string} title - Modal title
     * @param {HTMLElement} content - Modal content
     */
    showModal(title, content) {
        this.modalTitle.textContent = title;
        this.modalContent.innerHTML = '';
        this.modalContent.appendChild(content);
        this.modalContainer.classList.remove('hidden');
    }
    
    /**
     * Hide the modal
     */
    hideModal() {
        this.modalContainer.classList.add('hidden');
    }
    
    /**
     * Show the add model modal
     */
    showAddModelModal() {
        const content = this.addModelTemplate.content.cloneNode(true);
        
        this.showModal('Add Model', content);
        
        // Set up form submission
        document.getElementById('add-model-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('model-name').value;
            const description = document.getElementById('model-description').value;
            
            try {
                const model = await api.createModel({ name, description });
                this.addModelToList(model);
                this.hideModal();
            } catch (error) {
                alert(`Error adding model: ${error.message}`);
            }
        });
    }
    
    /**
     * Show the add/edit prompt modal
     * @param {object} promptData - Prompt data for editing (null for new prompt)
     */
    showAddPromptModal(promptData = null) {
        const content = this.addPromptTemplate.content.cloneNode(true);
        const isEdit = !!promptData;
        
        // Set modal title based on whether we're editing or adding
        this.showModal(isEdit ? 'Edit Prompt' : 'Add Prompt', content);
        
        // Fill form if editing
        if (isEdit) {
            document.getElementById('prompt-name').value = promptData.name;
            document.getElementById('prompt-template').value = promptData.template;
            document.getElementById('prompt-description').value = promptData.description || '';
        }
        
        // Set up form submission
        document.getElementById('add-prompt-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('prompt-name').value;
            const template = document.getElementById('prompt-template').value;
            const description = document.getElementById('prompt-description').value;
            
            try {
                if (isEdit) {
                    const prompt = await api.updatePrompt(promptData.id, { name, template, description });
                    this.updatePromptInList(prompt);
                } else {
                    const prompt = await api.createPrompt({ name, template, description });
                    this.addPromptToList(prompt);
                }
                this.hideModal();
            } catch (error) {
                alert(`Error ${isEdit ? 'updating' : 'adding'} prompt: ${error.message}`);
            }
        });
    }
    
    /**
     * Display models in the model list
     * @param {Array} models - List of models
     */
    displayModels(models) {
        this.modelList.innerHTML = '';
        
        if (models.length === 0) {
            this.modelList.innerHTML = '<div class="no-items">No models available</div>';
            return;
        }
        
        models.forEach(model => {
            this.addModelToList(model);
        });
    }
    
    /**
     * Add a model to the model list
     * @param {object} model - Model data
     */
    addModelToList(model) {
        const modelItem = this.modelItemTemplate.content.cloneNode(true);
        const modelName = modelItem.querySelector('.model-name');
        const checkbox = modelItem.querySelector('.model-checkbox');
        
        modelName.textContent = model.name;
        checkbox.dataset.id = model.id;
        
        this.modelList.appendChild(modelItem);
    }
    
    /**
     * Display prompts in the prompt list
     * @param {Array} prompts - List of prompts
     */
    displayPrompts(prompts) {
        this.promptList.innerHTML = '';
        
        if (prompts.length === 0) {
            this.promptList.innerHTML = '<div class="no-items">No prompts available</div>';
            return;
        }
        
        prompts.forEach(prompt => {
            this.addPromptToList(prompt);
        });
    }
    
    /**
     * Add a prompt to the prompt list
     * @param {object} prompt - Prompt data
     */
    addPromptToList(prompt) {
        const promptItem = this.promptItemTemplate.content.cloneNode(true);
        const promptName = promptItem.querySelector('.prompt-name');
        const checkbox = promptItem.querySelector('.prompt-checkbox');
        const editBtn = promptItem.querySelector('.edit-prompt');
        const deleteBtn = promptItem.querySelector('.delete-prompt');
        
        promptName.textContent = prompt.name;
        checkbox.dataset.id = prompt.id;
        
        // Set up edit button
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showAddPromptModal(prompt);
        });
        
        // Set up delete button
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete the prompt "${prompt.name}"?`)) {
                try {
                    await api.deletePrompt(prompt.id);
                    e.target.closest('.prompt-item').remove();
                } catch (error) {
                    alert(`Error deleting prompt: ${error.message}`);
                }
            }
        });
        
        this.promptList.appendChild(promptItem);
    }
    
    /**
     * Update a prompt in the prompt list
     * @param {object} prompt - Updated prompt data
     */
    updatePromptInList(prompt) {
        const promptItems = this.promptList.querySelectorAll('.prompt-item');
        
        for (const item of promptItems) {
            const checkbox = item.querySelector('.prompt-checkbox');
            
            if (checkbox.dataset.id == prompt.id) {
                const promptName = item.querySelector('.prompt-name');
                promptName.textContent = prompt.name;
                return;
            }
        }
    }
    
    /**
     * Add a new batch input field
     */
    addBatchInput() {
        const batchInput = document.createElement('div');
        batchInput.className = 'batch-input';
        
        batchInput.innerHTML = `
            <textarea rows="3" placeholder="Enter text here..."></textarea>
            <button class="remove-btn">×</button>
        `;
        
        // Set up remove button
        batchInput.querySelector('.remove-btn').addEventListener('click', () => {
            batchInput.remove();
        });
        
        this.batchInputsContainer.appendChild(batchInput);
    }
    
    /**
     * Handle process button click
     */
    onProcessClick() {
        // Get selected models
        const selectedModelIds = Array.from(this.modelList.querySelectorAll('.model-checkbox:checked'))
            .map(checkbox => parseInt(checkbox.dataset.id));
        
        // Get selected prompts
        const selectedPromptIds = Array.from(this.promptList.querySelectorAll('.prompt-checkbox:checked'))
            .map(checkbox => parseInt(checkbox.dataset.id));
        
        // Validate selections
        if (selectedModelIds.length === 0) {
            alert('Please select at least one model');
            return;
        }
        
        if (selectedPromptIds.length === 0) {
            alert('Please select at least one prompt');
            return;
        }
        
        // Check active input mode
        const isBatchMode = this.batchInputBtn.classList.contains('active');
        
        if (isBatchMode) {
            // Get batch input texts
            const batchTexts = Array.from(this.batchInputsContainer.querySelectorAll('textarea'))
                .map(textarea => textarea.value.trim())
                .filter(text => text !== '');
            
            if (batchTexts.length === 0) {
                alert('Please enter at least one text');
                return;
            }
            
            // Process batch
            this.processBatchTexts(batchTexts, selectedModelIds, selectedPromptIds);
        } else {
            // Get single input text
            const inputText = document.getElementById('input-text').value.trim();
            
            if (!inputText) {
                alert('Please enter some text');
                return;
            }
            
            // Process single text
            this.processSingleText(inputText, selectedModelIds, selectedPromptIds);
        }
    }
    
    /**
     * Process a single text
     * @param {string} text - Input text
     * @param {Array<number>} modelIds - Selected model IDs
     * @param {Array<number>} promptIds - Selected prompt IDs
     */
    async processSingleText(text, modelIds, promptIds) {
        try {
            this.processBtn.disabled = true;
            this.processBtn.textContent = 'Processing...';
            
            const result = await api.processText(text, modelIds, promptIds);
            
            // Clear results if this is the first result
            if (this.resultsContainer.querySelector('.no-results')) {
                this.resultsContainer.innerHTML = '';
            }
            
            this.displayResult(result);
        } catch (error) {
            alert(`Error processing text: ${error.message}`);
        } finally {
            this.processBtn.disabled = false;
            this.processBtn.textContent = 'Process';
        }
    }
    
    /**
     * Process multiple texts
     * @param {Array<string>} texts - Input texts
     * @param {Array<number>} modelIds - Selected model IDs
     * @param {Array<number>} promptIds - Selected prompt IDs
     */
    async processBatchTexts(texts, modelIds, promptIds) {
        try {
            this.processBtn.disabled = true;
            this.processBtn.textContent = 'Processing Batch...';
            
            const results = await api.batchProcess(texts, modelIds, promptIds);
            
            // Clear results
            this.resultsContainer.innerHTML = '';
            
            // Display each result
            results.forEach(result => {
                this.displayResult(result);
            });
        } catch (error) {
            alert(`Error processing batch: ${error.message}`);
        } finally {
            this.processBtn.disabled = false;
            this.processBtn.textContent = 'Process';
        }
    }
    
    /**
     * Display a processing result
     * @param {object} result - Processing result
     */
    displayResult(result) {
        const resultItem = this.resultItemTemplate.content.cloneNode(true);
        const inputText = resultItem.querySelector('.input-text');
        const outputsContainer = resultItem.querySelector('.outputs-container');
        
        // Set input text
        const input = result.results[0].input;
        inputText.textContent = input.text;
        
        // Add each output
        result.results.forEach(output => {
            const outputItem = this.outputItemTemplate.content.cloneNode(true);
            
            // Set output content
            outputItem.querySelector('.model-name').textContent = output.model.name;
            outputItem.querySelector('.prompt-name').textContent = output.prompt.name;
            outputItem.querySelector('.processing-time').textContent = `(${output.processing_time.toFixed(2)}s)`;
            outputItem.querySelector('.output-text').textContent = output.text;
            
            // Set up evaluation buttons
            const evalButtons = outputItem.querySelectorAll('.eval-btn');
            evalButtons.forEach(button => {
                button.addEventListener('click', async () => {
                    const quality = button.dataset.quality;
                    const notes = button.closest('.evaluation-controls').querySelector('textarea').value;
                    
                    try {
                        await api.createEvaluation(output.id, quality, notes);
                        
                        // Reset all buttons
                        evalButtons.forEach(btn => btn.classList.remove('selected'));
                        
                        // Select current button
                        button.classList.add('selected');
                    } catch (error) {
                        alert(`Error saving evaluation: ${error.message}`);
                    }
                });
            });
            
            outputsContainer.appendChild(outputItem);
        });
        
        // Add result to container (prepend to show newest first)
        this.resultsContainer.prepend(resultItem);
    }
}
