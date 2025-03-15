/**
 * UI interactions for the LLM Evaluator
 */
class UI {
    constructor() {
        // Nav elements
        this.navLinks = {
            inputSets: document.getElementById('nav-input-sets'),
            promptWorkshop: document.getElementById('nav-prompt-workshop'),
            comparison: document.getElementById('nav-comparison'),
            history: document.getElementById('nav-history')
        };
        
        // View containers
        this.views = {
            inputSets: document.getElementById('input-sets-view'),
            promptWorkshop: document.getElementById('prompt-workshop-view'),
            comparison: document.getElementById('comparison-view'),
            history: document.getElementById('history-view')
        };
        
        // Main containers
        this.modelList = document.getElementById('model-list');
        this.promptList = document.getElementById('prompt-list');
        
        // Templates
        this.modelItemTemplate = document.getElementById('model-item-template');
        this.promptItemTemplate = document.getElementById('prompt-item-template');
        
        // Modal
        this.modalContainer = document.getElementById('modal-container');
        this.modalTitle = document.getElementById('modal-title');
        this.modalContent = document.getElementById('modal-content');
        
        // Action buttons
        this.addModelBtn = document.getElementById('add-model-btn');
        this.addPromptBtn = document.getElementById('add-prompt-btn');
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Navigation listeners
        for (const [key, link] of Object.entries(this.navLinks)) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(key);
            });
        }
        
        // Add model button
        this.addModelBtn.addEventListener('click', () => this.showAddModelModal());
        
        // Add prompt button
        this.addPromptBtn.addEventListener('click', () => this.showAddPromptModal());
        
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
     * Switch between views
     * @param {string} viewName - Name of the view to switch to
     */
    switchView(viewName) {
        // Update navigation links
        for (const [key, link] of Object.entries(this.navLinks)) {
            if (key === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        }
        
        // Update view containers
        for (const [key, view] of Object.entries(this.views)) {
            if (key === viewName) {
                view.classList.add('active-view');
            } else {
                view.classList.remove('active-view');
            }
        }
        
        // Trigger view-specific initialization if needed
        switch (viewName) {
            case 'inputSets':
                if (window.inputSetsUI) window.inputSetsUI.onViewActivated();
                break;
            case 'promptWorkshop':
                if (window.promptWorkshopUI) window.promptWorkshopUI.onViewActivated();
                break;
            case 'comparison':
                if (window.comparisonUI) window.comparisonUI.onViewActivated();
                break;
            case 'history':
                if (window.historyUI) window.historyUI.onViewActivated();
                break;
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
        const template = document.getElementById('create-input-set-template');
        const content = template.content.cloneNode(true);
        
        // Change form ID to match what we're actually doing
        const form = content.querySelector('form');
        form.id = 'add-model-form';
        
        // Change field IDs and labels
        const nameLabel = content.querySelector('label[for="input-set-name"]');
        nameLabel.textContent = 'Model Name:';
        nameLabel.setAttribute('for', 'model-name');
        
        const nameInput = content.querySelector('#input-set-name');
        nameInput.id = 'model-name';
        
        const descLabel = content.querySelector('label[for="input-set-description"]');
        descLabel.textContent = 'Description (optional):';
        descLabel.setAttribute('for', 'model-description');
        
        const descInput = content.querySelector('#input-set-description');
        descInput.id = 'model-description';
        
        // Change submit button text
        const submitBtn = content.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Add Model';
        
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
     * Show the add prompt modal
     */
    showAddPromptModal() {
        const template = document.getElementById('create-prompt-template');
        const content = template.content.cloneNode(true);
        
        this.showModal('Add Prompt', content);
        
        // Set up form submission
        document.getElementById('create-prompt-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('new-prompt-name').value;
            const template = document.getElementById('new-prompt-template').value;
            const description = document.getElementById('new-prompt-description').value;
            
            try {
                const prompt = await api.createPrompt(name, template, description);
                this.addPromptToList(prompt);
                this.hideModal();
                
                // Refresh the prompt workshop if it's active
                if (window.promptWorkshopUI) {
                    window.promptWorkshopUI.loadPrompts();
                }
            } catch (error) {
                alert(`Error adding prompt: ${error.message}`);
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
            // Switch to prompt workshop and load this prompt
            this.switchView('promptWorkshop');
            if (window.promptWorkshopUI) {
                window.promptWorkshopUI.loadPrompt(prompt.id);
            }
        });
        
        // Set up delete button
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete the prompt "${prompt.name}"?`)) {
                try {
                    await api.deletePrompt(prompt.id);
                    e.target.closest('.prompt-item').remove();
                    
                    // Refresh the prompt workshop if it's active
                    if (window.promptWorkshopUI) {
                        window.promptWorkshopUI.loadPrompts();
                    }
                } catch (error) {
                    alert(`Error deleting prompt: ${error.message}`);
                }
            }
        });
        
        this.promptList.appendChild(promptItem);
    }
    
    /**
     * Show a loading indicator in a container
     * @param {HTMLElement} container - Container element
     * @param {string} message - Loading message
     */
    showLoading(container, message = 'Loading...') {
        container.innerHTML = `<div class="loading">${message}</div>`;
    }
    
    /**
     * Show an error message in a container
     * @param {HTMLElement} container - Container element
     * @param {string} message - Error message
     */
    showError(container, message) {
        container.innerHTML = `<div class="error">${message}</div>`;
    }
    
    /**
     * Show a message indicating no items are available
     * @param {HTMLElement} container - Container element
     * @param {string} message - Message to display
     */
    showNoItems(container, message) {
        container.innerHTML = `<div class="no-items">${message}</div>`;
    }
    
    /**
     * Format a date for display
     * @param {string} dateStr - Date string
     * @returns {string} - Formatted date string
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleString();
    }
    
    /**
     * Format processing time for display
     * @param {number} seconds - Processing time in seconds
     * @returns {string} - Formatted processing time
     */
    formatProcessingTime(seconds) {
        return `${seconds.toFixed(2)}s`;
    }
    
    /**
     * Create a confirmation dialog
     * @param {string} message - Confirmation message
     * @returns {boolean} - True if confirmed, false otherwise
     */
    confirm(message) {
        return window.confirm(message);
    }
}

// Create UI instance
const ui = new UI();
