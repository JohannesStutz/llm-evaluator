/**
 * Module initialization script
 * This ensures that UI components are initialized after their classes are defined
 */

// Wait for DOM content to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded, initializing UI components");
    
    // Create BatchEvaluationUI instance if the class exists and the instance doesn't
    if (typeof BatchEvaluationUI === 'function' && !window.batchEvaluationUI) {
        try {
            window.batchEvaluationUI = new BatchEvaluationUI();
            console.log("BatchEvaluationUI initialized successfully");
        } catch (error) {
            console.error("Error initializing BatchEvaluationUI:", error);
        }
    } else if (!window.batchEvaluationUI) {
        console.warn("BatchEvaluationUI class not found");
    } else {
        console.log("BatchEvaluationUI instance already exists");
    }
    
    // Initialize any additional modules or integrations here
    
    console.log("All UI modules initialized");
});
