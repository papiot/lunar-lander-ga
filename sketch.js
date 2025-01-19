// State of the scene
let currentScene = 'simulation'; 

// For the terrain
let terrain = []; 

// For the lander
const LANDER_WIDTH = 40;
const LANDER_HEIGHT = 50;

// Constants for the physics
// Will be set randomly on reset
let GRAVITY;
const MIN_GRAVITY = 2;    // Minimum gravity in m/s²
const MAX_GRAVITY = 10;   // Maximum gravity in m/s²

// Scale factor to convert real physics to screen coordinates
const SCALE = 0.01; 

// Thrust force magnitude
const THRUST_FORCE = 3.0 * SCALE; 

// Side thrusters' rotational force
const ROTATION_THRUST = 0.03 * SCALE; 

// For testing:

let currentGenome = '';
let genomeFileName = 'genomes/genome_2024-12-13T20-02-36.528Z.txt';

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

// Add current genome tracking
let currentActionIndex = 0;  // Which gene we're currently executing
let actionTimer = 0;        // How long current action has been running
let currentActions = [];    // Parsed array of [action, duration] pairs

// Add this function near other initialization functions
function loadGenome(index) {
    fetch(genomeFileName)
        .then(response => response.text())
        .then(data => {
            currentGenome = data.trim();
            resetLander(); // Reset lander with new genome
        })
        .catch(error => {
            console.error('Error loading genome:', error);
        });
}

function setup() {
    createCanvas(800, 600);
    createSceneToggles();
    loadTerrain('terrain/terrain_2024-12-04T11-42-51.json');
    loadGenome(1); // Load first genome by default
}

function createSceneToggles() {
    const simButton = createButton('Manual');
    const simGAButton = createButton('GA Test');
    const trainButton = createButton('Training');
    
    const canvas = document.querySelector('canvas');
    const canvasX = canvas.offsetLeft;
    const canvasY = canvas.offsetTop;
    
    // Position buttons at top of canvas
    simButton.position(canvasX + 70, canvasY - 40);
    simGAButton.position(canvasX + 160, canvasY - 40);
    trainButton.position(canvasX + 250, canvasY - 40);
    
    simButton.mousePressed(() => currentScene = 'simulation');
    simGAButton.mousePressed(() => {
        currentScene = 'simulation_ga';
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
    } else if (currentScene === 'simulation_ga') {
        drawSimulationScene();
        // Add genome info overlay
        fill(255);
        textSize(16);
        textAlign(LEFT);
        text(`Using genome ${genomeFileName}`, 20, 30);
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
    
    // Display current gravity value
    fill(255);
    textSize(16);
    textAlign(LEFT);
    text(`Gravity: ${GRAVITY.toFixed(1)} m/s²`, 20, 50);
    
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
    // Randomize gravity
    GRAVITY = random(MIN_GRAVITY, MAX_GRAVITY);
    
    // Start from top
    lander.pos = { x: width/2, y: 50 }; 
    lander.vel = { x: 0, y: 0 };
    lander.rotation = 0;
    lander.angularVelocity = 0;
    lander.crashed = false;
    lander.landed = false;
    
    // Add genome parsing and reset when in GA mode
    if (currentScene === 'simulation_ga') {
        currentActionIndex = 0;
        actionTimer = 0;
        // Parse genome string into actions array
        currentActions = currentGenome.split(';').map(gene => {
            const [action, duration] = gene.split(',');
            return [action, parseFloat(duration)];
        });
    }
}

function updateLander() {
    if (lander.crashed) return;
    
    // Add success state check at the start
    if (lander.landed) return;  // Stop processing if successfully landed

    // Add GA control logic at the start of updateLander
    if (currentScene === 'simulation_ga') {
        // Update action timer
        actionTimer += deltaTime / 1000; // Convert milliseconds to seconds
        
        // Check if we have actions to execute
        if (currentActionIndex < currentActions.length) {
            const [action, duration] = currentActions[currentActionIndex];
            
            // Execute current action
            if (action === 'T') {
                lander.mainThruster = true;
            } else {
                lander.mainThruster = false;
            }
            
            // Move to next action if current one is complete
            if (actionTimer >= duration) {
                currentActionIndex++;
                actionTimer = 0;
                lander.mainThruster = false;
            }
        } else {
            // No more actions, turn off thrusters
            lander.mainThruster = false;
        }
    }

    // Apply gravity
    lander.vel.y += GRAVITY * SCALE;
    
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
        this.maxGenes = 50;
        this.currentGeneration = 0;
        this.maxGenerations = 3;
        this.mutationRate = 0.1;
        this.population = [];
        this.bestFitness = -Infinity;
        this.bestGenome = null;
        
        // Constants for fitness calculation
        this.MAX_SAFE_LANDING_SPEED = 2 * SCALE;
        this.MAX_SAFE_ANGLE = PI / 9;
        this.TARGET_LANDING_Y = height - 100; // Landing pad height
        
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
        const numGenes = Math.floor(random(10, this.maxGenes));
        const genes = [];
        
        for (let i = 0; i < numGenes; i++) {
            const action = random() < 0.5 ? 'T' : 'D';
            const duration = random(0.1, 3).toFixed(1);
            genes.push(`${action},${duration}`);
        }
        
        return genes.join(';');
    }
    
    async evolve() {
        while (this.currentGeneration < this.maxGenerations) {
            console.log(`Generation ${this.currentGeneration + 1}/${this.maxGenerations}`);
            
            // Evaluate fitness for all genomes
            const fitnessScores = await Promise.all(
                this.population.map(genome => this.evaluateFitness(genome))
            );
            
            // Find best genome
            const bestIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
            if (fitnessScores[bestIndex] > this.bestFitness) {
                this.bestFitness = fitnessScores[bestIndex];
                this.bestGenome = this.population[bestIndex];
                console.log(`New best fitness: ${this.bestFitness}`);
            }
            
            // Create new population
            const newPopulation = [];
            
            // Keep best 10% of population
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
            
            // Save best genome every 10 generations
            if (this.currentGeneration % 10 === 0) {
                this.saveGenome();
            }
        }
        
        // Save final best genome
        this.saveGenome();
    }
    
    async evaluateFitness(genome) {
        return new Promise(resolve => {
            // Create temporary lander for simulation
            const testLander = {
                pos: { x: width/2, y: 50 },
                vel: { x: 0, y: 0 },
                rotation: 0,
                angularVelocity: 0,
                crashed: false,
                mainThruster: false
            };
            
            // Parse genome
            const actions = genome.split(';').map(gene => {
                const [action, duration] = gene.split(',');
                return [action, parseFloat(duration)];
            });
            
            let currentAction = 0;
            let actionTimer = 0;
            let simulationSteps = 0;
            const maxSteps = 1000; // Prevent infinite loops
            
            const simulate = () => {
                if (simulationSteps++ > maxSteps || testLander.crashed) {
                    // Calculate fitness
                    const distanceToLanding = Math.abs(testLander.pos.y - this.TARGET_LANDING_Y);
                    const speedPenalty = Math.abs(testLander.vel.y) > this.MAX_SAFE_LANDING_SPEED ? 1000 : 0;
                    const anglePenalty = Math.abs(testLander.rotation) > this.MAX_SAFE_ANGLE ? 1000 : 0;
                    
                    // Higher fitness is better
                    const fitness = 10000 - distanceToLanding - speedPenalty - anglePenalty;
                    resolve(fitness);
                    return;
                }
                
                // Update action
                if (currentAction < actions.length) {
                    const [action, duration] = actions[currentAction];
                    testLander.mainThruster = (action === 'T');
                    
                    actionTimer += 1/60; // Assuming 60 FPS
                    if (actionTimer >= duration) {
                        currentAction++;
                        actionTimer = 0;
                    }
                }
                
                // Update physics (simplified version of updateLander)
                testLander.vel.y += GRAVITY * SCALE;
                
                if (testLander.mainThruster) {
                    testLander.vel.y -= THRUST_FORCE;
                }
                
                testLander.pos.y += testLander.vel.y;
                
                // Check for collision
                if (testLander.pos.y >= this.TARGET_LANDING_Y) {
                    testLander.crashed = true;
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
        const genes1 = genome1.split(';');
        const genes2 = genome2.split(';');
        
        const crossoverPoint = Math.floor(random(
            Math.min(genes1.length, genes2.length)
        ));
        
        const newGenes = [
            ...genes1.slice(0, crossoverPoint),
            ...genes2.slice(crossoverPoint)
        ];
        
        return newGenes.join(';');
    }
    
    mutate(genome) {
        const genes = genome.split(';');
        const mutatedGenes = genes.map(gene => {
            if (random() < this.mutationRate) {
                // Create new random gene
                const action = random() < 0.5 ? 'T' : 'D';
                const duration = random(0.1, 3).toFixed(1);
                return `${action},${duration}`;
            }
            return gene;
        });
        
        return mutatedGenes.join(';');
    }
    
    saveGenome() {
        const date = new Date();
        const filename = `genome_${date.toISOString().replace(/:/g, '-')}.txt`;
        saveStrings([this.bestGenome], filename);
        console.log(`Saved genome to ${filename}`);
    }
} 
