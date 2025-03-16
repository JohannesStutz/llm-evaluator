/**
 * Enhanced History UI component with Matrix View
 */
class HistoryUI {
    constructor() {
        // Container elements
        this.resultsContainer = document.getElementById('history-results');
        this.matrixContainer = document.getElementById('history-matrix');
        this.inputSetFilter = document.getElementById('history-input-set-filter');
        this.inputFilter = document.getElementById('history-input-filter');

        // New elements for matrix view
        this.viewToggleBtn = document.getElementById('history-view-toggle');
        this.modelFilter = document.getElementById('history-model-filter');
        this.promptFilter = document.getElementById('history-prompt-filter');

        // Action buttons
        this.loadHistoryBtn = document.getElementById('load-history-btn');

        // Templates
        this.historyResultTemplate = document.getElementById('history-result-template');
        this.comparisonOutputTemplate = document.getElementById('comparison-output-template');
        this.matrixTemplate = document.getElementById('matrix-view-template');
        this.streamlinedResultTemplate = document.getElementById('streamlined-result-template');

        // State
        this.viewMode = 'matrix'; // 'timeline' or 'matrix'
        this.historyData = null; // Store loaded history data

        // Initialize
        this.setupEventListeners();

        // Set initial UI state for matrix view as default
        this.updateViewUI();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Input set filter
        this.inputSetFilter.addEventListener('change', () => {
            this.loadInputsForSet();
        });

        // Load history button
        this.loadHistoryBtn.addEventListener('click', () => {
            this.loadHistory();
        });

        // View toggle button
        this.viewToggleBtn.addEventListener('click', () => {
            this.toggleViewMode();
        });

        // Filter change events for matrix view
        this.modelFilter.addEventListener('change', () => {
            if (this.historyData && this.viewMode === 'matrix') {
                this.displayMatrixView(this.historyData);
            }
        });

        this.promptFilter.addEventListener('change', () => {
            if (this.historyData && this.viewMode === 'matrix') {
                this.displayMatrixView(this.historyData);
            }
        });
    }

    /**
     * Toggle between timeline and matrix view
     */
    toggleViewMode() {
        this.viewMode = this.viewMode === 'timeline' ? 'matrix' : 'timeline';
        this.updateViewUI();

        // If we have history data, update the display
        if (this.historyData) {
            this.displayHistory(this.historyData);
        }
    }

    /**
     * Update UI based on current view mode
     */
    updateViewUI() {
        if (this.viewMode === 'timeline') {
            this.viewToggleBtn.textContent = 'Switch to Matrix View';
            this.resultsContainer.classList.remove('hidden');
            this.matrixContainer.classList.add('hidden');
            document.querySelector('.matrix-filters').classList.add('hidden');
        } else {
            this.viewToggleBtn.textContent = 'Switch to Timeline View';
            this.resultsContainer.classList.add('hidden');
            this.matrixContainer.classList.remove('hidden');
            document.querySelector('.matrix-filters').classList.remove('hidden');
        }
    }

    /**
     * Called when the history view is activated
     */
    onViewActivated() {
        this.loadInputSets();
        this.updateViewUI();
    }

    /**
     * Load all input sets for the filter and auto-select the newest one
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

            // Sort input sets by ID (assuming newer sets have higher IDs)
            // If your API returns creation timestamps, you could sort by that instead
            const sortedInputSets = [...inputSets].sort((a, b) => b.id - a.id);

            sortedInputSets.forEach(inputSet => {
                const option = document.createElement('option');
                option.value = inputSet.id;
                option.textContent = inputSet.name;
                this.inputSetFilter.appendChild(option);
            });

            this.inputSetFilter.disabled = false;
            console.log(`Loaded ${inputSets.length} input sets`);

            // Automatically select the newest input set (first in the sorted array)
            if (sortedInputSets.length > 0) {
                this.inputSetFilter.value = sortedInputSets[0].id;

                // Trigger the change event to update other components
                const changeEvent = new Event('change');
                this.inputSetFilter.dispatchEvent(changeEvent);

                console.log(`Auto-selected newest input set: ${sortedInputSets[0].name} (ID: ${sortedInputSets[0].id})`);
            }
        } catch (error) {
            console.error('Error loading input sets:', error);
            this.inputSetFilter.innerHTML = '<option value="">Error loading input sets</option>';
            this.inputSetFilter.disabled = false;
        }
    }

    /**
     * Load inputs for the selected input set and auto-select the newest one
     */
    async loadInputsForSet() {
        const inputSetId = this.inputSetFilter.value;

        // Reset input filter
        this.inputFilter.innerHTML = '<option value="">Select Input</option>';

        if (!inputSetId) {
            this.inputFilter.disabled = true;
            return;
        }

        try {
            this.inputFilter.disabled = true;
            this.inputFilter.innerHTML = '<option value="">Loading...</option>';

            const inputSet = await api.getInputSet(inputSetId);

            this.inputFilter.innerHTML = '<option value="">Select Input</option>';

            if (inputSet.inputs.length === 0) {
                this.inputFilter.innerHTML += '<option value="" disabled>No inputs available</option>';
                this.inputFilter.disabled = false;
                return;
            }

            // Sort inputs by ID (newest first)
            const sortedInputs = [...inputSet.inputs].sort((a, b) => b.id - a.id);

            sortedInputs.forEach(input => {
                const option = document.createElement('option');
                option.value = input.id;
                option.textContent = input.name || `Input #${input.id}`;
                this.inputFilter.appendChild(option);
            });

            this.inputFilter.disabled = false;

            // Auto-select the first (newest) input
            if (sortedInputs.length > 0) {
                this.inputFilter.value = sortedInputs[0].id;
                console.log(`Auto-selected input: ${sortedInputs[0].name || `Input #${sortedInputs[0].id}`}`);

                // Automatically load the history for this input
                this.loadHistory();
            }
        } catch (error) {
            console.error('Error loading inputs:', error);
            this.inputFilter.innerHTML = '<option value="">Error loading inputs</option>';
            this.inputFilter.disabled = false;
        }
    }

    /**
     * Load history for the selected input
     */
    async loadHistory() {
        const inputId = this.inputFilter.value;

        if (!inputId) {
            alert('Please select an input');
            return;
        }

        try {
            // Disable button and show loading
            this.loadHistoryBtn.disabled = true;
            const targetContainer = this.viewMode === 'timeline' ? this.resultsContainer : this.matrixContainer;
            ui.showLoading(targetContainer, 'Loading history...');

            // Load history
            const history = await api.getInputHistory(inputId);
            this.historyData = history; // Store for view switching

            // Populate model and prompt filters
            this.populateFilters(history);

            // Display history
            this.displayHistory(history);

            // Re-enable button
            this.loadHistoryBtn.disabled = false;
        } catch (error) {
            console.error('Error loading history:', error);
            const targetContainer = this.viewMode === 'timeline' ? this.resultsContainer : this.matrixContainer;
            ui.showError(targetContainer, 'Error loading history');
            this.loadHistoryBtn.disabled = false;
        }
    }

    /**
     * Populate filter dropdowns with data from history
     * @param {object} history - History data
     */
    populateFilters(history) {
        // Clear existing options
        this.modelFilter.innerHTML = '<option value="">All Models</option>';
        this.promptFilter.innerHTML = '<option value="">All Prompts</option>';

        if (!history.results || history.results.length === 0) {
            return;
        }

        // Track unique models and prompts to avoid duplicates
        const models = new Map();
        const prompts = new Map();

        history.results.forEach(result => {
            if (result.model_id && !models.has(result.model_id)) {
                models.set(result.model_id, result.model_name || `Model ${result.model_id}`);
            }
            if (result.prompt_id && !prompts.has(result.prompt_id)) {
                prompts.set(result.prompt_id, result.prompt_name || `Prompt ${result.prompt_id}`);
            }
        });

        // Add models to filter
        models.forEach((name, id) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            this.modelFilter.appendChild(option);
        });

        // Add prompts to filter
        prompts.forEach((name, id) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            this.promptFilter.appendChild(option);
        });
    }

    /**
     * Display history for an input based on current view mode
     * @param {object} history - History data
     */
    displayHistory(history) {
        if (this.viewMode === 'timeline') {
            this.displayTimelineView(history);
        } else {
            this.displayMatrixView(history);
        }
    }

    /**
     * Display history in timeline view (original implementation)
     * @param {object} history - History data
     */
    displayTimelineView(history) {
        // Clear the results container
        this.resultsContainer.innerHTML = '';

        if (!history.input) {
            ui.showNoItems(this.resultsContainer, 'Input not found');
            return;
        }

        if (history.results.length === 0) {
            ui.showNoItems(this.resultsContainer, 'No history available for this input');
            return;
        }

        // Create a history result container
        const historyItem = this.historyResultTemplate.content.cloneNode(true);
        const container = historyItem.querySelector('.history-result');
        const nameElement = historyItem.querySelector('.input-name');
        const textElement = historyItem.querySelector('.input-text');
        const timelineContainer = historyItem.querySelector('.history-timeline');
        const outputsContainer = historyItem.querySelector('.history-outputs');

        // Set input details
        nameElement.textContent = history.input.name || `Input #${history.input.id}`;
        textElement.textContent = history.input.text;

        // Group results by creation date (year-month-day)
        const resultsByDate = {};
        history.results.forEach(result => {
            const date = new Date(result.created_at);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

            if (!resultsByDate[dateStr]) {
                resultsByDate[dateStr] = [];
            }

            resultsByDate[dateStr].push(result);
        });

        // Create timeline items
        const dateStrs = Object.keys(resultsByDate).sort((a, b) => b.localeCompare(a)); // Most recent first

        dateStrs.forEach((dateStr, index) => {
            const results = resultsByDate[dateStr];

            // Create a timeline item
            const timelineItem = document.createElement('div');
            timelineItem.className = 'timeline-item';
            if (index === 0) {
                timelineItem.classList.add('active');
            }

            // Format date (2023-01-31 -> Jan 31, 2023)
            const [year, month, day] = dateStr.split('-');
            const date = new Date(year, month - 1, day);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            timelineItem.innerHTML = `
                <div class="timeline-date">${formattedDate}</div>
                <div class="timeline-count">${results.length} results</div>
            `;

            // Set data attributes
            timelineItem.dataset.date = dateStr;

            // Add click event
            timelineItem.addEventListener('click', () => {
                // Update active state
                timelineContainer.querySelectorAll('.timeline-item').forEach(item => {
                    item.classList.remove('active');
                });
                timelineItem.classList.add('active');

                // Display results for this date
                this.displayResultsForDate(outputsContainer, resultsByDate[dateStr]);
            });

            timelineContainer.appendChild(timelineItem);
        });

        // Display results for the first date by default
        if (dateStrs.length > 0) {
            this.displayResultsForDate(outputsContainer, resultsByDate[dateStrs[0]]);
        }

        this.resultsContainer.appendChild(historyItem);
    }

    /**
     * Display results for a specific date in the timeline view
     * @param {HTMLElement} container - Container element
     * @param {Array} results - Results for the date
     */
    displayResultsForDate(container, results) {
        // Clear the container
        container.innerHTML = '';

        if (results.length === 0) {
            container.innerHTML = '<div class="no-items">No results for this date</div>';
            return;
        }

        // Sort results by creation time (newest first)
        const sortedResults = [...results].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        // Display each result
        sortedResults.forEach(result => {
            // Create a wrapper element for the result component
            const wrapper = document.createElement('div');
            wrapper.className = 'result-component-wrapper';

            // Define the evaluation callback
            const onEvaluate = async (outputId, quality, notes) => {
                try {
                    await ResultComponent.saveEvaluation(outputId, quality, notes);
                    // Update the result in memory
                    result.evaluation = { quality, notes };
                    // Show success message
                    alert('Evaluation saved');
                    return true;
                } catch (error) {
                    console.error('Error saving evaluation:', error);
                    throw error;
                }
            };

            // Create the result component
            const resultElement = window.resultComponent.create(result, onEvaluate);

            // Add the result component to the wrapper
            wrapper.appendChild(resultElement);

            // Add the wrapper to the container
            container.appendChild(wrapper);
        });
    }

    /**
     * Display history in matrix view (new implementation with streamlined components)
     * @param {object} history - History data
     */
    displayMatrixView(history) {
        // Clear the matrix container
        this.matrixContainer.innerHTML = '';

        if (!history.input) {
            ui.showNoItems(this.matrixContainer, 'Input not found');
            return;
        }

        if (history.results.length === 0) {
            ui.showNoItems(this.matrixContainer, 'No history available for this input');
            return;
        }

        // Create input info header
        const inputInfo = document.createElement('div');
        inputInfo.className = 'input-info';
        inputInfo.innerHTML = `
            <h3 class="input-name">${history.input.name || `Input #${history.input.id}`}</h3>
            <div class="input-text">${history.input.text}</div>
        `;
        this.matrixContainer.appendChild(inputInfo);

        // Organize results by model and prompt
        const resultsByModelPrompt = {};
        const models = new Map();
        const prompts = new Map();

        history.results.forEach(result => {
            // Skip results if they don't have model and prompt info
            if (!result.model_id || !result.prompt_id) return;

            // Create a key for this model-prompt combination
            const key = `${result.model_id}-${result.prompt_id}`;

            // Initialize array for this combination if it doesn't exist
            if (!resultsByModelPrompt[key]) {
                resultsByModelPrompt[key] = [];
            }

            // Add result to the array
            resultsByModelPrompt[key].push(result);

            // Add model and prompt to Maps for tracking unique values
            if (!models.has(result.model_id)) {
                models.set(result.model_id, result.model_name || `Model ${result.model_id}`);
            }
            if (!prompts.has(result.prompt_id)) {
                prompts.set(result.prompt_id, result.prompt_name || `Prompt ${result.prompt_id}`);
            }
        });

        // Sort results within each combination by timestamp (newest first)
        Object.keys(resultsByModelPrompt).forEach(key => {
            resultsByModelPrompt[key].sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            );
        });

        // Filter models and prompts if filters are set
        let modelIds = Array.from(models.keys());
        let promptIds = Array.from(prompts.keys());

        if (this.modelFilter.value) {
            modelIds = modelIds.filter(id => id == this.modelFilter.value);
        }

        if (this.promptFilter.value) {
            promptIds = promptIds.filter(id => id == this.promptFilter.value);
        }

        // Clone and populate matrix template
        const matrixElement = this.matrixTemplate.content.cloneNode(true);
        const headerRow = matrixElement.querySelector('.matrix-header-row');
        const tableBody = matrixElement.querySelector('.matrix-body');

        // Add prompt headers to the matrix with version indicators
        promptIds.forEach(promptId => {
            const th = document.createElement('th');
            th.className = 'matrix-prompt-header';

            // Find all versions for this prompt
            const versions = new Set();
            Object.values(resultsByModelPrompt).flat().forEach(result => {
                if (result.prompt_id == promptId && result.prompt_version_number) {
                    versions.add(result.prompt_version_number);
                }
            });

            // Create a header with prompt name and version dropdown if multiple versions exist
            const promptName = prompts.get(promptId);
            if (versions.size > 1) {
                const sortedVersions = Array.from(versions).sort((a, b) => b - a); // Newest first

                // Create header content with version dropdown
                const headerContent = document.createElement('div');
                headerContent.className = 'header-content';
                headerContent.innerHTML = `
                    <span class="prompt-name">${promptName}</span>
                    <button class="view-prompt-btn" title="View prompt template">🔍</button>
                `;

                // Find the first result with this prompt to get the template
                const sampleResult = Object.values(resultsByModelPrompt).flat().find(r => r.prompt_id == promptId);
                if (sampleResult && sampleResult.prompt_template) {
                    headerContent.querySelector('.view-prompt-btn').addEventListener('click', () => {
                        this.showPromptModal(
                            sampleResult.prompt_template,
                            sampleResult.system_prompt || null
                        );
                    });
                } else {
                    headerContent.querySelector('.view-prompt-btn').style.display = 'none';
                }

                th.appendChild(headerContent);
            } else {
                // Simple header for single version
                const version = versions.size === 1 ? Array.from(versions)[0] : '';

                // Create header content
                const headerContent = document.createElement('div');
                headerContent.className = 'header-content';
                headerContent.innerHTML = `
                    <div>
                        <span class="prompt-name">${promptName}</span>
                        ${version ? `<span class="prompt-version">v${version}</span>` : ''}
                    </div>
                    <button class="view-prompt-btn" title="View prompt template">🔍</button>
                `;

                // Find the first result with this prompt to get the template
                const sampleResult = Object.values(resultsByModelPrompt).flat().find(r => r.prompt_id == promptId);
                if (sampleResult && sampleResult.prompt_template) {
                    headerContent.querySelector('.view-prompt-btn').addEventListener('click', () => {
                        this.showPromptModal(
                            sampleResult.prompt_template,
                            sampleResult.system_prompt || null
                        );
                    });
                } else {
                    headerContent.querySelector('.view-prompt-btn').style.display = 'none';
                }

                th.appendChild(headerContent);
            }

            headerRow.appendChild(th);
        });

        // Create a row for each model
        modelIds.forEach(modelId => {
            const tr = document.createElement('tr');

            // Add model name cell
            const modelCell = document.createElement('td');
            modelCell.className = 'matrix-model-cell';
            modelCell.textContent = models.get(modelId);
            tr.appendChild(modelCell);

            // Add result cells for each prompt
            promptIds.forEach(promptId => {
                const key = `${modelId}-${promptId}`;
                const results = resultsByModelPrompt[key];
                const td = document.createElement('td');
                td.className = 'matrix-result-cell';

                if (results && results.length > 0) {
                    const latestResult = results[0]; // Get the most recent result

                    // Create the evaluation callback
                    const onEvaluate = async (outputId, quality, notes) => {
                        try {
                            await ResultComponent.saveEvaluation(outputId, quality, notes);
                            // Update the result in memory
                            latestResult.evaluation = { quality, notes };
                            return true;
                        } catch (error) {
                            console.error('Error saving evaluation:', error);
                            throw error;
                        }
                    };

                    // Create streamlined result component
                    const resultElement = createStreamlinedResultComponent(latestResult, onEvaluate);
                    const wrapper = document.createElement('div');
                    wrapper.className = 'matrix-result-wrapper';
                    wrapper.appendChild(resultElement);

                    // Add history count indicator if there are multiple versions
                    if (results.length > 1) {
                        const historyIndicator = document.createElement('div');
                        historyIndicator.className = 'history-indicator';
                        historyIndicator.innerHTML = `<span>${results.length} versions</span>`;

                        // Implement the version history modal
                        historyIndicator.addEventListener('click', () => {
                            this.showHistoryModal(results, models.get(modelId), prompts.get(promptId));
                        });

                        wrapper.appendChild(historyIndicator);
                    }

                    td.appendChild(wrapper);
                } else {
                    // No results for this combination
                    td.className = 'matrix-result-cell empty-cell';
                    td.textContent = 'No results';
                }

                tr.appendChild(td);
            });

            tableBody.appendChild(tr);
        });

        this.matrixContainer.appendChild(matrixElement);

        // Add a message if no combinations were found after filtering
        if (tableBody.children.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-items';
            noResults.textContent = 'No model-prompt combinations found with current filters';
            this.matrixContainer.appendChild(noResults);
        }
    }

    /**
     * Show a modal with historical results for a model-prompt combination
     * @param {Array} results - Array of results for the combination
     * @param {string} modelName - Name of the model
     * @param {string} promptName - Name of the prompt
     */
    showHistoryModal(results, modelName, promptName) {
        // Create content for the modal
        const content = document.createElement('div');
        content.className = 'history-modal-content';

        // Sort results by date (newest first)
        const sortedResults = [...results].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        // Add result components for each historical result
        sortedResults.forEach((result, index) => {
            const resultContainer = document.createElement('div');
            resultContainer.className = 'history-modal-result';

            // Add timestamp header
            const timestamp = new Date(result.created_at).toLocaleString();
            const header = document.createElement('div');
            header.className = 'history-result-header';

            // Add version and version number if available
            const versionNumber = result.prompt_version_number ?
                `(v${result.prompt_version_number})` : '';
            header.innerHTML = `<strong>Version ${index + 1}</strong> ${versionNumber} - ${timestamp}`;
            if (index === 0) {
                header.innerHTML += ' <span class="latest-badge">Latest</span>';
            }
            resultContainer.appendChild(header);

            // Create the evaluation callback for this modal result
            const onEvaluate = async (outputId, quality, notes) => {
                try {
                    await ResultComponent.saveEvaluation(outputId, quality, notes);
                    // Update the result in memory
                    result.evaluation = { quality, notes };
                    return true;
                } catch (error) {
                    console.error('Error saving evaluation:', error);
                    throw error;
                }
            };

            // Create streamlined result component for this version
            const resultElement = createStreamlinedResultComponent(result, onEvaluate);
            resultContainer.appendChild(resultElement);

            // Add "View Prompt" button if template is available
            if (result.prompt_template) {
                const viewPromptBtn = document.createElement('button');
                viewPromptBtn.className = 'view-prompt-btn';
                viewPromptBtn.textContent = 'View Prompt';
                viewPromptBtn.addEventListener('click', () => {
                    this.showPromptModal(
                        result.prompt_template,
                        result.system_prompt || null
                    );
                });

                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'modal-result-actions';
                buttonContainer.appendChild(viewPromptBtn);
                resultContainer.appendChild(buttonContainer);
            }

            content.appendChild(resultContainer);
        });

        // Show the modal
        ui.showModal(`History: ${modelName} + ${promptName}`, content);
    }

    /**
     * Show a modal with the prompt template
     * @param {string} template - Prompt template
     * @param {string|null} systemPrompt - System prompt (optional)
     */
    showPromptModal(template, systemPrompt) {
        // Create modal content
        const content = document.createElement('div');
        content.className = 'prompt-preview';

        // Add system prompt if available
        if (systemPrompt) {
            content.innerHTML = `
                <h3>System Prompt</h3>
                <pre class="prompt-template-display system-prompt">${systemPrompt}</pre>
                <h3>User Prompt Template</h3>
                <pre class="prompt-template-display">${template}</pre>
            `;
        } else {
            content.innerHTML = `
                <h3>Prompt Template</h3>
                <pre class="prompt-template-display">${template}</pre>
                <p class="no-system-prompt">(No system prompt used)</p>
            `;
        }

        // Show modal using UI helper
        ui.showModal('Prompt Template', content);
    }
}

// Create HistoryUI instance
window.historyUI = new HistoryUI();