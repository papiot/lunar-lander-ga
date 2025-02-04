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
const MIN_GRAVITY = 1.2;    // Minimum gravity in m/s²
const MAX_GRAVITY = 10;   // Maximum gravity in m/s²

// Scale factor to convert real physics to screen coordinates
const SCALE = 0.02; 

// Thrust force magnitude
const BASE_THRUST_FORCE = 2;  // Base thrust force

// Side thrusters' rotational force
const ROTATION_THRUST = 0.03 * SCALE; 

let currentGenome = '';
const DEFAULT_GENOME_FILE = 'genomes/test_best_genome.txt';

// State of the lander
let lander = {
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    rotation: 0,
    angularVelocity: 0, 
    crashed: false,
    mainThruster: false,
    leftThruster: false,
    rightThruster: false,
    landed: false
};

// Add PID controller constants and variables
let USE_PID = true;  // Toggle for PID control
let altitudePID;  // PID controller instances

// Add variables to track current action
let currentActionIndex = 0;
let currentActionTime = 0;

class PIDController {
    constructor(kp, ki, kd) {
        console.log(`Creating PID controller with Kp=${kp}, Ki=${ki}, Kd=${kd}`);
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        this.previousError = 0;
        this.integral = 0;
        this.lastTime = null;
        this.threshold = 0.5;  // Add threshold for activation
    }
    
    compute(setpoint, measuredValue, velocity) {
        const currentTime = millis();
        if (this.lastTime === null) {
            this.lastTime = currentTime;
            return 0;
        }
        
        const dt = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;
        
        const error = setpoint - measuredValue;
        
        // Penalize moving away from target when below it
        if (error < 0 && velocity < 0) {  // If below target and moving down
            this.integral += error * dt;
        } else if (error > 0 && velocity > 0) {  // If above target and moving up
            this.integral += error * dt;
        } else {
            this.integral = 0;  // Reset integral when moving wrong direction
        }
        
        const derivative = (error - this.previousError) / dt;
        
        const output = this.kp * error + 
                      this.ki * this.integral + 
                      this.kd * derivative;
        
        this.previousError = error;
        return output;
    }
    
    reset() {
        this.previousError = 0;
        this.integral = 0;
        this.lastTime = null;
    }
}

function setup() {
    createCanvas(800, 600);
    createSceneToggles();
    loadTerrain('terrain/terrain_2024-12-04T11-42-51.json');
    
    // Initialize with default PID values
    altitudePID = new PIDController(0.1, 0.01, 0.05);
}

function createSceneToggles() {
    const simButton = createButton('Test PID');
    const trainButton = createButton('Train PID');
    const testPIDButton = createButton('Test PID Controller');
    const metricsButton = createButton('GA Metrics');
    const landingMetricsButton = createButton('Landing Metrics');
    const stressTestButton = createButton('Stress Test');
    const visualizeButton = createButton('Visualize Data');
    
    const canvas = document.querySelector('canvas');
    const canvasX = canvas.offsetLeft;
    const canvasY = canvas.offsetTop;
    
    // Position buttons in two rows
    const row1Y = canvasY - 40;
    const row2Y = canvasY - 70;
    
    // Row 1
    simButton.position(canvasX + 70, row1Y);
    trainButton.position(canvasX + 160, row1Y);
    testPIDButton.position(canvasX + 270, row1Y);
    
    // Row 2
    metricsButton.position(canvasX + 70, row2Y);
    landingMetricsButton.position(canvasX + 160, row2Y);
    stressTestButton.position(canvasX + 270, row2Y);
    visualizeButton.position(canvasX + 380, row2Y);
    
    // Existing button handlers
    simButton.mousePressed(() => {
        currentScene = 'simulation';
        USE_PID = true;
        loadGenome();
        resetLander();
    });
    trainButton.mousePressed(() => currentScene = 'training');
    testPIDButton.mousePressed(() => {
        console.log("=== Running PID Controller Tests ===");
        testPIDController();
    });
    
    // New button handlers
    metricsButton.mousePressed(() => {
        currentScene = 'metrics';
        if (window.ga) {
            displayGAMetrics(window.ga.collectMetrics());
        } else {
            console.log("No GA instance available");
        }
    });
    
    landingMetricsButton.mousePressed(() => {
        currentScene = 'landing_metrics';
        const metrics = evaluateLandingPerformance(lander);
        displayLandingMetrics(metrics);
    });
    
    stressTestButton.mousePressed(async () => {
        currentScene = 'stress_test';
        await runStressTest();
    });
    
    visualizeButton.mousePressed(() => {
        currentScene = 'visualization';
        visualizeAllData();
    });
}

function loadTerrain(filename) {
    // Load terrain data from a file
    fetch(filename)
        .then(response => response.json())
        .then(data => {
            terrain = data;
        })
        .catch(error => {
            console.error('Error loading terrain:', error);
            generateRandomTerrain(); 
        });
}

function generateRandomTerrain() {
    terrain = [];
    let x = 0;
    const segmentWidth = 80;
    const landingZoneWidth = 160; 
    const landingZoneStart = width/2 - landingZoneWidth/2; 
    
    while (x < width) {
        let y;
        
        if (x >= landingZoneStart && x <= landingZoneStart + landingZoneWidth) {
            y = height - 100; 
        } else {
            y = height - random(80, 150);
        }
        
        terrain.push({ x, y });
        x += random(60, segmentWidth);
    }
    
    terrain = terrain.filter(point => 
        point.x < landingZoneStart || point.x > landingZoneStart + landingZoneWidth
    );
    
    terrain.push(
        { x: landingZoneStart, y: height - 100, isFlag: true },
        { x: landingZoneStart + landingZoneWidth, y: height - 100, isFlag: true }
    );
    
    terrain.sort((a, b) => a.x - b.x);
    
    // Save terrain to disk
    const date = new Date();
    const filename = `terrain_${date.toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    saveJSON(terrain, filename);
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
            const scaledDuration = Number(duration) / Math.sqrt(GRAVITY);
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
                const scaledY = map(sim.lander.pos.y, 0, height, startY, startY + squareSize);
                
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
        startTraining(); // Function from your genetic algorithm file
    } else {
        window.trainButton.html('Start Training');
        stopTraining(); // Function from your genetic algorithm file
    }
}

// Add this function to clean up when switching scenes
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
        
        // Update action based on sequence
        if(currentActionIndex < actions.length) {
            const [type, duration] = actions[currentActionIndex].split(',');
            // Scale duration based on current gravity
            const scaledDuration = Number(duration) / Math.sqrt(GRAVITY);
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
        const thrustAngle = lander.rotation - PI/2; // Adjust so 0 means thrusting up
        
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
                
                // Update these lines to handle successful landing differently
                if (isSafeLanding) {
                    lander.landed = true;  // New state for successful landing
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

class GeneticAlgorithm {
    constructor() {
        this.populationSize = 100;
        this.currentGeneration = 0;
        this.maxGenerations = 5;
        this.mutationRate = 0.1;
        this.population = [];
        this.bestFitness = -Infinity;
        this.bestGenome = null;
        
        // PID ranges
        this.KP_RANGE = { min: 0.01, max: 1.0 };
        this.KI_RANGE = { min: 0.001, max: 0.1 };
        this.KD_RANGE = { min: 0.01, max: 0.5 };
        
        // Sequence parameters
        this.MAX_SEQUENCE_LENGTH = 10;
        this.DURATION_RANGE = { min: 1.0, max: 2.5 };  // Updated duration range: minimum 1s, maximum 2.5s
        
        this.activeSimulations = new Array(10).fill(null);
        
        this.initialize();
    }
    
    initialize() {
        // Create initial population
        for (let i = 0; i < this.populationSize; i++) {
            const genome = this.createRandomGenome();
            this.population.push(genome);
        }
    }
    
    createRandomGenome() {
        // Generate random PID constants
        const kp = random(this.KP_RANGE.min, this.KP_RANGE.max);
        const ki = random(this.KI_RANGE.min, this.KI_RANGE.max);
        const kd = random(this.KD_RANGE.min, this.KD_RANGE.max);
        
        // Generate random sequence
        const sequenceLength = floor(random(3, this.MAX_SEQUENCE_LENGTH));
        let sequence = '';
        
        for(let i = 0; i < sequenceLength; i++) {
            const action = random() > 0.5 ? 'T' : 'D';
            const duration = random(this.DURATION_RANGE.min, this.DURATION_RANGE.max);
            sequence += `${action},${duration.toFixed(2)};`;
        }
        
        return `${kp.toFixed(3)},${ki.toFixed(3)},${kd.toFixed(3)};${sequence}`;
    }
    
    async evolve() {
        while (this.currentGeneration < this.maxGenerations) {
            console.log(`\n=== Generation ${this.currentGeneration + 1}/${this.maxGenerations} ===`);
            
            // Evaluate fitness for all genomes
            const fitnessScores = [];
            for (let i = 0; i < this.population.length; i++) {
                const fitness = await this.evaluateFitness(this.population[i]);
                fitnessScores.push(fitness);
            }
            
            // Find best genome of this generation
            const bestIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
            const avgFitness = fitnessScores.reduce((a, b) => a + b) / fitnessScores.length;
            
            console.log(`Best Fitness: ${fitnessScores[bestIndex].toFixed(2)}`);
            console.log(`Average Fitness: ${avgFitness.toFixed(2)}`);
            
            // Update all-time best if necessary
            if (fitnessScores[bestIndex] > this.bestFitness) {
                this.bestFitness = fitnessScores[bestIndex];
                this.bestGenome = this.population[bestIndex];
                console.log(`New Best Overall Fitness: ${this.bestFitness.toFixed(2)}`);
            }
            
            // Create new population
            const newPopulation = [];
            
            // Keep best 10% of population (elitism)
            const eliteCount = Math.floor(this.populationSize * 0.1);
            const sortedIndices = fitnessScores
                .map((f, i) => ({f, i}))
                .sort((a, b) => b.f - a.f)
                .map(x => x.i);
            
            for (let i = 0; i < eliteCount; i++) {
                newPopulation.push(this.population[sortedIndices[i]]);
            }
            
            // Create rest through crossover and mutation
            while (newPopulation.length < this.populationSize) {
                const parent1 = this.selectParent(fitnessScores);
                const parent2 = this.selectParent(fitnessScores);
                let child = this.crossover(
                    this.population[parent1],
                    this.population[parent2]
                );
                child = this.mutate(child);
                newPopulation.push(child);
            }
            
            // Update population and increment generation
            this.population = newPopulation;
            this.currentGeneration++;
            
            // Save best genome periodically
            if (this.currentGeneration % 1 === 0) {
                console.log('\nSaving checkpoint...');
                this.saveGenome();
            }
            
            // Add a small delay between generations to allow UI updates
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('\n=== Training Complete ===');
        console.log(`Final Best Fitness: ${this.bestFitness.toFixed(2)}`);
        console.log(`Final Best Genome: ${this.bestGenome}`);
        this.saveGenome();
    }
    
    async evaluateFitness(genome) {
        // Test each genome under 10 different random gravity conditions
        const gravityTests = Array.from({length: 10}, () => random(1.2, 10));
        
        // Initialize simulation objects for visualization
        this.activeSimulations = gravityTests.map(gravity => ({
            gravity,
            lander: {
                pos: { x: width/2, y: 50 },
                vel: { x: 0, y: 0 },
                crashed: false,
                landed: false
            },
            fitness: undefined
        }));
        
        const fitnessPromises = gravityTests.map((gravity, index) => 
            this.evaluateUnderGravity(genome, gravity, index)
        );
        
        const fitnessResults = await Promise.all(fitnessPromises);
        const avgFitness = fitnessResults.reduce((a, b) => a + b) / fitnessResults.length;
        
        return avgFitness;
    }
    
    async evaluateUnderGravity(genome, testGravity, simulationIndex) {
        return new Promise(resolve => {
            const parts = genome.split(';');
            const [kp, ki, kd] = parts[0].split(',').map(Number);
            const actions = parts.slice(1, -1);
            
            const testPID = new PIDController(kp, ki, kd);
            let currentActionIndex = 0;
            let currentActionTime = 0;
            let thrusterUsage = 0;
            
            const testLander = {
                pos: { x: width/2, y: 50 },
                vel: { x: 0, y: 0 },
                rotation: 0,
                angularVelocity: 0,
                crashed: false,
                landed: false,
                escaped: false,
                mainThruster: false
            };
            
            let simulationSteps = 0;
            const maxSteps = 1000;
            const targetY = height - 100;
            
            const simulate = () => {
                simulationSteps++;
                
                // Check if simulation should end
                const shouldEndSimulation = 
                    testLander.crashed || 
                    testLander.landed || 
                    testLander.escaped ||
                    simulationSteps >= maxSteps;
                
                if (!shouldEndSimulation) {
                    // Update physics and controls
                    this.updateSimulation(testLander, testPID, actions, currentActionIndex, 
                        currentActionTime, thrusterUsage, testGravity, targetY);
                    
                    // Update visualization
                    this.activeSimulations[simulationIndex] = {
                        gravity: testGravity,
                        lander: {
                            pos: { ...testLander.pos },
                            vel: { ...testLander.vel },
                            crashed: testLander.crashed,
                            landed: testLander.landed,
                            escaped: testLander.escaped,
                            mainThruster: testLander.mainThruster
                        }
                    };
                    
                    requestAnimationFrame(simulate);
                } else {
                    // Calculate final fitness
                    const fitness = this.calculateFitness(testLander, simulationSteps, 
                        thrusterUsage, targetY);
                    
                    // Update final state
                    this.activeSimulations[simulationIndex] = {
                        gravity: testGravity,
                        lander: {
                            pos: { ...testLander.pos },
                            vel: { ...testLander.vel },
                            crashed: testLander.crashed,
                            landed: testLander.landed,
                            escaped: testLander.escaped,
                            mainThruster: testLander.mainThruster
                        },
                        fitness: fitness
                    };
                    
                    resolve(fitness);
                }
            };
            
            simulate();
        });
    }
    
    updateSimulation(lander, pid, actions, actionIndex, actionTime, thrusterUsage, gravity, targetY) {
        // Update PID control and thrusters
        if (actionIndex < actions.length) {
            const [type, duration] = actions[actionIndex].split(',');
            const scaledDuration = Number(duration) / Math.sqrt(gravity);
            actionTime += 1/60;

            if (actionTime >= scaledDuration) {
                actionIndex++;
                actionTime = 0;
            }

            if (type === 'T') {
                const pidOutput = pid.compute(targetY, lander.pos.y, lander.vel.y);
                lander.mainThruster = pidOutput > pid.threshold;
                if (lander.mainThruster) {
                    thrusterUsage++;
                }
            } else {
                lander.mainThruster = false;
            }
        }

        // Update physics - match exactly with main simulation
        lander.vel.y += gravity * SCALE;
        if (lander.mainThruster) {
            // Calculate thrust direction based on rotation
            const thrustAngle = lander.rotation - PI/2; // Adjust so 0 means thrusting up
            
            // Convert polar coordinates (angle and magnitude) to Cartesian (x,y)
            const thrustForce = BASE_THRUST_FORCE * (gravity / MIN_GRAVITY);
            const thrustX = thrustForce * Math.cos(thrustAngle) * SCALE;
            const thrustY = thrustForce * Math.sin(thrustAngle) * SCALE;
            
            // Add thrust to velocity
            lander.vel.x += thrustX;
            lander.vel.y += thrustY;
        }
        
        // Update position
        lander.pos.x += lander.vel.x;
        lander.pos.y += lander.vel.y;

        // Add dampening like in main simulation
        lander.vel.x *= 0.99;
        lander.vel.y *= 0.99;

        // Check for atmosphere escape
        if (lander.pos.y <= 0) {
            lander.pos.y = 0;
            lander.vel.y = 0;
            lander.crashed = true;
            lander.escaped = true;
            return;
        }

        // Keep lander within screen bounds like main simulation
        lander.pos.x = constrain(lander.pos.x, 0, width);
        lander.pos.y = constrain(lander.pos.y, 0, height);

        // Check terrain collision
        this.checkTerrainCollision(lander);
    }
    
    calculateFitness(lander, steps, thrusterUsage, targetY) {
        let fitness = 10000;
        
        // Apply penalties
        if (lander.escaped) {
            fitness -= 9500;  // Most severe penalty for escaping atmosphere
        } else if (lander.crashed) {
            const crashVelocity = Math.abs(lander.vel.y) / SCALE;
            fitness -= 1000 + crashVelocity * 500;  // Severe crash penalty
        } else if (steps >= 1000) {
            fitness -= 7000;  // Timeout penalty
        } else if (lander.landed) {
            fitness += 5000;  // Landing bonus
        }

        // Distance penalty
        const finalDistance = Math.abs(lander.pos.y - targetY);
        fitness -= Math.min(5000, finalDistance);

        // Thruster usage penalty
        fitness -= Math.min(1000, thrusterUsage * 2);

        return fitness;
    }
    
    selectParent(fitnessScores) {
        // Tournament selection
        const tournamentSize = 5;
        let bestIndex = Math.floor(random(this.populationSize));
        let bestFitness = fitnessScores[bestIndex];
        
        for (let i = 0; i < tournamentSize - 1; i++) {
            const index = Math.floor(random(this.populationSize));
            if (fitnessScores[index] > bestFitness) {
                bestIndex = index;
                bestFitness = fitnessScores[index];
            }
        }
        
        return bestIndex;
    }
    
    crossover(genome1, genome2) {
        const parts1 = genome1.split(';');
        const parts2 = genome2.split(';');
        
        // Crossover PID constants
        const [kp1, ki1, kd1] = parts1[0].split(',').map(Number);
        const [kp2, ki2, kd2] = parts2[0].split(',').map(Number);
        
        const kp = (kp1 + kp2) / 2 * random(0.9, 1.1);
        const ki = (ki1 + ki2) / 2 * random(0.9, 1.1);
        const kd = (kd1 + kd2) / 2 * random(0.9, 1.1);
        
        // Crossover sequences
        const seq1 = parts1.slice(1, -1);
        const seq2 = parts2.slice(1, -1);
        
        // Randomly select actions from both parents
        const newSeqLength = floor(random(3, this.MAX_SEQUENCE_LENGTH));
        let newSequence = '';
        
        for(let i = 0; i < newSeqLength; i++) {
            const sourceSeq = random() > 0.5 ? seq1 : seq2;
            if(sourceSeq.length > 0) {
                const randomIndex = floor(random(sourceSeq.length));
                newSequence += sourceSeq[randomIndex] + ';';
            }
        }
        
        return `${kp.toFixed(3)},${ki.toFixed(3)},${kd.toFixed(3)};${newSequence}`;
    }
    
    mutate(genome) {
        const parts = genome.split(';');
        const [kp, ki, kd] = parts[0].split(',').map(Number);
        
        // Mutate PID constants
        const newKp = this.mutationRate > random() ? kp * random(0.8, 1.2) : kp;
        const newKi = this.mutationRate > random() ? ki * random(0.8, 1.2) : ki;
        const newKd = this.mutationRate > random() ? kd * random(0.8, 1.2) : kd;
        
        // Mutate sequence
        let newSequence = '';
        const actions = parts.slice(1, -1);
        
        for(let action of actions) {
            if(action) {
                const [type, duration] = action.split(',');
                const newType = this.mutationRate > random() ? (type === 'T' ? 'D' : 'T') : type;
                let newDuration = Number(duration);
                
                if(this.mutationRate > random()) {
                    newDuration *= random(0.8, 1.2);
                    // Clamp duration to valid range
                    newDuration = Math.max(this.DURATION_RANGE.min, 
                                        Math.min(this.DURATION_RANGE.max, newDuration));
                }
                
                newSequence += `${newType},${newDuration.toFixed(2)};`;
            }
        }
        
        return `${newKp.toFixed(3)},${newKi.toFixed(3)},${newKd.toFixed(3)};${newSequence}`;
    }
    
    saveGenome() {
        const date = new Date();
        const filename = `genomes/pid_genome_${date.toISOString()}.txt`;
        saveStrings([this.bestGenome], filename);
        console.log(`Saved PID genome to ${filename}`);
    }

    checkTerrainCollision(lander) {
        for (let i = 0; i < terrain.length - 1; i++) {
            const p1 = terrain[i];
            const p2 = terrain[i + 1];
            
            if (lander.pos.x >= p1.x && lander.pos.x <= p2.x) {
                const terrainY = map(
                    lander.pos.x,
                    p1.x, p2.x,
                    p1.y, p2.y
                );
                
                if (lander.pos.y >= terrainY - LANDER_HEIGHT/2) {
                    lander.pos.y = terrainY - LANDER_HEIGHT/2;
                    const landingSpeed = Math.abs(lander.vel.y) / SCALE;
                    
                    // Check if it's a safe landing in the landing zone
                    if (landingSpeed < 2.0 && 
                        lander.pos.x >= width/2 - 80 && 
                        lander.pos.x <= width/2 + 80) {
                        lander.landed = true;
                        lander.crashed = false;
                    } else {
                        lander.crashed = true;
                        lander.landed = false;
                    }
                    
                    lander.vel.y = 0;
                    return true;
                }
            }
        }
        return false;
    }

    collectMetrics() {
        return {
            generationStats: {
                avgFitness: this.calculateAverageFitness(),
                bestFitness: this.bestFitness,
                worstFitness: Math.min(...this.fitnessScores),
                diversity: this.calculatePopulationDiversity()
            },
            successRate: this.calculateSuccessRate(),
            convergenceSpeed: this.generationsToConverge
        };
    }
    
    calculatePopulationDiversity() {
        // Measure how different genomes are from each other
        let totalDifference = 0;
        for(let i = 0; i < this.population.length; i++) {
            for(let j = i + 1; j < this.population.length; j++) {
                totalDifference += this.genomeDifference(
                    this.population[i], 
                    this.population[j]
                );
            }
        }
        return totalDifference / (this.population.length * (this.population.length - 1) / 2);
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
    if (!window.visualizationData) return;
    
    // Draw fitness over time graph
    drawGraph(window.visualizationData.fitnessHistory, "Fitness History", 50, 50, 300, 200);
    
    // Draw diversity graph
    drawGraph(window.visualizationData.diversityHistory, "Population Diversity", 400, 50, 300, 200);
    
    // Draw success rate graph
    drawGraph(window.visualizationData.successRateHistory, "Success Rate", 50, 300, 300, 200);
}

function drawGraph(data, title, x, y, w, h) {
    push();
    translate(x, y);
    
    // Draw axes
    stroke(255);
    line(0, h, w, h);  // X axis
    line(0, 0, 0, h);  // Y axis
    
    // Draw title
    noStroke();
    fill(255);
    textAlign(CENTER);
    text(title, w/2, -10);
    
    // Draw data points
    stroke(255, 255, 0);
    noFill();
    beginShape();
    for (let i = 0; i < data.length; i++) {
        const px = map(i, 0, data.length-1, 0, w);
        const py = map(data[i], 0, max(data), h, 0);
        vertex(px, py);
    }
    endShape();
    
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
