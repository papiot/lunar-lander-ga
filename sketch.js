// import GeneticAlgorithm from "./genetic_algorithm";

// State of the scene
let currentScene = 'simulation'; 

// For the terrain
let terrain = []; 

// For the lander
const LANDER_WIDTH = 40;
const LANDER_HEIGHT = 50;

// Constants for the physics
// Moon's gravity in m/s²
const GRAVITY = 1.62; 

// Scale factor to convert real physics to screen coordinates
const SCALE = 0.01; 

// Thrust force magnitude
const THRUST_FORCE = 3.0 * SCALE; 

// Side thrusters' rotational force
const ROTATION_THRUST = 0.03 * SCALE; 

// State of the lander
let lander = {
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    rotation: 0,
    angularVelocity: 0, 
    crashed: false,
    mainThruster: false,
    leftThruster: false,
    rightThruster: false
};

function setup() {
    createCanvas(800, 600);
    createSceneToggles();
    loadTerrain('terrain/terrain_2024-12-04T11-42-51.json'); // Load default terrain
    resetLander();
}

function createSceneToggles() {
    const simButton = createButton('Simulation');
    const trainButton = createButton('Training');
    
    const canvas = document.querySelector('canvas');
    const canvasX = canvas.offsetLeft;
    const canvasY = canvas.offsetTop;
    
    // Position buttons at top of canvas
    simButton.position(canvasX + 70, canvasY - 40);
    trainButton.position(canvasX + 160, canvasY - 40);
    
    simButton.mousePressed(() => {
        currentScene = 'simulation';
        stopTraining(); // Add this to ensure training stops when switching scenes
    });
    trainButton.mousePressed(() => {
        currentScene = 'training';
        resetTraining(); // Add this to reset training state when switching to training scene
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
    
    // Draw different content based on current scene
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
    
    // Update and draw 
    updateLander();
    drawLander();
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
        // window.ga = new GeneticAlgorithm();
        window.ga = new GeneticAlgorithm();
    }
    ga.evolve();
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
    // Start from top
    lander.pos = { x: width/2, y: 50 }; 
    lander.vel = { x: 0, y: 0 };
    lander.rotation = 0;
    lander.angularVelocity = 0; // random(-0.05, 0.05); // Random angular velocity
    lander.crashed = false;
}

function updateLander() {
    if (lander.crashed) return;

    // Apply gravity
    lander.vel.y += GRAVITY * SCALE;
    
    // Apply main thruster
    if (lander.mainThruster) {    
        // Calculate thrust vector based on lander's rotation
        let thrustX = -THRUST_FORCE * Math.sin(lander.rotation);
        let thrustY = -THRUST_FORCE * Math.cos(lander.rotation);
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
                
                // Set crash state for visual feedback
                lander.crashed = !isSafeLanding;
                
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
    
    // Update color based on crash state
    if (lander.crashed) {
        fill(255, 0, 0);  // Red for crash
    } else if (lander.vel.x === 0 && lander.vel.y === 0) {
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


class LunarLander {
    constructor() {
        this.position = 1000; // Starting height in meters
        this.velocity = 0;    // Initial velocity
        this.gravity = -1.62; // Moon's gravity in m/s²
        this.thrust = 2.0;    // Thrust force in m/s²
        this.fuel = 100;      // Starting fuel
    }

    // Simulate one time step (0.1 seconds)
    step(thrustOn) {
        const acceleration = this.gravity + (thrustOn ? this.thrust : 0);
        this.velocity += acceleration * 0.1;
        this.position += this.velocity * 0.1;
        if (thrustOn) this.fuel -= 0.1;
    }
}

class GeneticAlgorithm {
    constructor(populationSize = 100, geneLength = 50) {
        this.populationSize = populationSize;
        this.geneLength = geneLength;
        this.population = [];
        this.initializePopulation();
    }

    // Create random initial population
    initializePopulation() {
        for (let i = 0; i < this.populationSize; i++) {
            const chromosome = Array(this.geneLength).fill(0)
                .map(() => Math.random() < 0.5 ? 1 : 0);
            this.population.push(chromosome);
        }
    }

    // Calculate fitness for a chromosome
    calculateFitness(chromosome) {
        const lander = new LunarLander();
        
        // Simulate the landing
        for (let gene of chromosome) {
            lander.step(gene === 1);
            if (lander.position <= 0) break;
        }

        // Penalties for various failure conditions
        if (lander.position > 0) return 0; // Didn't reach the ground
        if (lander.fuel < 0) return 0;     // Ran out of fuel
        
        // Fitness based on landing velocity (softer landing = better fitness)
        const velocityPenalty = Math.abs(lander.velocity);
        return 1 / (1 + velocityPenalty);
    }

    // Select parents using tournament selection
    selectParent() {
        const tournamentSize = 5;
        let best = null;
        let bestFitness = -1;

        for (let i = 0; i < tournamentSize; i++) {
            const index = Math.floor(Math.random() * this.population.length);
            const fitness = this.calculateFitness(this.population[index]);
            if (fitness > bestFitness) {
                best = this.population[index];
                bestFitness = fitness;
            }
        }
        return best;
    }

    // Crossover two parents to create offspring
    crossover(parent1, parent2) {
        const crossoverPoint = Math.floor(Math.random() * this.geneLength);
        return [
            ...parent1.slice(0, crossoverPoint),
            ...parent2.slice(crossoverPoint)
        ];
    }

    // Mutate a chromosome
    mutate(chromosome, mutationRate = 0.01) {
        return chromosome.map(gene => 
            Math.random() < mutationRate ? (gene === 1 ? 0 : 1) : gene
        );
    }

    // Evolve the population
    evolve(generations = 100) {
        for (let gen = 0; gen < generations; gen++) {
            const newPopulation = [];

            // Create new population
            while (newPopulation.length < this.populationSize) {
                const parent1 = this.selectParent();
                const parent2 = this.selectParent();
                let offspring = this.crossover(parent1, parent2);
                offspring = this.mutate(offspring);
                newPopulation.push(offspring);
            }

            this.population = newPopulation;

            // Log best fitness for this generation
            const bestFitness = Math.max(...this.population.map(p => this.calculateFitness(p)));
            console.log(`Generation ${gen}: Best Fitness = ${bestFitness}`);
        }
    }
}