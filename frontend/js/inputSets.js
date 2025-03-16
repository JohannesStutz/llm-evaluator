/**
 * Input Sets UI component
 */
class InputSetsUI {
    constructor() {
        // Container elements
        this.inputSetsListContainer = document.getElementById('input-sets-list');
        this.inputListContainer = document.getElementById('input-list');
        this.currentSetNameElement = document.getElementById('current-set-name');

        // Action buttons
        this.createInputSetBtn = document.getElementById('create-input-set-btn');
        this.editInputSetBtn = document.getElementById('edit-input-set-btn');
        this.deleteInputSetBtn = document.getElementById('delete-input-set-btn');
        this.addInputBtn = document.getElementById('add-input-btn');

        // Templates
        this.inputSetItemTemplate = document.getElementById('input-set-item-template');
        this.inputItemTemplate = document.getElementById('input-item-template');
        this.createInputSetTemplate = document.getElementById('create-input-set-template');
        this.createInputTemplate = document.getElementById('create-input-template');

        // State
        this.currentInputSetId = null;

        // Initialize
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Create input set button
        this.createInputSetBtn.addEventListener('click', () => this.showCreateInputSetModal());

        // Edit input set button
        this.editInputSetBtn.addEventListener('click', () => this.showEditInputSetModal());

        // Delete input set button
        this.deleteInputSetBtn.addEventListener('click', () => this.deleteCurrentInputSet());

        // Add input button
        this.addInputBtn.addEventListener('click', () => this.showAddInputModal());
    }

    /**
     * Called when the input sets view is activated
     */
    onViewActivated() {
        this.loadInputSets();
    }

    /**
     * Load all input sets
     */
    async loadInputSets() {
        try {
            ui.showLoading(this.inputSetsListContainer);

            const inputSets = await api.getInputSets();

            if (inputSets.length === 0) {
                ui.showNoItems(this.inputSetsListContainer, 'No input sets available');
                return;
            }

            this.displayInputSets(inputSets);

            // If we have a current input set, refresh it
            if (this.currentInputSetId) {
                this.loadInputSet(this.currentInputSetId);
            } else if (inputSets.length > 0) {
                // Otherwise load the first one
                this.loadInputSet(inputSets[0].id);
            }
        } catch (error) {
            console.error('Error loading input sets:', error);
            ui.showError(this.inputSetsListContainer, 'Error loading input sets');
        }
    }

    /**
     * Display input sets in the list
     * @param {Array} inputSets - List of input sets
     */
    displayInputSets(inputSets) {
        this.inputSetsListContainer.innerHTML = '';

        inputSets.forEach(inputSet => {
            const inputSetItem = this.inputSetItemTemplate.content.cloneNode(true);
            const container = inputSetItem.querySelector('.input-set-item');
            const nameElement = inputSetItem.querySelector('.input-set-name');
            const descElement = inputSetItem.querySelector('.input-set-description');
            const countElement = inputSetItem.querySelector('.input-count');

            container.dataset.id = inputSet.id;
            nameElement.textContent = inputSet.name;
            descElement.textContent = inputSet.description || '';

            // Input count will be filled later when we load the input set
            if (inputSet.inputs) {
                countElement.textContent = inputSet.inputs.length;
            } else {
                countElement.textContent = '...';
            }

            // Make it active if it's the current input set
            if (inputSet.id === this.currentInputSetId) {
                container.classList.add('active');
            }

            // Set up click handler
            container.addEventListener('click', () => {
                this.loadInputSet(inputSet.id);
            });

            this.inputSetsListContainer.appendChild(inputSetItem);
        });
    }

    /**
     * Modified loadInputSet method for InputSetsUI to ensure inputs are sorted
     * @param {number} inputSetId - Input set ID
     */
    async loadInputSet(inputSetId) {
        try {
            // Update UI state
            this.currentInputSetId = inputSetId;

            // Update active state in list
            const items = this.inputSetsListContainer.querySelectorAll('.input-set-item');
            items.forEach(item => {
                if (parseInt(item.dataset.id) === inputSetId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            // Enable buttons
            this.editInputSetBtn.disabled = false;
            this.deleteInputSetBtn.disabled = false;
            this.addInputBtn.disabled = false;

            // Show loading state
            ui.showLoading(this.inputListContainer);
            this.currentSetNameElement.textContent = 'Loading...';

            // Fetch the input set
            const inputSet = await api.getInputSet(inputSetId);

            // Update the name
            this.currentSetNameElement.textContent = inputSet.name;

            // Display the inputs
            if (inputSet.inputs.length === 0) {
                ui.showNoItems(this.inputListContainer, 'No inputs in this set');
                return;
            }

            // Sort inputs by ID (newest first) before displaying
            const sortedInputs = [...inputSet.inputs].sort((a, b) => b.id - a.id);
            this.displayInputs(sortedInputs);

            // Update the input count in the list
            const countElement = this.inputSetsListContainer.querySelector(`.input-set-item[data-id="${inputSetId}"] .input-count`);
            if (countElement) {
                countElement.textContent = inputSet.inputs.length;
            }
        } catch (error) {
            console.error(`Error loading input set ${inputSetId}:`, error);
            ui.showError(this.inputListContainer, 'Error loading input set');
            this.currentSetNameElement.textContent = 'Error';
        }
    }

    /**
     * Display inputs in the list
     * @param {Array} inputs - List of inputs (should already be sorted)
     */
    displayInputs(inputs) {
        this.inputListContainer.innerHTML = '';

        inputs.forEach(input => {
            const inputItem = this.inputItemTemplate.content.cloneNode(true);
            const container = inputItem.querySelector('.input-item');
            const nameElement = inputItem.querySelector('.input-name');
            const textElement = inputItem.querySelector('.input-text');
            const editBtn = inputItem.querySelector('.edit-input-btn');
            const deleteBtn = inputItem.querySelector('.delete-input-btn');

            container.dataset.id = input.id;
            nameElement.textContent = input.name || `Input #${input.id}`;
            textElement.textContent = input.text;

            // Set up edit button
            editBtn.addEventListener('click', () => {
                this.showEditInputModal(input);
            });

            // Set up delete button
            deleteBtn.addEventListener('click', () => {
                this.deleteInput(input.id);
            });

            this.inputListContainer.appendChild(inputItem);
        });
    }

    /**
     * Show modal to create a new input set
     */
    showCreateInputSetModal() {
        const content = this.createInputSetTemplate.content.cloneNode(true);

        ui.showModal('Create Input Set', content);

        // Set up form submission
        document.getElementById('create-input-set-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('input-set-name').value;
            const description = document.getElementById('input-set-description').value;

            try {
                const inputSet = await api.createInputSet(name, description);
                ui.hideModal();
                this.loadInputSets();
                this.loadInputSet(inputSet.id);
            } catch (error) {
                alert(`Error creating input set: ${error.message}`);
            }
        });
    }

    /**
     * Show modal to edit an input set
     */
    async showEditInputSetModal() {
        if (!this.currentInputSetId) return;

        try {
            // Get the input set
            const inputSet = await api.getInputSet(this.currentInputSetId);

            // Create the modal content
            const content = this.createInputSetTemplate.content.cloneNode(true);

            // Update form
            const form = content.querySelector('form');
            form.id = 'edit-input-set-form';

            // Update field values
            const nameInput = content.querySelector('#input-set-name');
            nameInput.value = inputSet.name;

            const descInput = content.querySelector('#input-set-description');
            descInput.value = inputSet.description || '';

            // Update button text
            const submitBtn = content.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Update Input Set';

            ui.showModal('Edit Input Set', content);

            // Set up form submission
            document.getElementById('edit-input-set-form').addEventListener('submit', async (e) => {
                e.preventDefault();

                const name = document.getElementById('input-set-name').value;
                const description = document.getElementById('input-set-description').value;

                try {
                    await api.updateInputSet(this.currentInputSetId, { name, description });
                    ui.hideModal();
                    this.loadInputSets();
                } catch (error) {
                    alert(`Error updating input set: ${error.message}`);
                }
            });
        } catch (error) {
            console.error(`Error loading input set ${this.currentInputSetId} for editing:`, error);
            alert('Error loading input set for editing');
        }
    }

    /**
     * Delete the current input set
     */
    async deleteCurrentInputSet() {
        if (!this.currentInputSetId) return;

        if (!ui.confirm(`Are you sure you want to delete this input set? This will also delete all inputs in the set.`)) {
            return;
        }

        try {
            await api.deleteInputSet(this.currentInputSetId);
            this.currentInputSetId = null;
            this.currentSetNameElement.textContent = 'Select an Input Set';
            this.inputListContainer.innerHTML = '';
            this.editInputSetBtn.disabled = true;
            this.deleteInputSetBtn.disabled = true;
            this.addInputBtn.disabled = true;
            this.loadInputSets();
        } catch (error) {
            console.error(`Error deleting input set ${this.currentInputSetId}:`, error);
            alert('Error deleting input set');
        }
    }

    /**
     * Show modal to add a new input to the current set
     */
    showAddInputModal() {
        if (!this.currentInputSetId) return;

        const content = this.createInputTemplate.content.cloneNode(true);

        ui.showModal('Add Input', content);

        // Set up form submission
        document.getElementById('create-input-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('input-name').value;
            const text = document.getElementById('input-text').value;

            try {
                await api.addInputToSet(this.currentInputSetId, text, name);
                ui.hideModal();
                this.loadInputSet(this.currentInputSetId);
            } catch (error) {
                alert(`Error adding input: ${error.message}`);
            }
        });
    }

    /**
     * Show modal to edit an input
     * @param {object} input - Input data
     */
    showEditInputModal(input) {
        const content = this.createInputTemplate.content.cloneNode(true);

        // Update form ID
        const form = content.querySelector('form');
        form.id = 'edit-input-form';

        // Update field values
        const nameInput = content.querySelector('#input-name');
        nameInput.value = input.name || '';

        const textInput = content.querySelector('#input-text');
        textInput.value = input.text;

        // Update button text
        const submitBtn = content.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Update Input';

        ui.showModal('Edit Input', content);

        // Set up form submission
        document.getElementById('edit-input-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('input-name').value;
            const text = document.getElementById('input-text').value;

            try {
                await api.updateInput(input.id, { name, text });
                ui.hideModal();
                this.loadInputSet(this.currentInputSetId);
            } catch (error) {
                alert(`Error updating input: ${error.message}`);
            }
        });
    }

    /**
     * Delete an input
     * @param {number} inputId - Input ID
     */
    async deleteInput(inputId) {
        if (!ui.confirm('Are you sure you want to delete this input?')) {
            return;
        }

        try {
            await api.deleteInput(inputId);
            this.loadInputSet(this.currentInputSetId);
        } catch (error) {
            console.error(`Error deleting input ${inputId}:`, error);
            alert('Error deleting input');
        }
    }
}

// Create InputSetsUI instance
window.inputSetsUI = new InputSetsUI();
