/**
 * Prompt Workshop UI component
 */
class PromptWorkshopUI {
    constructor() {
        // Container elements
        this.promptSelect = document.getElementById('prompt-select');
        this.promptNameInput = document.getElementById('prompt-name-input');
        this.promptVersionSelect = document.getElementById('prompt-version-select');
        this.promptEditor = document.getElementById('prompt-editor-textarea');
        this.saveStatus = document.getElementById('save-status');

        // Action buttons
        this.newPromptBtn = document.getElementById('new-prompt-btn');
        this.duplicatePromptBtn = document.getElementById('duplicate-prompt-btn');
        this.savePromptBtn = document.getElementById('save-prompt-btn');
        this.deletePromptBtn = document.getElementById('delete-prompt-btn');

        // Templates
        this.createPromptTemplate = document.getElementById('create-prompt-template');

        // State
        this.currentPromptId = null;
        this.currentVersionId = null;
        this.currentPrompt = null;
        this.isEditing = false;
        this.prompts = [];

        // Initialize
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for the prompt workshop
     */
    setupEventListeners() {
        // Prompt select
        this.promptSelect.addEventListener('change', () => {
            const promptId = parseInt(this.promptSelect.value);
            if (promptId) {
                this.loadPrompt(promptId);
            } else {
                this.clearEditor();
            }
        });

        // Version select
        this.promptVersionSelect.addEventListener('change', () => {
            const versionId = parseInt(this.promptVersionSelect.value);
            if (versionId) {
                this.loadVersion(versionId);
            }
        });

        // New prompt button
        this.newPromptBtn.addEventListener('click', () => this.showNewPromptModal());

        // Duplicate prompt button
        this.duplicatePromptBtn.addEventListener('click', () => this.duplicateCurrentPrompt());



        // Save prompt button
        this.savePromptBtn.addEventListener('click', () => this.savePrompt());

        // Delete prompt button
        this.deletePromptBtn.addEventListener('click', () => this.deleteCurrentPrompt());

        // Variable tag click
        document.querySelector('.variable-tag').addEventListener('click', () => {
            this.insertVariableTag('{{input}}');
        });

        // Listen for input events on the prompt editor
        this.promptEditor.addEventListener('input', () => {
            this.isEditing = true;
            // Show unsaved changes indicator
            this.saveStatus.textContent = 'Unsaved changes';
        });
    }

    /**
     * Called when the prompt workshop view is activated
     */
    onViewActivated() {
        this.loadPrompts();
    }

    /**
     * Load all prompts
     */
    async loadPrompts() {
        try {
            this.promptSelect.disabled = true;
            this.promptSelect.innerHTML = '<option value="">Loading prompts...</option>';

            const prompts = await api.getPrompts();
            this.prompts = prompts;

            this.promptSelect.innerHTML = '<option value="">Select a prompt...</option>';

            if (prompts.length === 0) {
                this.promptSelect.innerHTML += '<option value="" disabled>No prompts available</option>';
                this.promptSelect.disabled = false;
                return;
            }

            prompts.forEach(prompt => {
                const option = document.createElement('option');
                option.value = prompt.id;
                option.textContent = prompt.name;
                this.promptSelect.appendChild(option);
            });

            this.promptSelect.disabled = false;

            // If we have a current prompt, select it
            if (this.currentPromptId) {
                this.promptSelect.value = this.currentPromptId;
                this.loadPrompt(this.currentPromptId);
            }
        } catch (error) {
            console.error('Error loading prompts:', error);
            this.promptSelect.innerHTML = '<option value="">Error loading prompts</option>';
            this.promptSelect.disabled = false;
        }
    }

    /**
     * Load a specific prompt
     * @param {number} promptId - Prompt ID
     */
    async loadPrompt(promptId) {
        try {
            this.clearEditor();
            this.currentPromptId = promptId;

            // Update prompt select
            this.promptSelect.value = promptId;

            // Disable inputs while loading
            this.promptNameInput.disabled = true;
            this.promptVersionSelect.disabled = true;
            this.promptEditor.disabled = true;
            this.savePromptBtn.disabled = true;
            this.deletePromptBtn.disabled = true;

            // Set loading state
            this.promptNameInput.value = 'Loading...';
            this.promptVersionSelect.innerHTML = '<option value="">Loading...</option>';
            this.promptEditor.value = '';

            // Fetch the prompt with versions
            const prompt = await api.getPrompt(promptId);
            this.currentPrompt = prompt;

            // Update name
            this.promptNameInput.value = prompt.name;
            this.promptNameInput.disabled = false;

            // Enable buttons
            this.duplicatePromptBtn.disabled = false;
            this.deletePromptBtn.disabled = false;

            // Populate versions
            this.promptVersionSelect.innerHTML = '';
            if (prompt.versions.length === 0) {
                this.promptVersionSelect.innerHTML = '<option value="" disabled>No versions available</option>';
                this.promptVersionSelect.disabled = true;
                return;
            }

            // Sort versions by number (newest first)
            const sortedVersions = [...prompt.versions].sort((a, b) => b.version_number - a.version_number);

            sortedVersions.forEach(version => {
                const option = document.createElement('option');
                option.value = version.id;
                option.textContent = `Version ${version.version_number}`;
                this.promptVersionSelect.appendChild(option);
            });

            this.promptVersionSelect.disabled = false;

            // Load the latest version
            this.loadVersion(sortedVersions[0].id);
        } catch (error) {
            console.error(`Error loading prompt ${promptId}:`, error);
            this.clearEditor();
            alert('Error loading prompt');
        }
    }

    /**
     * Load a specific prompt version
     * @param {number} versionId - Version ID
     */
    async loadVersion(versionId) {
        try {
            this.currentVersionId = versionId;

            // Update version select
            this.promptVersionSelect.value = versionId;

            // Set loading state
            this.promptEditor.value = 'Loading...';
            this.promptEditor.disabled = true;
            this.savePromptBtn.disabled = true;

            // Get the version details
            const version = await api.getPromptVersion(versionId);

            // Update editor
            this.promptEditor.value = version.template;
            this.promptEditor.disabled = false;

            // Enable save button
            this.savePromptBtn.disabled = false;

            // Reset editing state
            this.isEditing = false;
            this.saveStatus.textContent = '';
        } catch (error) {
            console.error(`Error loading version ${versionId}:`, error);
            this.promptEditor.value = 'Error loading version';
            this.promptEditor.disabled = true;
            this.savePromptBtn.disabled = true;
        }
    }

    /**
     * Clear the editor
     */
    clearEditor() {
        this.currentPromptId = null;
        this.currentVersionId = null;
        this.currentPrompt = null;
        this.isEditing = false;

        this.promptNameInput.value = '';
        this.promptNameInput.disabled = true;

        this.promptVersionSelect.innerHTML = '';
        this.promptVersionSelect.disabled = true;

        this.promptEditor.value = '';
        this.promptEditor.disabled = true;

        this.duplicatePromptBtn.disabled = true;
        this.savePromptBtn.disabled = true;
        this.deletePromptBtn.disabled = true;

        this.saveStatus.textContent = '';
    }

    /**
     * Show modal to create a new prompt
     */
    showNewPromptModal() {
        const content = this.createPromptTemplate.content.cloneNode(true);

        ui.showModal('Create New Prompt', content);

        // Set up form submission
        document.getElementById('create-prompt-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('new-prompt-name').value;
            const template = document.getElementById('new-prompt-template').value;
            const description = document.getElementById('new-prompt-description').value;

            try {
                const prompt = await api.createPrompt(name, template, description);
                ui.hideModal();
                
                // Refresh the workshop prompt list
                this.loadPrompts();
                
                // Also refresh the sidebar prompt list
                const prompts = await api.getPrompts();
                ui.displayPrompts(prompts);
                
                // Load the newly created prompt
                this.loadPrompt(prompt.id);
            } catch (error) {
                alert(`Error creating prompt: ${error.message}`);
            }
        });
    }

    /**
     * Duplicate the current prompt
     */
    async duplicateCurrentPrompt() {
        if (!this.currentPromptId) return;

        try {
            // Get the current prompt
            const prompt = await api.getPrompt(this.currentPromptId);

            // Get the current version
            const version = await api.getPromptVersion(this.currentVersionId);

            // Create a new prompt with the same template
            const newPrompt = await api.createPrompt(
                `${prompt.name} (Copy)`,
                version.template,
                prompt.description
            );

            // Refresh the workshop prompt list
            this.loadPrompts();
            
            // Also refresh the sidebar prompt list
            const prompts = await api.getPrompts();
            ui.displayPrompts(prompts);
            
            // Load the newly created prompt
            this.loadPrompt(newPrompt.id);
        } catch (error) {
            console.error('Error duplicating prompt:', error);
            alert('Error duplicating prompt');
        }
    }

    /**
     * Delete the current prompt
     */
    async deleteCurrentPrompt() {
        if (!this.currentPrompt) {
            return;
        }
        
        const promptName = this.currentPrompt.name;
        
        if (confirm(`Are you sure you want to delete the prompt "${promptName}"?`)) {
            try {
                await api.deletePrompt(this.currentPrompt.id);
                
                // Clear the editor first
                this.clearEditor();
                
                // Reload prompts
                this.loadPrompts();
                
                // Also refresh the sidebar prompt list
                const prompts = await api.getPrompts();
                ui.displayPrompts(prompts);
                
                // Reset the prompt select to empty
                this.promptSelect.value = '';
                
                alert(`Prompt "${promptName}" deleted successfully.`);
            } catch (error) {
                alert(`Error deleting prompt: ${error.message || 'Unknown error'}`);
            }
        }
    }



    /**
     * Save the current prompt
     */
    async savePrompt() {
        if (!this.currentPromptId) return;

        console.log("Saving prompt. Editing state:", this.isEditing);

        try {
            this.saveStatus.textContent = 'Saving...';

            // Save prompt name
            const name = this.promptNameInput.value;
            await api.updatePrompt(this.currentPromptId, { name });
            console.log("Updated prompt name");

            // If we're editing a version, create a new version
            if (this.isEditing) {
                // Create a new version
                const template = this.promptEditor.value;
                console.log("Creating new version with template:", template.substring(0, 50) + "...");

                const version = await api.createPromptVersion(this.currentPromptId, template);
                console.log("New version created:", version);

                // Reload the prompt
                this.loadPrompt(this.currentPromptId);

                // Set the current version
                setTimeout(() => {
                    this.promptVersionSelect.value = version.id;
                    this.loadVersion(version.id);
                }, 100);
            } else {
                console.log("Not creating new version because isEditing is false");
            }

            this.saveStatus.textContent = 'Saved';

            // Refresh both the workshop prompt list and sidebar prompt list
            const updatedPrompts = await api.getPrompts();
            ui.displayPrompts(updatedPrompts);
            this.loadPrompts();

            // Clear saved message after a delay
            setTimeout(() => {
                this.saveStatus.textContent = '';
            }, 3000);
        } catch (error) {
            console.error('Error saving prompt:', error);
            this.saveStatus.textContent = 'Error saving: ' + (error.message || 'Unknown error');

            // Show more detailed error in an alert
            alert(`Error saving prompt: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Insert a variable tag at the cursor position
     * @param {string} tag - Variable tag to insert
     */
    insertVariableTag(tag) {
        if (this.promptEditor.disabled) return;

        const start = this.promptEditor.selectionStart;
        const end = this.promptEditor.selectionEnd;
        const text = this.promptEditor.value;

        this.promptEditor.value = text.substring(0, start) + tag + text.substring(end);
        this.promptEditor.selectionStart = start + tag.length;
        this.promptEditor.selectionEnd = start + tag.length;
        this.promptEditor.focus();

        // Set editing state
        this.isEditing = true;
        this.saveStatus.textContent = 'Unsaved changes';
    }
}

// Create PromptWorkshopUI instance
window.promptWorkshopUI = new PromptWorkshopUI();
