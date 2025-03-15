/**
 * Batch Evaluation UI component
 */
class BatchEvaluationUI {
    constructor() {
        // Container elements
        this.batchResultsGrid = document.getElementById('batch-results-grid');
        this.inputSetSelect = document.getElementById('batch-input-set');
        this.selectedModelsList = document.getElementById('selected-models-list');
        this.selectedPromptsList = document.getElementById('selected-prompts-list');

        // Action buttons
        this.runBatchBtn = document.getElementById('run-batch-btn');
        this.exportResultsBtn = document.getElementById('export-results-btn');

        // Filter and sort elements
        this.filterInput = document.getElementById('batch-filter-input');
        this.sortSelect = document.getElementById('batch-sort-select');
        this.sortDirectionBtn = document.getElementById('batch-sort-direction');

        // Templates
        this.batchResultRowTemplate = document.getElementById('batch-result-row-template');
        this.batchResultCellTemplate = document.getElementById('batch-result-cell-template');
        this.selectedModelTemplate = document.getElementById('selected-model-template');
        this.selectedPromptTemplate = document.getElementById('selected-prompt-template');

        // State
        this.selectedModels = new Map(); // Map of model ID -> model data
        this.selectedPrompts = new Map(); // Map of prompt ID -> prompt data
        this.batchResults = []; // Results from the batch evaluation
        this.isAscending = true; // Sort direction

        // Initialize
        this.setupEventListeners();

        console.log("BatchEvaluationUI constructor completed");
    }

    /**
     * Modified onViewActivated() method to ensure we load input sets and
     * synchronize the selected models and prompts when the view is activated
     */
    onViewActivated() {
        console.log("BatchEvaluationUI view activated");
        this.loadInputSets();
        // Small delay to ensure input sets are loaded before syncing models and prompts
        setTimeout(() => {
            this.syncSelectedModelsAndPrompts();
            this.setupCheckboxListeners();
            this.updateRunButtonState();
        }, 100);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Input set select
        this.inputSetSelect.addEventListener('change', () => {
            this.updateRunButtonState();
        });

        // Run batch button
        this.runBatchBtn.addEventListener('click', () => {
            this.runBatchEvaluation();
        });

        // Export results button
        this.exportResultsBtn.addEventListener('click', () => {
            this.exportResults();
        });

        // Filter input
        this.filterInput.addEventListener('input', () => {
            this.filterResults();
        });

        // Sort select
        this.sortSelect.addEventListener('change', () => {
            this.sortResults();
        });

        // Sort direction button
        this.sortDirectionBtn.addEventListener('click', () => {
            this.toggleSortDirection();
        });

        // We'll set up model/prompt checkbox listeners when they're created
        // This will be handled by observing the sidebar elements
    }

    /**
     * Setup checkbox listeners for models and prompts
     * This needs to be called after the checkboxes are created
     */
    setupCheckboxListeners() {
        // Remove any existing listeners (to prevent duplicates)
        document.querySelectorAll('.model-checkbox').forEach(checkbox => {
            checkbox.removeEventListener('change', this.handleModelCheckboxChange);
            checkbox.addEventListener('change', this.handleModelCheckboxChange.bind(this));
        });

        document.querySelectorAll('.prompt-checkbox').forEach(checkbox => {
            checkbox.removeEventListener('change', this.handlePromptCheckboxChange);
            checkbox.addEventListener('change', this.handlePromptCheckboxChange.bind(this));
        });
    }

    /**
     * Handle model checkbox change
     * @param {Event} event - Change event
     */
    handleModelCheckboxChange(event) {
        const checkbox = event.target;
        if (checkbox.checked) {
            this.addSelectedModel(parseInt(checkbox.dataset.id), checkbox.nextElementSibling.textContent);
        } else {
            this.removeSelectedModel(parseInt(checkbox.dataset.id));
        }
    }

    /**
     * Handle prompt checkbox change
     * @param {Event} event - Change event
     */
    handlePromptCheckboxChange(event) {
        const checkbox = event.target;
        if (checkbox.checked) {
            this.addSelectedPrompt(parseInt(checkbox.dataset.id), checkbox.nextElementSibling.textContent);
        } else {
            this.removeSelectedPrompt(parseInt(checkbox.dataset.id));
        }
    }

    /**
     * Modified loadInputSets() method for BatchEvaluationUI class to auto-select the newest input set
     */
    async loadInputSets() {
        try {
            console.log("Loading input sets for batch evaluation");
            this.inputSetSelect.disabled = true;
            this.inputSetSelect.innerHTML = '<option value="">Loading...</option>';

            const inputSets = await api.getInputSets();

            this.inputSetSelect.innerHTML = '<option value="">Select an Input Set</option>';

            if (inputSets.length === 0) {
                this.inputSetSelect.innerHTML += '<option value="" disabled>No input sets available</option>';
                this.inputSetSelect.disabled = false;
                return;
            }

            // Sort input sets by ID (assuming newer sets have higher IDs)
            // If your API returns creation timestamps, you could sort by that instead
            const sortedInputSets = [...inputSets].sort((a, b) => b.id - a.id);

            sortedInputSets.forEach(inputSet => {
                const option = document.createElement('option');
                option.value = inputSet.id;
                option.textContent = inputSet.name;
                this.inputSetSelect.appendChild(option);
            });

            this.inputSetSelect.disabled = false;
            console.log(`Loaded ${inputSets.length} input sets`);

            // Automatically select the newest input set (first in the sorted array)
            if (sortedInputSets.length > 0) {
                this.inputSetSelect.value = sortedInputSets[0].id;

                // Trigger the change event to update other components
                const changeEvent = new Event('change');
                this.inputSetSelect.dispatchEvent(changeEvent);

                console.log(`Auto-selected newest input set: ${sortedInputSets[0].name} (ID: ${sortedInputSets[0].id})`);
            }
        } catch (error) {
            console.error('Error loading input sets:', error);
            this.inputSetSelect.innerHTML = '<option value="">Error loading input sets</option>';
            this.inputSetSelect.disabled = false;
        }
    }

    /**
     * Sync the selected models and prompts with checkboxes in sidebar
     */
    syncSelectedModelsAndPrompts() {
        console.log("Syncing selected models and prompts");
        // Clear existing selections
        this.selectedModels.clear();
        this.selectedPrompts.clear();

        // Update selected models from checkboxes
        document.querySelectorAll('.model-checkbox:checked').forEach(checkbox => {
            this.addSelectedModel(
                parseInt(checkbox.dataset.id),
                checkbox.nextElementSibling.textContent
            );
        });

        // Update selected prompts from checkboxes
        document.querySelectorAll('.prompt-checkbox:checked').forEach(checkbox => {
            this.addSelectedPrompt(
                parseInt(checkbox.dataset.id),
                checkbox.nextElementSibling.textContent
            );
        });

        // Update UI
        this.updateSelectedModelsUI();
        this.updateSelectedPromptsUI();
        this.updateRunButtonState();
    }

    /**
     * Add a model to selected models
     * @param {number} id - Model ID
     * @param {string} name - Model name
     */
    addSelectedModel(id, name) {
        this.selectedModels.set(id, { id, name });
        this.updateSelectedModelsUI();
        this.updateRunButtonState();
    }

    /**
     * Remove a model from selected models
     * @param {number} id - Model ID
     */
    removeSelectedModel(id) {
        this.selectedModels.delete(id);
        this.updateSelectedModelsUI();
        this.updateRunButtonState();

        // Uncheck the corresponding checkbox
        const checkbox = document.querySelector(`.model-checkbox[data-id="${id}"]`);
        if (checkbox) checkbox.checked = false;
    }

    /**
     * Update the selected models UI
     */
    updateSelectedModelsUI() {
        if (this.selectedModels.size === 0) {
            this.selectedModelsList.innerHTML = '<div class="empty-selection">No models selected</div>';
            return;
        }

        this.selectedModelsList.innerHTML = '';

        this.selectedModels.forEach(model => {
            const modelItem = this.selectedModelTemplate.content.cloneNode(true);
            const itemName = modelItem.querySelector('.item-name');
            const removeBtn = modelItem.querySelector('.remove-item');
            const container = modelItem.querySelector('.selected-item');

            itemName.textContent = model.name;
            container.dataset.id = model.id;

            // Set up remove button
            removeBtn.addEventListener('click', () => {
                this.removeSelectedModel(model.id);
            });

            this.selectedModelsList.appendChild(modelItem);
        });
    }

    /**
     * Add a prompt to selected prompts
     * @param {number} id - Prompt ID
     * @param {string} name - Prompt name
     */
    addSelectedPrompt(id, name) {
        this.selectedPrompts.set(id, { id, name });
        this.updateSelectedPromptsUI();
        this.updateRunButtonState();
    }

    /**
     * Remove a prompt from selected prompts
     * @param {number} id - Prompt ID
     */
    removeSelectedPrompt(id) {
        this.selectedPrompts.delete(id);
        this.updateSelectedPromptsUI();
        this.updateRunButtonState();

        // Uncheck the corresponding checkbox
        const checkbox = document.querySelector(`.prompt-checkbox[data-id="${id}"]`);
        if (checkbox) checkbox.checked = false;
    }

    /**
     * Update the selected prompts UI
     */
    updateSelectedPromptsUI() {
        if (this.selectedPrompts.size === 0) {
            this.selectedPromptsList.innerHTML = '<div class="empty-selection">No prompts selected</div>';
            return;
        }

        this.selectedPromptsList.innerHTML = '';

        this.selectedPrompts.forEach(prompt => {
            const promptItem = this.selectedPromptTemplate.content.cloneNode(true);
            const itemName = promptItem.querySelector('.item-name');
            const removeBtn = promptItem.querySelector('.remove-item');
            const container = promptItem.querySelector('.selected-item');

            itemName.textContent = prompt.name;
            container.dataset.id = prompt.id;

            // Set up remove button
            removeBtn.addEventListener('click', () => {
                this.removeSelectedPrompt(prompt.id);
            });

            this.selectedPromptsList.appendChild(promptItem);
        });
    }

    /**
     * Update the state of the run button based on selections
     */
    updateRunButtonState() {
        const inputSetSelected = this.inputSetSelect.value !== '';
        const hasSelectedModels = this.selectedModels.size > 0;
        const hasSelectedPrompts = this.selectedPrompts.size > 0;

        this.runBatchBtn.disabled = !(inputSetSelected && hasSelectedModels && hasSelectedPrompts);
    }

    /**
     * Enhanced runBatchEvaluation with better debugging
     */
    async runBatchEvaluation() {
        const inputSetId = this.inputSetSelect.value;

        if (!inputSetId) {
            alert('Please select an input set');
            return;
        }

        if (this.selectedModels.size === 0) {
            alert('Please select at least one model');
            return;
        }

        if (this.selectedPrompts.size === 0) {
            alert('Please select at least one prompt');
            return;
        }

        // Show loading state
        this.runBatchBtn.disabled = true;
        ui.showLoading(this.batchResultsGrid, 'Running batch evaluation...');

        try {
            // Get the input set with its inputs
            const inputSet = await api.getInputSet(inputSetId);
            console.log("Loaded input set:", inputSet);

            if (inputSet.inputs.length === 0) {
                ui.showNoItems(this.batchResultsGrid, 'The selected input set has no inputs');
                this.runBatchBtn.disabled = false;
                return;
            }

            // Prepare model and prompt IDs
            const modelIds = Array.from(this.selectedModels.keys());
            const promptIds = Array.from(this.selectedPrompts.keys());

            console.log(`Starting batch processing with ${inputSet.inputs.length} inputs, ${modelIds.length} models, and ${promptIds.length} prompts`);

            // Use the compare-prompts endpoint for efficient batch processing
            const results = await api.batchProcessInputs(
                inputSet.inputs,
                modelIds,
                promptIds
            );

            console.log(`Received ${results.length} batch results`);

            // If results are received but might have data structure issues,
            // try to augment with data from the input set
            if (results.length > 0) {
                results.forEach(result => {
                    // If input is missing or incomplete, try to find the matching input from inputSet
                    const inputId = result.input_id;
                    if (inputId && (!result.input || !result.input.id)) {
                        const matchingInput = inputSet.inputs.find(input => input.id === inputId);
                        if (matchingInput) {
                            console.log(`Augmenting result for input #${inputId} with data from input set`);
                            result.input = matchingInput;
                        }
                    }
                });
            }

            // Store the results
            this.batchResults = results;

            // Display the results
            this.displayBatchResults();

            // Enable export button
            this.exportResultsBtn.disabled = false;

            // Re-enable run button
            this.runBatchBtn.disabled = false;
        } catch (error) {
            console.error('Error running batch evaluation:', error);
            ui.showError(this.batchResultsGrid, 'Error running batch evaluation: ' + error.message);
            this.runBatchBtn.disabled = false;
        }
    }

    /**
     * More robust displayBatchResults() function for BatchEvaluationUI class
     * This version handles different data structures between stored and fresh LLM results
     */
    displayBatchResults() {
        this.batchResultsGrid.innerHTML = '';

        if (this.batchResults.length === 0) {
            ui.showNoItems(this.batchResultsGrid, 'No results to display');
            return;
        }

        // Debug: Log the first result structure to console to help diagnose issues
        console.log("First batch result structure:", this.batchResults[0]);

        // Create a row for each input
        this.batchResults.forEach(inputResult => {
            const rowItem = this.batchResultRowTemplate.content.cloneNode(true);
            const rowContainer = rowItem.querySelector('.batch-result-row');
            const inputNameElement = rowItem.querySelector('.input-name');
            const inputTextElement = rowItem.querySelector('.input-text');
            const resultCellsContainer = rowItem.querySelector('.batch-result-cells');

            // Set input data with multiple fallback paths to handle different response structures
            const input = inputResult.input || {};

            // For input ID, try multiple possible sources with fallbacks
            const inputId = input.id || inputResult.input_id || "unknown";
            rowContainer.dataset.inputId = inputId;

            // For input name, try multiple fallbacks
            const inputName = input.name ||
                            (typeof inputId !== 'undefined' && inputId !== "unknown" ?
                            `Input #${inputId}` : "Unnamed Input");
            inputNameElement.textContent = inputName;

            // For input text, provide a fallback if missing
            inputTextElement.textContent = input.text ||
                                        inputResult.text ||
                                        "No text available";

            // Create a cell for each prompt result (model+prompt combination)
            if (inputResult.prompt_results && inputResult.prompt_results.length > 0) {
                inputResult.prompt_results.forEach(result => {
                    const cellItem = this.batchResultCellTemplate.content.cloneNode(true);
                    const cellContainer = cellItem.querySelector('.batch-result-cell');
                    const modelNameElement = cellItem.querySelector('.model-name');
                    const promptNameElement = cellItem.querySelector('.prompt-name');
                    const timestampElement = cellItem.querySelector('.cell-timestamp');
                    const processingTimeElement = cellItem.querySelector('.processing-time');
                    const outputTextElement = cellItem.querySelector('.output-text');
                    const viewPromptBtn = cellItem.querySelector('.view-prompt-btn');
                    const evalButtons = cellItem.querySelectorAll('.eval-btn');

                    // Set cell data with fallbacks for each property
                    cellContainer.dataset.outputId = result.output_id || "";
                    cellContainer.dataset.modelId = result.model_id || "";
                    cellContainer.dataset.promptId = result.prompt_id || "";
                    modelNameElement.textContent = result.model_name || "Unknown model";
                    promptNameElement.textContent = result.prompt_name || "Unknown prompt";

                    // Add version number if available
                    if (result.prompt_version_number) {
                        promptNameElement.textContent += ` (v${result.prompt_version_number})`;
                    }

                    // Format timestamp with fallback
                    const timestamp = result.created_at ? new Date(result.created_at) : new Date();
                    timestampElement.textContent = timestamp.toLocaleString();

                    // Processing time with fallback
                    const processingTime = typeof result.processing_time === 'number' ?
                                        result.processing_time.toFixed(2) : "?";
                    processingTimeElement.textContent = `Processing: ${processingTime}s`;

                    // Output text with fallback
                    outputTextElement.textContent = result.text || "No output text available";

                    // Make the view prompt button conditional on having a template
                    if (result.prompt_template) {
                        viewPromptBtn.addEventListener('click', () => {
                            this.showPromptModal(result.prompt_template);
                        });
                    } else {
                        viewPromptBtn.disabled = true;
                        viewPromptBtn.textContent = "No template";
                    }

                    // Set up evaluation buttons
                    evalButtons.forEach(button => {
                        // If there's already an evaluation, select the corresponding button
                        if (result.evaluation && result.evaluation.quality === button.dataset.quality) {
                            button.classList.add('selected');
                        }

                        button.addEventListener('click', async () => {
                            const quality = button.dataset.quality;

                            try {
                                if (!result.output_id) {
                                    throw new Error("Cannot evaluate: output_id is missing");
                                }

                                await api.createEvaluation(result.output_id, quality);

                                // Reset all buttons in this cell
                                evalButtons.forEach(btn => btn.classList.remove('selected'));

                                // Select current button
                                button.classList.add('selected');

                                // Update the result in memory
                                result.evaluation = { quality };

                                // Show success message
                                alert('Evaluation saved');
                            } catch (error) {
                                console.error('Error saving evaluation:', error);
                                alert(`Error saving evaluation: ${error.message}`);
                            }
                        });
                    });

                    resultCellsContainer.appendChild(cellItem);
                });
            } else {
                // No results for this input
                const noResultsMessage = document.createElement('div');
                noResultsMessage.className = 'no-results';
                noResultsMessage.textContent = 'No results available for this input';
                resultCellsContainer.appendChild(noResultsMessage);
            }

            this.batchResultsGrid.appendChild(rowItem);
        });
    }

    /**
     * Filter the displayed results based on the filter input
     */
    filterResults() {
        const filterText = this.filterInput.value.toLowerCase();

        if (!filterText) {
            // Show all rows
            document.querySelectorAll('.batch-result-row').forEach(row => {
                row.style.display = '';
            });
            return;
        }

        // Filter rows based on input text and name
        document.querySelectorAll('.batch-result-row').forEach(row => {
            const inputName = row.querySelector('.input-name').textContent.toLowerCase();
            const inputText = row.querySelector('.input-text').textContent.toLowerCase();

            if (inputName.includes(filterText) || inputText.includes(filterText)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    /**
     * Toggle the sort direction
     */
    toggleSortDirection() {
        this.isAscending = !this.isAscending;

        // Update the button text
        const sortIcon = this.sortDirectionBtn.querySelector('span');
        if (this.isAscending) {
            sortIcon.className = 'sort-asc';
            sortIcon.textContent = '↑';
        } else {
            sortIcon.className = 'sort-desc';
            sortIcon.textContent = '↓';
        }

        // Re-sort results
        this.sortResults();
    }

    /**
     * Sort the displayed results based on the sort select
     */
    sortResults() {
        const sortBy = this.sortSelect.value;
        const rows = Array.from(document.querySelectorAll('.batch-result-row'));

        if (rows.length <= 1) return;

        // Sort the rows
        rows.sort((a, b) => {
            let valueA, valueB;

            switch (sortBy) {
                case 'input':
                    valueA = a.querySelector('.input-name').textContent;
                    valueB = b.querySelector('.input-name').textContent;
                    break;
                case 'model':
                    valueA = a.querySelector('.model-name').textContent;
                    valueB = b.querySelector('.model-name').textContent;
                    break;
                case 'prompt':
                    valueA = a.querySelector('.prompt-name').textContent;
                    valueB = b.querySelector('.prompt-name').textContent;
                    break;
                case 'time':
                    valueA = parseFloat(a.querySelector('.processing-time').textContent.match(/[\d.]+/)[0]);
                    valueB = parseFloat(b.querySelector('.processing-time').textContent.match(/[\d.]+/)[0]);
                    break;
                default:
                    return 0;
            }

            // Compare values based on sort direction
            if (this.isAscending) {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });

        // Reattach the sorted rows
        const grid = this.batchResultsGrid;
        rows.forEach(row => grid.appendChild(row));
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

    /**
     * Export the batch results to a CSV file
     */
    exportResults() {
        if (this.batchResults.length === 0) {
            alert('No results to export');
            return;
        }

        // Create CSV content
        let csv = 'Input,Input Text,Model,Prompt,Version,Output,Processing Time (s),Timestamp,Evaluation\n';

        this.batchResults.forEach(inputResult => {
            const inputName = (inputResult.input.name || `Input #${inputResult.input_id}`).replace(/,/g, ' ');
            const inputText = inputResult.input.text.replace(/,/g, ' ').replace(/\n/g, ' ');

            if (inputResult.prompt_results && inputResult.prompt_results.length > 0) {
                inputResult.prompt_results.forEach(result => {
                    const modelName = result.model_name.replace(/,/g, ' ');
                    const promptName = result.prompt_name.replace(/,/g, ' ');
                    const version = result.prompt_version_number || '';
                    const output = result.text.replace(/,/g, ' ').replace(/\n/g, ' ');
                    const processingTime = result.processing_time.toFixed(2);
                    const timestamp = new Date(result.created_at).toLocaleString();
                    const evaluation = result.evaluation ? result.evaluation.quality : 'not evaluated';

                    csv += `"${inputName}","${inputText}","${modelName}","${promptName}","${version}","${output}",${processingTime},"${timestamp}","${evaluation}"\n`;
                });
            }
        });

        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `batch-evaluation-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Make BatchEvaluationUI available globally
window.BatchEvaluationUI = BatchEvaluationUI;
console.log("BatchEvaluationUI class defined");
