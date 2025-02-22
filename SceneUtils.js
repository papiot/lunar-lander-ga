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

function drawSimulationScene() {
    // Draw terrain first
    stroke(0);
    fill(100);
    beginShape();
    for (let point of terrain) {
        vertex(point.x, point.y);
    }
    vertex(width, height);
    vertex(0, height);
    endShape(CLOSE);
    
    // Draw flags
    stroke(200);
    strokeWeight(3);
    for (let point of terrain) {
        if (point.isFlag) {
            line(point.x, point.y, point.x, point.y - 40);
            fill(255, 255, 0);
            noStroke();
            triangle(
                point.x, point.y - 40,
                point.x + 20, point.y - 30,
                point.x, point.y - 20
            );
            stroke(200);
        }
    }
    strokeWeight(1);
    
    // Display current values
    fill(255);
    textSize(16);
    textAlign(LEFT);
    text(`Gravity: ${GRAVITY.toFixed(1)} m/s²`, 20, 50);
    text(`PID Control: ${USE_PID ? 'ON' : 'OFF'}`, 20, 80);
    text(`PID Constants - Kp: ${altitudePID.kp.toFixed(3)}, Ki: ${altitudePID.ki.toFixed(3)}, Kd: ${altitudePID.kd.toFixed(3)}`, 20, 110);
    
    // Add action sequence display
    if (currentGenome) {
        const parts = currentGenome.split(';');
        const actions = parts.slice(1, -1);
        
        if (currentActionIndex < actions.length) {
            const [type, duration] = actions[currentActionIndex].split(',');
            const scaledDuration = Number(duration) / GRAVITY;
            text(`Current Action: ${type === 'T' ? 'Thrust' : 'Drift'}`, 20, 140);
            text(`Duration: ${scaledDuration.toFixed(2)}s (base: ${duration}s)`, 20, 170);
            text(`Progress: ${currentActionTime.toFixed(1)}s`, 20, 200);
            text(`Action ${currentActionIndex + 1}/${actions.length}`, 20, 230);
        }
    }
    
    // Update and draw 
    updateLander();
    drawLander();

    // Add success message
    if (lander.landed) {
        fill(0, 255, 0);
        textSize(32);
        textAlign(CENTER);
        text('Success!', width/2, height/2);
    }
}

function drawTrainingScene() {
    // Draw basic training scene info
    fill(255);
    textSize(24);
    textAlign(CENTER);
    text('Genetic Algorithm Training', width/2, 50);
    
    // Create start/stop training button if it doesn't exist
    if (!window.trainButton) {
        window.trainButton = createButton('Start Training');
        window.trainButton.position(width/2 - 50, height/2 - 150);
        window.trainButton.mousePressed(toggleTraining);
    }

    // Draw 10 visualization squares
    const squareSize = width / 10;
    const startY = height / 2;
    
    for (let i = 0; i < 10; i++) {
        const x = i * squareSize;
        
        // Draw square border
        stroke(200);
        noFill();
        rect(x, startY, squareSize, squareSize);
        
        // If we have active simulations, draw their state
        if (window.ga && window.ga.activeSimulations && window.ga.activeSimulations[i]) {
            const sim = window.ga.activeSimulations[i];
            
            // Draw mini terrain
            stroke(100);
            fill(100);
            beginShape();
            for (let point of terrain) {
                // Scale terrain to fit in square
                const scaledX = map(point.x, 0, width, x, x + squareSize);
                const scaledY = map(point.y, 0, height, startY, startY + squareSize);
                vertex(scaledX, scaledY);
            }
            vertex(x + squareSize, startY + squareSize);
            vertex(x, startY + squareSize);
            endShape(CLOSE);
            
            // Draw mini lander if it exists
            if (sim.lander) {
                const scaledX = map(sim.lander.pos.x, 0, width, x, x + squareSize);
                const scaledY = map(sim.lander.pos.y, height, 0, startY, startY + squareSize);
                
                push();
                translate(scaledX, scaledY);
                
                // Color based on lander state
                if (sim.lander.escaped) {
                    fill(255, 0, 255);  // Purple for atmosphere escape
                } else if (sim.lander.crashed) {
                    fill(255, 0, 0);    // Red for crashed
                } else if (sim.lander.landed) {
                    fill(0, 255, 0);    // Green for landed
                } else {
                    fill(255);          // White for active
                }
                
                // Draw simplified lander
                noStroke();
                rect(-3, -3, 6, 6);
                
                // Draw thruster flame if active
                if (sim.lander.mainThruster) {
                    fill(255, 150, 0);
                    triangle(-2, 3, 2, 3, 0, 8);
                }
                
                pop();
            }
            
            // Draw simulation info
            fill(255);
            noStroke();
            textSize(10);
            textAlign(LEFT);
            text(`G: ${sim.gravity?.toFixed(1) || '?'}`, x + 5, startY + 15);
            if (sim.fitness !== undefined) {
                text(`F: ${sim.fitness.toFixed(0)}`, x + 5, startY + 30);
            }
        }
    }
    
    // Draw generation info if available
    if (window.ga) {
        fill(255);
        textSize(16);
        textAlign(LEFT);
        text(`Generation: ${window.ga.currentGeneration + 1}/${window.ga.maxGenerations}`, 20, height - 60);
        if (window.ga.bestFitness !== -Infinity) {
            text(`Best Fitness: ${window.ga.bestFitness.toFixed(0)}`, 20, height - 40);
        }
    }
}