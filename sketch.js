// State of the scene
let currentScene = 'simulation'; 

// For the terrain
let terrain = []; 

// For the lander
const LANDER_WIDTH = 40;
const LANDER_HEIGHT = 50;

// Constants for the physics
// Will be set randomly on reset
let GRAVITY = 1.62;
const MIN_GRAVITY = 1.2;    
const MAX_GRAVITY = 10;   

// Scale factor to convert real physics to screen coordinates
const SCALE = 0.02; 

// Thrust force magnitude
const BASE_THRUST_FORCE = 2; 

// Side thrusters' rotational force
const ROTATION_THRUST = 0.03 * SCALE; 

let currentGenome = '';
const DEFAULT_GENOME_FILE = 'genomes/test_best_genome.txt';

let lander = new Lander();

// Add PID controller constants and variables
let USE_PID = true;  // Toggle for PID control
let altitudePID;  // PID controller instances

// Add variables to track current action
let currentActionIndex = 0;
let currentActionTime = 0;

function setup() {
    createCanvas(800, 600);
    createSceneToggles();
    loadTerrain('terrain/terrain_2024-12-04T11-42-51.json');
    
    altitudePID = new PIDController(0.1, 0.01, 0.05);
}

function draw() {
    background(128);
    
    switch(currentScene) {
        case 'simulation':
            drawSimulationScene();
            break;
        case 'training':
            drawTrainingScene();
            break;
        case 'metrics':
            drawMetricsScene();
            break;
        case 'landing_metrics':
            drawLandingMetricsScene();
            break;
        case 'stress_test':
            drawStressTestScene();
            break;
        case 'visualization':
            drawVisualizationScene();
            break;
    }
}




function startTraining() {
    // Start training logic
    if (!window.ga) {
        window.ga = new GeneticAlgorithm({
            populationSize: 50,
            mutationRate: 0.1,
            terrain: terrain,
            lander: lander
        });
    }
    window.ga.evolve();
}

function toggleTraining() {
    if (window.trainButton.html() === 'Start Training') {
        window.trainButton.html('Stop Training');
        startTraining(); 
    } else {
        window.trainButton.html('Start Training');
        stopTraining(); 
    }
}

function resetTraining() {
    if (window.trainButton) {
        window.trainButton.html('Start Training');
    }
}

function resetLander() {
    GRAVITY = random(MIN_GRAVITY, MAX_GRAVITY);
    lander.pos = { x: width/2, y: 50 }; 
    lander.vel = { x: 0, y: 0 };
    lander.rotation = 0;
    lander.angularVelocity = 0;
    lander.crashed = false;
    lander.landed = false;
    
    // Reset action tracking
    currentActionIndex = 0;
    currentActionTime = 0;
    
    // Reset PID controllers
    altitudePID.reset();
}

function updateLander() {
    if (lander.crashed || lander.landed) return;

    if (currentScene === 'simulation' && USE_PID) {
        const targetY = height - 100;
        
        // Parse current genome into components
        const parts = currentGenome.split(';');
        const actions = parts.slice(1, -1);  // Remove scale factor part
        console.log("Actions: ");
        console.log(actions);
        console.log(`Current gravity: ${GRAVITY}`);
        
        // Update action based on sequence
        if(currentActionIndex < actions.length) {
            const [type, duration] = actions[currentActionIndex].split(',');
            // Scale duration based on current gravity
            const scaledDuration = Number(duration) / GRAVITY;
            console.log(`Scaled duration: ${scaledDuration}`);
            currentActionTime += 1/60;
            
            if(currentActionTime >= scaledDuration) {
                currentActionIndex++;
                currentActionTime = 0;
            }
            
            if(type === 'T') {
                const pidOutput = altitudePID.compute(targetY, lander.pos.y, lander.vel.y);
                lander.mainThruster = pidOutput > altitudePID.threshold;
            } else {
                lander.mainThruster = false;
            }
        } else {
            lander.mainThruster = false;
        }
    }
    
    // Update physics with gravity-scaled thrust
    lander.vel.y += GRAVITY * SCALE;
    if (lander.mainThruster) {
        const scaledThrust = BASE_THRUST_FORCE * SCALE;
        lander.vel.y -= scaledThrust;
    }
    
    lander.vel.x = 0;
    lander.pos.y += lander.vel.y;
    lander.pos.x = width/2;
    
    if (lander.pos.y < 0) {
        lander.pos.y = 0;
        lander.vel.y = 0;
    }
    
    // Apply gravity
    lander.vel.x += GRAVITY * SCALE;
    
    // Apply main thruster
    if (lander.mainThruster) {    
        // Calculate thrust direction based on rotation
        const thrustAngle = lander.rotation - PI/2; 
        
        // Convert polar coordinates (angle and magnitude) to Cartesian (x,y)
        const thrustX = BASE_THRUST_FORCE * Math.cos(thrustAngle);
        const thrustY = BASE_THRUST_FORCE * Math.sin(thrustAngle);
        
        // Add thrust to current velocity
        lander.vel.x += thrustX;
        lander.vel.y += thrustY;
    }
    
    // Apply side thrusters
    if (lander.leftThruster) {
        lander.angularVelocity += ROTATION_THRUST;
    }
    if (lander.rightThruster) {
        lander.angularVelocity -= ROTATION_THRUST;
    }
    
    // Update position and rotation
    lander.pos.x += lander.vel.x;
    lander.pos.y += lander.vel.y;
    lander.rotation += lander.angularVelocity;
    
    // Add some angular dampening
    lander.angularVelocity *= 0.99;
    
    // Check for collision with terrain
    for (let i = 0; i < terrain.length - 1; i++) {
        const p1 = terrain[i];
        const p2 = terrain[i + 1];
        
        // Check if lander is between these terrain points
        if (lander.pos.x >= p1.x && lander.pos.x <= p2.x) {
            // Calculate terrain height at lander's x position
            const terrainY = map(
                lander.pos.x,
                p1.x, p2.x,
                p1.y, p2.y
            );
            
            // Check if lander has hit the terrain
            if (lander.pos.y + LANDER_HEIGHT/2 + 20 >= terrainY) {
                lander.crashed = true;
                lander.pos.y = terrainY - LANDER_HEIGHT/2 - 20;
                
                // Calculate landing conditions
                const landingSpeed = Math.abs(lander.vel.y) * SCALE;
                const terrainAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const landerAngle = lander.rotation;
                const relativeLandingAngle = Math.abs(landerAngle - terrainAngle);
                const maxSafeSpeed = 2 * SCALE;
                const maxSafeAngle = PI / 9; // 20 degrees in radians
                
                // Check if landing was successful
                const isSafeLanding = landingSpeed < maxSafeSpeed && 
                                    relativeLandingAngle < maxSafeAngle;
                
                lander.vel = { x: 0, y: 0 };
                lander.angularVelocity = 0;
                
                if (isSafeLanding) {
                    lander.landed = true;  
                    lander.crashed = false;
                } else {
                    lander.crashed = true;
                    lander.landed = false;
                }
                
                console.log(`Landing speed: ${landingSpeed.toFixed(2)}`);
                console.log(`Landing angle: ${(relativeLandingAngle * 180 / PI).toFixed(2)}°`);
                console.log(`Landing ${isSafeLanding ? 'successful' : 'failed'}`);
            }
        }
    }
    
    // Keep lander within screen bounds
    lander.pos.x = constrain(lander.pos.x, 0, width);
    lander.pos.y = constrain(lander.pos.y, 0, height);
}

function drawLander() {
    push();
    translate(lander.pos.x, lander.pos.y);
    rotate(lander.rotation);
    
    // Update color based on crash/landing state
    if (lander.crashed) {
        fill(255, 0, 0);  // Red for crash
    } else if (lander.landed) {
        fill(0, 255, 0);  // Green for successful landing
    } else {
        fill(200);        // Default gray while flying
    }
    stroke(0);
    rectMode(CENTER);
    rect(0, 0, LANDER_WIDTH, LANDER_HEIGHT);
    
    // Landing gear
    fill(150);
    stroke(0);
    // Left leg
    beginShape();
    vertex(-LANDER_WIDTH/2, LANDER_HEIGHT/2);
    vertex(-LANDER_WIDTH/2 - 15, LANDER_HEIGHT/2 + 20);
    vertex(-LANDER_WIDTH/2 + 5, LANDER_HEIGHT/2 + 20);
    endShape(CLOSE);
    // Right leg
    beginShape();
    vertex(LANDER_WIDTH/2, LANDER_HEIGHT/2);
    vertex(LANDER_WIDTH/2 + 15, LANDER_HEIGHT/2 + 20);
    vertex(LANDER_WIDTH/2 - 5, LANDER_HEIGHT/2 + 20);
    endShape(CLOSE);
    
    // Draw thrusters and flames
    // Main bottom thruster
    fill(100);
    rect(0, LANDER_HEIGHT/2, 15, 10);
    if (lander.mainThruster) {
        // Animated flame effect
        noStroke();
        for (let i = 0; i < 3; i++) {
            let flameSize = random(15, 25);
            let alpha = map(i, 0, 3, 255, 0);
            fill(255, 150, 0, alpha);
            beginShape();
            vertex(-7, LANDER_HEIGHT/2 + 5);
            vertex(7, LANDER_HEIGHT/2 + 5);
            vertex(random(-5, 5), LANDER_HEIGHT/2 + 5 + flameSize);
            endShape(CLOSE);
        }
        stroke(0);
    }
    
    // Left side thruster
    push();
    translate(-LANDER_WIDTH/2, 0);
    rotate(PI / 8);
    fill(100);
    rect(0, 0, 10, 15);
    if (lander.leftThruster) {
        // Animated flame effect
        noStroke();
        for (let i = 0; i < 3; i++) {
            let flameSize = random(10, 20);
            let alpha = map(i, 0, 3, 255, 0);
            fill(255, 150, 0, alpha);
            beginShape();
            vertex(-5, -7);
            vertex(-5, 7);
            vertex(-5 - flameSize, random(-5, 5));
            endShape(CLOSE);
        }
        stroke(0);
    }
    pop();
    
    // Right side thruster
    push();
    translate(LANDER_WIDTH/2, 0);
    rotate(-PI / 8);
    fill(100);
    rect(0, 0, 10, 15);
    if (lander.rightThruster) {
        // Animated flame effect
        noStroke();
        for (let i = 0; i < 3; i++) {
            let flameSize = random(10, 20);
            let alpha = map(i, 0, 3, 255, 0);
            fill(255, 150, 0, alpha);
            beginShape();
            vertex(5, -7);
            vertex(5, 7);
            vertex(5 + flameSize, random(-5, 5));
            endShape(CLOSE);
        }
        stroke(0);
    }
    pop();
    
    pop();
}

// Add keyboard controls
function keyPressed() {
    if (keyCode === UP_ARROW) {
        lander.mainThruster = true;
    }
    if (keyCode === LEFT_ARROW) {
        lander.leftThruster = true;
    }
    if (keyCode === RIGHT_ARROW) {
        lander.rightThruster = true;
    }
    if (currentScene === 'simulation_ga') {
        if (key === '1' || key === '2' || key === '3') {
            loadGenome(parseInt(key));
            return;
        }
    }
}

function keyReleased() {
    if (keyCode === UP_ARROW) {
        lander.mainThruster = false;
    }
    if (keyCode === LEFT_ARROW) {
        lander.leftThruster = false;
    }
    if (keyCode === RIGHT_ARROW) {
        lander.rightThruster = false;
    }
} 

// Add this function to stop training
function stopTraining() {
    if (window.ga) {
        window.ga.stop();
    }
}



function loadGenome(filename = DEFAULT_GENOME_FILE) {
    fetch(filename)
        .then(response => response.text())
        .then(data => {
            console.log('Loading genome:', data.trim());
            const parts = data.trim().split(';');
            const [kp, ki, kd] = parts[0].split(',').map(Number);
            
            // Validate the values
            if (isNaN(kp) || isNaN(ki) || isNaN(kd)) {
                throw new Error('Invalid PID values in genome file');
            }
            
            // Update PID controller with loaded values
            altitudePID = new PIDController(kp, ki, kd);
            
            // Store full genome for action sequence
            currentGenome = data.trim();
            currentActionIndex = 0;
            currentActionTime = 0;
            
            console.log(`PID Controller updated - Kp: ${kp}, Ki: ${ki}, Kd: ${kd}`);
            console.log('Action sequence loaded');
            resetLander();
        })
        .catch(error => {
            console.error('Error loading genome:', error);
            altitudePID = new PIDController(0.1, 0.01, 0.05);
            currentGenome = '';
            resetLander();
        });
} 

function testPIDController() {
    const pid = new PIDController(0.5, 0.1, 0.2);
    
    // Test basic response
    const targetHeight = 300;
    const testCases = [
        { height: 400, velocity: 5, expected: "negative" },  // Above target, moving up
        { height: 400, velocity: -5, expected: "small" },    // Above target, moving down
        { height: 200, velocity: -5, expected: "large" },    // Below target, moving down
        { height: 200, velocity: 5, expected: "small" }      // Below target, moving up
    ];
    
    testCases.forEach(test => {
        const output = pid.compute(targetHeight, test.height, test.velocity);
        console.log(`Height: ${test.height}, Velocity: ${test.velocity}`);
        console.log(`Output: ${output}, Expected: ${test.expected}`);
    });
} 

function drawMetricsScene() {
    if (!window.gaMetrics) return;
    
    fill(255);
    textSize(20);
    textAlign(LEFT);
    let y = 50;
    
    text(`Generation: ${window.ga?.currentGeneration || 0}`, 20, y); y += 30;
    text(`Average Fitness: ${window.gaMetrics.generationStats.avgFitness.toFixed(2)}`, 20, y); y += 30;
    text(`Best Fitness: ${window.gaMetrics.generationStats.bestFitness.toFixed(2)}`, 20, y); y += 30;
    text(`Population Diversity: ${window.gaMetrics.generationStats.diversity.toFixed(2)}`, 20, y); y += 30;
    text(`Success Rate: ${(window.gaMetrics.successRate * 100).toFixed(1)}%`, 20, y);
}

function drawLandingMetricsScene() {
    if (!window.landingMetrics) return;
    
    fill(255);
    textSize(20);
    textAlign(LEFT);
    let y = 50;
    
    text(`Outcome: ${window.landingMetrics.outcome}`, 20, y); y += 30;
    text(`Final Velocity: ${window.landingMetrics.finalVelocity.toFixed(2)} m/s`, 20, y); y += 30;
    text(`Landing Accuracy: ${window.landingMetrics.landingAccuracy.toFixed(2)} m`, 20, y); y += 30;
    text(`Fuel Efficiency: ${window.landingMetrics.fuelEfficiency.toFixed(2)}`, 20, y); y += 30;
    text(`Time to Land: ${window.landingMetrics.timeToLand.toFixed(1)} s`, 20, y); y += 30;
    text(`Oscillations: ${window.landingMetrics.oscillations}`, 20, y); y += 30;
    text(`Max Overshoot: ${window.landingMetrics.maxOvershoot.toFixed(2)} m`, 20, y);
}

function drawStressTestScene() {
    if (!window.stressTestResults) return;
    
    fill(255);
    textSize(20);
    textAlign(LEFT);
    let y = 50;
    
    text("Stress Test Results:", 20, y); y += 30;
    
    const results = window.stressTestResults;
    text(`Total Tests: ${results.totalTests}`, 20, y); y += 30;
    text(`Success Rate: ${(results.successRate * 100).toFixed(1)}%`, 20, y); y += 30;
    text(`Average Landing Time: ${results.avgLandingTime.toFixed(1)} s`, 20, y); y += 30;
    
    text("Failure Modes:", 20, y); y += 30;
    Object.entries(results.failureModes).forEach(([mode, count]) => {
        text(`${mode}: ${count}`, 40, y); y += 25;
    });
}

function drawVisualizationScene() {
    // Always draw the graph frames, even without data
    drawGraph(
        window.ga?.fitnessHistory || [], 
        "Fitness History", 
        50, 50, 300, 200
    );
    
    drawGraph(
        window.ga?.diversityHistory || [], 
        "Population Diversity", 
        400, 50, 300, 200
    );
    
    drawGraph(
        window.ga?.successRateHistory || [], 
        "Success Rate", 
        50, 300, 300, 200
    );
}

function drawGraph(data, title, x, y, w, h) {
    push();
    translate(x, y);
    
    // Always draw axes and labels
    stroke(255);
    line(0, h, w, h);  // X axis
    line(0, 0, 0, h);  // Y axis
    
    // Draw title
    noStroke();
    fill(255);
    textAlign(CENTER);
    text(title, w/2, -10);
    
    // Add scale labels
    textAlign(RIGHT);
    textSize(12);
    text('1.0', -5, 10);
    text('0.5', -5, h/2);
    text('0.0', -5, h);
    
    // Only draw data points if we have data
    if (data && data.length > 0) {
        stroke(255, 255, 0);
        noFill();
        beginShape();
        for (let i = 0; i < data.length; i++) {
            const px = map(i, 0, data.length-1, 0, w);
            const py = map(data[i], 0, max(data), h, 0);
            vertex(px, py);
        }
        endShape();
    }
    
    pop();
}

async function runStressTest() {
    const results = await stressTest();
    window.stressTestResults = results;
}

function displayGAMetrics(metrics) {
    window.gaMetrics = metrics;
}

function displayLandingMetrics(metrics) {
    window.landingMetrics = metrics;
}

function visualizeAllData() {
    if (!window.ga) return;
    
    window.visualizationData = {
        fitnessHistory: window.ga.fitnessHistory || [],
        diversityHistory: window.ga.diversityHistory || [],
        successRateHistory: window.ga.successRateHistory || []
    };
} 
