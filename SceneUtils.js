function createSceneToggles() {
    // Create buttons with consistent styling
    const buttons = [
        { label: 'Test PID', scene: 'simulation', row: 1, col: 1 },
        { label: 'Train PID', scene: 'training', row: 1, col: 2 },
        { label: 'Test PID Controller', scene: 'test', row: 1, col: 3 },
        { label: 'GA Metrics', scene: 'metrics', row: 2, col: 1 },
        { label: 'Landing Metrics', scene: 'landing_metrics', row: 2, col: 2 },
        { label: 'Stress Test', scene: 'stress_test', row: 2, col: 3 },
        { label: 'Visualize Data', scene: 'visualization', row: 2, col: 4 }
    ];
    
    const canvas = document.querySelector('canvas');
    const canvasX = canvas.offsetLeft;
    const canvasY = canvas.offsetTop;
    
    // Button styling constants
    const BUTTON_WIDTH = 120;
    const BUTTON_HEIGHT = 30;
    const BUTTON_MARGIN = 10;
    const ROW_HEIGHT = BUTTON_HEIGHT + BUTTON_MARGIN;
    
    // Create and position buttons
    buttons.forEach(btnConfig => {
        const btn = createButton(btnConfig.label);
        
        // Style the button with dark gray theme
        btn.style('width', `${BUTTON_WIDTH}px`);
        btn.style('height', `${BUTTON_HEIGHT}px`);
        btn.style('background-color', '#333333');  // Dark gray background
        btn.style('border', 'none');
        btn.style('color', '#ffffff');  // White text
        btn.style('border-radius', '4px');
        btn.style('font-size', '14px');
        btn.style('cursor', 'pointer');
        btn.style('transition', 'background-color 0.2s');  // Smooth transition for hover
        
        // Add hover effect with slightly lighter gray
        btn.mouseOver(() => {
            btn.style('background-color', '#444444');  // Lighter gray on hover
        });
        btn.mouseOut(() => {
            btn.style('background-color', '#333333');  // Back to original dark gray
        });
        
        // Position the button
        const x = canvasX + (btnConfig.col - 1) * (BUTTON_WIDTH + BUTTON_MARGIN);
        const y = canvasY - (3 - btnConfig.row) * ROW_HEIGHT;
        btn.position(x, y);
        
        // Add click handlers
        switch (btnConfig.scene) {
            case 'simulation':
                btn.mousePressed(() => {
                    currentScene = 'simulation';
                    USE_PID = true;
                    loadGenome();
                    resetLander();
                });
                break;
            case 'training':
                btn.mousePressed(() => currentScene = 'training');
                break;
            case 'test':
                btn.mousePressed(() => {
                    console.log("=== Running PID Controller Tests ===");
                    testPIDController();
                });
                break;
            case 'metrics':
                btn.mousePressed(() => {
                    currentScene = 'metrics';
                    if (window.ga) {
                        displayGAMetrics(window.ga.collectMetrics());
                    } else {
                        console.log("No GA instance available");
                    }
                });
                break;
            case 'landing_metrics':
                btn.mousePressed(() => {
                    currentScene = 'landing_metrics';
                    const metrics = evaluateLandingPerformance(lander);
                    displayLandingMetrics(metrics);
                });
                break;
            case 'stress_test':
                btn.mousePressed(async () => {
                    currentScene = 'stress_test';
                    await runStressTest();
                });
                break;
            case 'visualization':
                btn.mousePressed(() => {
                    currentScene = 'visualization';
                    visualizeAllData();
                });
                break;
        }
    });
}