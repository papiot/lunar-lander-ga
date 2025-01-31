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
const THRUST_FORCE = 20; 

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
    
    const canvas = document.querySelector('canvas');
    const canvasX = canvas.offsetLeft;
    const canvasY = canvas.offsetTop;
    
    simButton.position(canvasX + 70, canvasY - 40);
    trainButton.position(canvasX + 160, canvasY - 40);
    
    simButton.mousePressed(() => {
        currentScene = 'simulation';
        USE_PID = true;
        loadGenome();  // Load PID values when switching to test mode
        resetLander();
    });
    trainButton.mousePressed(() => currentScene = 'training');
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
    
    if (currentScene === 'simulation') {
        drawSimulationScene();
    } else {
        drawTrainingScene();
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
        window.trainButton.position(width/2 - 50, height/2);
        window.trainButton.mousePressed(toggleTraining);
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
    
    // Update physics
    lander.vel.y += GRAVITY * SCALE;
    if (lander.mainThruster) {
        lander.vel.y -= THRUST_FORCE * SCALE;
    }
    
    lander.vel.x = 0;
    lander.pos.y += lander.vel.y;
    lander.pos.x = width/2;
    
    // Add bounds checking
    if (lander.pos.y < 0) {
        lander.pos.y = 0;
        lander.vel.y = 0;  // Optional: stop vertical velocity when hitting top
    }
    
    // Apply gravity
    lander.vel.x += GRAVITY * SCALE;
    
    // Apply main thruster
    if (lander.mainThruster) {    
        // Calculate thrust direction based on rotation
        const thrustAngle = lander.rotation - PI/2; // Adjust so 0 means thrusting up
        
        // Convert polar coordinates (angle and magnitude) to Cartesian (x,y)
        const thrustX = THRUST_FORCE * Math.cos(thrustAngle);
        const thrustY = THRUST_FORCE * Math.sin(thrustAngle);
        
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
        this.maxGenerations = 10;
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
            const fitnessScores = await Promise.all(
                this.population.map(genome => this.evaluateFitness(genome))
            );
            
            // Find best genome of this generation
            const bestIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
            const avgFitness = fitnessScores.reduce((a, b) => a + b) / fitnessScores.length;
            
            console.log(`Best Genome: ${this.population[bestIndex]}`);
            console.log(`Best Fitness: ${fitnessScores[bestIndex].toFixed(2)}`);
            console.log(`Average Fitness: ${avgFitness.toFixed(2)}`);
            
            // Update all-time best if necessary
            if (fitnessScores[bestIndex] > this.bestFitness) {
                this.bestFitness = fitnessScores[bestIndex];
                this.bestGenome = this.population[bestIndex];
                console.log(`New Best Overall Fitness: ${this.bestFitness.toFixed(2)}`);
                console.log(`New Best PID Values - Kp: ${this.bestGenome.split(',')[0]}, Ki: ${this.bestGenome.split(',')[1]}, Kd: ${this.bestGenome.split(',')[2]}`);
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
            
            this.population = newPopulation;
            this.currentGeneration++;
            
            // Save best genome periodically
            if (this.currentGeneration % 10 === 0) {
                console.log('\nSaving checkpoint...');
                this.saveGenome();
            }
        }
        
        console.log('\n=== Training Complete ===');
        console.log(`Final Best Fitness: ${this.bestFitness.toFixed(2)}`);
        console.log(`Final Best Genome: ${this.bestGenome}`);
        this.saveGenome();
    }
    
    async evaluateFitness(genome) {
        // Test each genome under 10 different random gravity conditions
        const gravityTests = Array.from({length: 10}, () => random(1.2, 10));
        console.log('\nTesting genome under gravities:', gravityTests.map(g => g.toFixed(2)));
        
        const fitnessPromises = gravityTests.map(gravity => 
            this.evaluateUnderGravity(genome, gravity)
        );
        
        // Wait for all gravity condition tests to complete
        const fitnessResults = await Promise.all(fitnessPromises);
        
        // Calculate and log average fitness
        const avgFitness = fitnessResults.reduce((a, b) => a + b) / fitnessResults.length;
        console.log('\nFitness results:', fitnessResults.map(f => f.toFixed(2)));
        console.log('Average fitness:', avgFitness.toFixed(2));
        
        return avgFitness;
    }
    
    async evaluateUnderGravity(genome, testGravity) {
        return new Promise(resolve => {
            const parts = genome.split(';');
            const [kp, ki, kd] = parts[0].split(',').map(Number);
            const actions = parts.slice(1, -1);
            
            const testPID = new PIDController(kp, ki, kd);
            
            let currentActionIndex = 0;
            let currentActionTime = 0;
            let thrusterUsage = 0;
            let maxHeightReached = 0;  // Track maximum height
            
            const testLander = {
                pos: { x: width/2, y: 50 },
                vel: { x: 0, y: 0 },
                rotation: 0,
                angularVelocity: 0,
                crashed: false,
                landed: false,
                mainThruster: false
            };
            
            let simulationSteps = 0;
            const maxSteps = 1000;
            const targetY = height - 100;
            
            const simulate = () => {
                if (simulationSteps++ > maxSteps || testLander.crashed || testLander.landed) {
                    let fitness = 10000;
                    let penalties = {
                        space: 0,
                        crash: 0,
                        timeout: 0,
                        distance: 0,
                        velocity: 0,
                        thruster: 0,
                        time: 0
                    };
                    
                    // Space penalty - only if it goes above canvas
                    if (testLander.pos.y < 0) {
                        penalties.space = 9000;
                    }
                    
                    // Crash or timeout penalties
                    if (testLander.crashed) {
                        const crashVelocity = Math.abs(testLander.vel.y);
                        penalties.crash = Math.min(8000, 1000 * (crashVelocity / 5));
                    } else if (simulationSteps >= maxSteps) {
                        penalties.timeout = 7000;
                    }
                    
                    // Regular penalties - with reasonable scaling
                    penalties.distance = Math.min(5000, Math.abs(testLander.pos.y - targetY) * 2);
                    penalties.velocity = Math.min(2000, Math.abs(testLander.vel.y) * 20);
                    penalties.thruster = Math.min(1000, thrusterUsage);
                    penalties.time = Math.min(1000, simulationSteps / 2);
                    
                    // Calculate total fitness
                    let totalPenalty = Object.values(penalties).reduce((a, b) => a + b, 0);
                    fitness -= totalPenalty;
                    
                    // Add landing bonus if applicable
                    if (testLander.landed) {
                        const landingVelocity = Math.abs(testLander.vel.y);
                        const landingBonus = 3000 * Math.max(0, 1 - (landingVelocity / 2));
                        fitness += landingBonus;
                    }
                    
                    // Debug logging
                    console.log(`\nDetailed Fitness Calculation (g=${testGravity}):`);
                    console.log(`Base Fitness: 10000`);
                    console.log(`Penalties:`);
                    Object.entries(penalties).forEach(([key, value]) => {
                        console.log(`- ${key}: -${value.toFixed(2)}`);
                    });
                    if (testLander.landed) {
                        console.log(`Landing Bonus: +${landingBonus.toFixed(2)}`);
                    }
                    console.log(`Final Fitness: ${fitness.toFixed(2)}`);
                    console.log(`Status: ${testLander.landed ? 'LANDED' : testLander.crashed ? 'CRASHED' : 'TIMEOUT'}`);
                    console.log(`Position: ${testLander.pos.y.toFixed(2)}`);
                    console.log(`Velocity: ${testLander.vel.y.toFixed(2)}`);
                    
                    resolve(fitness);
                    return;
                }
                
                // Update physics with original scaling
                testLander.vel.y += testGravity * SCALE;
                if (testLander.mainThruster) {
                    testLander.vel.y -= THRUST_FORCE * SCALE;  // Removed the 1.5 multiplier
                }
                testLander.pos.y += testLander.vel.y;
                
                // Bounds checking
                if (testLander.pos.y < 0) {
                    testLander.pos.y = 0;
                    testLander.vel.y = 0;
                }
                
                requestAnimationFrame(simulate);
            };
            
            simulate();
        });
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
