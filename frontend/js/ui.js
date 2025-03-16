/**
 * UI interactions for the LLM Evaluator - Modified version
 */
class UI {
    constructor() {
        // Nav elements
        this.navLinks = {
            inputSets: document.getElementById('nav-input-sets'),
            promptWorkshop: document.getElementById('nav-prompt-workshop'),
            batchEvaluation: document.getElementById('nav-batch-evaluation'),
            history: document.getElementById('nav-history')
        };

        // View containers
        this.views = {
            inputSets: document.getElementById('input-sets-view'),
            promptWorkshop: document.getElementById('prompt-workshop-view'),
            batchEvaluation: document.getElementById('batch-evaluation-view'),
            history: document.getElementById('history-view')
        };

        // Main containers
        this.modelList = document.getElementById('model-list');
        this.promptList = document.getElementById('prompt-list');

        // Model filter
        this.modelFilterInput = document.getElementById('model-filter-input');

        // Templates
        this.modelItemTemplate = document.getElementById('model-item-template');
        this.promptItemTemplate = document.getElementById('prompt-item-template');

        // Modal
        this.modalContainer = document.getElementById('modal-container');
        this.modalTitle = document.getElementById('modal-title');
        this.modalContent = document.getElementById('modal-content');

        // Action buttons
        this.addPromptBtn = document.getElementById('add-prompt-btn');

        // Setup event listeners
        this.setupEventListeners();

        // Initialize model filter with saved value (if any)
        this.initializeModelFilter();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Navigation listeners
        for (const [key, link] of Object.entries(this.navLinks)) {
            if (link) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchView(key);
                });
            }
        }

        // Add prompt button
        this.addPromptBtn.addEventListener('click', () => this.showAddPromptModal());

        // Model filter input
        if (this.modelFilterInput) {
            this.modelFilterInput.addEventListener('input', () => this.filterModels());
        }

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
     * Initialize the model filter with saved value
     */
    initializeModelFilter() {
        if (this.modelFilterInput) {
            // Try to load the saved filter value from localStorage
            const savedFilter = localStorage.getItem('modelFilter');
            if (savedFilter) {
                this.modelFilterInput.value = savedFilter;
                // Apply the filter after models are loaded
                setTimeout(() => this.filterModels(), 500);
            }
        }
    }

    /**
     * Filter models based on input text
     */
    filterModels() {
        const filterText = this.modelFilterInput.value.toLowerCase();

        // Save the filter text to localStorage
        localStorage.setItem('modelFilter', filterText);

        // Get all model items
        const modelItems = this.modelList.querySelectorAll('.model-item');

        // Filter models
        modelItems.forEach(item => {
            const modelName = item.querySelector('.model-name').textContent.toLowerCase();
            if (modelName.includes(filterText)) {
                item.classList.remove('filtered');
            } else {
                item.classList.add('filtered');
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
            if (link) {
                if (key === viewName) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            }
        }

        // Update view containers
        for (const [key, view] of Object.entries(this.views)) {
            if (view) {
                if (key === viewName) {
                    view.classList.add('active-view');
                } else {
                    view.classList.remove('active-view');
                }
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
            case 'batchEvaluation':
                if (window.batchEvaluationUI) window.batchEvaluationUI.onViewActivated();
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
            const systemPrompt = document.getElementById('new-system-prompt').value;

            try {
                const prompt = await api.createPrompt(name, template, description, systemPrompt);
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

        // Apply any saved filter
        this.filterModels();
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

        // If we have a batchEvaluationUI instance, update its checkbox listeners
        if (window.batchEvaluationUI) {
            window.batchEvaluationUI.setupCheckboxListeners();
        }
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

        this.promptList.appendChild(promptItem);

        // If we have a batchEvaluationUI instance, update its checkbox listeners
        if (window.batchEvaluationUI) {
            window.batchEvaluationUI.setupCheckboxListeners();
        }
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
