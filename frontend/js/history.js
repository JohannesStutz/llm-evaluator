/**
 * History UI component
 */
class HistoryUI {
    constructor() {
        // Container elements
        this.resultsContainer = document.getElementById('history-results');
        this.inputSetFilter = document.getElementById('history-input-set-filter');
        this.inputFilter = document.getElementById('history-input-filter');

        // Action buttons
        this.loadHistoryBtn = document.getElementById('load-history-btn');

        // Templates
        this.historyResultTemplate = document.getElementById('history-result-template');
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

        // Load history button
        this.loadHistoryBtn.addEventListener('click', () => {
            this.loadHistory();
        });
    }

    /**
     * Called when the history view is activated
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
            ui.showLoading(this.resultsContainer, 'Loading history...');

            // Load history
            const history = await api.getInputHistory(inputId);

            // Display history
            this.displayHistory(history);

            // Re-enable button
            this.loadHistoryBtn.disabled = false;
        } catch (error) {
            console.error('Error loading history:', error);
            ui.showError(this.resultsContainer, 'Error loading history');
            this.loadHistoryBtn.disabled = false;
        }
    }

    /**
     * Display history for an input
     * @param {object} history - History data
     */
    displayHistory(history) {
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
     * Modified displayResultsForDate() method for HistoryUI class
     * This version uses the shared ResultComponent
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

// Create HistoryUI instance
window.historyUI = new HistoryUI();
