let currentScene = 'Moon';
let scenes = ['Moon', 'Earth', 'Mars', 'Asteroid', 'Custom'];
let buttons = [];

let sceneParameters = {
    'Moon': {
        gravity: 1.62,
        entryAngle: 0,
        entryVelocity: 5,
        entryAngularVelocity: 0,
        windDirection: 0,
        windVelocity: 0,
        platformX: 400
    },
    'Earth': {
        gravity: 9.81,
        entryAngle: 0,
        entryVelocity: 8,
        entryAngularVelocity: 0,
        windDirection: 45,
        windVelocity: 2,
        platformX: 400
    },
    'Mars': {
        gravity: 3.72,
        entryAngle: 0,
        entryVelocity: 6,
        entryAngularVelocity: 0,
        windDirection: 90,
        windVelocity: 5,
        platformX: 400
    },
    'Asteroid': {
        gravity: 0.5,
        entryAngle: 0,
        entryVelocity: 3,
        entryAngularVelocity: 0,
        windDirection: 0,
        windVelocity: 0,
        platformX: 400
    },
    'Custom': {
        gravity: 5.0,
        entryAngle: 0,
        entryVelocity: 5,
        entryAngularVelocity: 0,
        windDirection: 0,
        windVelocity: 0,
        platformX: 400
    }
};

let parameterInputs = {};
let genomeInput;
let playButton;
let trainButton;

let lander = {
    x: 400,
    y: 100,
    angle: 0,
    size: 30,
    vx: 0,
    vy: 0,
    angularVel: 0,
    isPlaying: false,
    crashed: false,
    color: [180, 180, 180] // Default gray color [R,G,B]
};

// Add these to your global variables
let currentManeuver = 0;
let maneuverStartTime = 0;
let maneuvers = [];
let activeThrusters = {
    main: false,
    left: false,
    right: false
};

// Add these global variables at the top
let population = [];
const POPULATION_SIZE = 10000;
const MUTATION_RATE = 0.1;
const GENERATION_LIMIT = 50;
let currentGeneration = 0;
let bestFitness = -Infinity;
let bestGenome = '';

const PHYSICS_SCALE = 0.05;  
const MAIN_THRUSTER_FORCE = 10.0;  
const SIDE_THRUSTER_FORCE = 0.05;  

function createParameterControls() {
    // Container for parameters
    let panel = createDiv();
    panel.position(10, 50);
    panel.style('background-color', '#f0f0f0');
    panel.style('padding', '10px');
    panel.style('border-radius', '5px');
    
    const parameters = [
        { name: 'gravity', label: 'Gravity (m/s²)', min: 0, max: 20, step: 0.1 },
        { name: 'entryAngle', label: 'Entry Angle (°)', min: -180, max: 180, step: 1 },
        { name: 'entryVelocity', label: 'Entry Velocity (m/s)', min: 0, max: 20, step: 0.5 },
        { name: 'entryAngularVelocity', label: 'Entry Angular Velocity (°/s)', min: -180, max: 180, step: 1 },
        { name: 'windDirection', label: 'Wind Direction (°)', min: 0, max: 360, step: 1 },
        { name: 'windVelocity', label: 'Wind Velocity (m/s)', min: 0, max: 20, step: 0.1 },
        { name: 'platformX', label: 'Platform Position (x)', min: 100, max: 700, step: 10 }
    ];

    parameterInputs[currentScene] = {};
    
    parameters.forEach(param => {
        let container = createDiv();
        container.parent(panel);
        container.style('margin', '5px 0');
        
        let label = createSpan(param.label + ': ');
        label.parent(container);
        
        let input = createInput(sceneParameters[currentScene][param.name].toString(), 'number');
        input.parent(container);
        input.style('width', '60px');
        input.style('margin-left', '5px');
        input.attribute('min', param.min);
        input.attribute('max', param.max);
        input.attribute('step', param.step);
        
        input.input(() => {
            sceneParameters[currentScene][param.name] = parseFloat(input.value());
        });
        
        parameterInputs[currentScene][param.name] = input;
    });
}

function createSceneControls() {
    // Container for genome controls
    let panel = createDiv();
    panel.position(10, 300);  
    panel.style('background-color', '#f0f0f0');
    panel.style('padding', '10px');
    panel.style('border-radius', '5px');
    panel.style('width', '300px');

    // Genome input
    let label = createSpan('Genome: ');
    label.parent(panel);
    
    genomeInput = createInput('');
    genomeInput.parent(panel);
    genomeInput.style('width', '280px');
    genomeInput.style('margin', '5px 0');
    genomeInput.attribute('placeholder', 'Enter genome string...');

    // Buttons container
    let buttonContainer = createDiv();
    buttonContainer.parent(panel);
    buttonContainer.style('display', 'flex');
    buttonContainer.style('gap', '10px');
    buttonContainer.style('margin-top', '10px');

    // Play button
    playButton = createButton('Play Genome');
    playButton.parent(buttonContainer);
    playButton.class('action-button');
    playButton.mousePressed(() => {
        resetLander();
    });
    
    // Train button
    trainButton = createButton('Train + Play');
    trainButton.parent(buttonContainer);
    trainButton.class('action-button');

    trainButton.mousePressed(async () => {
        initializePopulation();
        currentGeneration = 0;
        bestFitness = -Infinity;
        
        while (await trainGeneration()) {
            // Training continues until generation limit is reached
        }
        
        // Use best genome found
        genomeInput.value(bestGenome);
        resetLander();
    });
}

function setup() {
    createCanvas(800, 600);
    // Create scene selection buttons
    for (let i = 0; i < scenes.length; i++) {
        let button = createButton(scenes[i]);
        button.position(10 + i * 100, 10);
        button.mousePressed(() => selectScene(scenes[i]));
        button.class('scene-button');
        buttons.push(button);
    }
    // Initialize Moon button as selected
    selectScene('Moon');
}
    
function draw() {
    // Draw different backgrounds based on scene
    switch(currentScene) {
        case 'Moon':
            background(50);
            fill(180);
            break;
        case 'Earth':
            background(135, 206, 235);
            fill(34, 139, 34);
            break;
        case 'Mars':
            background(150, 75, 0);
            fill(188, 39, 50);
            break;
        case 'Asteroid':
            background(20);
            fill(100);
            break;
        case 'Custom':
            background(100);
            fill(150);
            break;
    }
    
    // Draw ground
    noStroke();
    rect(0, 500, width, 100);
    
    // Draw landing pad at the parameter-specified position
    let platformX = sceneParameters[currentScene].platformX;
    fill(255, 140, 0); // Orange color
    rect(platformX - 50, 500, 100, 10);
    
    // Draw flags at the new position
    stroke(255);
    strokeWeight(2);
    // Left flag
    line(platformX - 50, 500, platformX - 50, 470);
    fill(255, 0, 0);
    noStroke();
    triangle(platformX - 50, 470, platformX - 30, 480, platformX - 50, 490);
    
    // Right flag
    stroke(255);
    line(platformX + 50, 500, platformX + 50, 470);
    fill(255, 0, 0);
    noStroke();
    triangle(platformX + 50, 470, platformX + 70, 480, platformX + 50, 490);
    
    // Update lander physics
    updateLander();
    
    // Draw the lander
    drawLander();
}

function selectScene(scene) {
    currentScene = scene;
    // Update button styles
    buttons.forEach(btn => {
        if (btn.html() === scene) {
            btn.style('background-color', '#666');
        } else {
            btn.style('background-color', '#fff');
        }
    });
    
    // Remove existing controls if any
    Object.values(parameterInputs).forEach(inputs => {
        Object.values(inputs).forEach(input => {
            input.parent().remove();
        });
    });
    if (genomeInput) {
        genomeInput.parent().remove();
    }
    
    // Create new controls for selected scene
    createParameterControls();
    createSceneControls();
}

function resetLander() {
    lander.x = 400;
    lander.y = 100;
    lander.angle = sceneParameters[currentScene].entryAngle * PI / 180;
    // Scale initial velocities
    lander.vx = sceneParameters[currentScene].entryVelocity * Math.cos(lander.angle) * PHYSICS_SCALE;
    lander.vy = sceneParameters[currentScene].entryVelocity * Math.sin(lander.angle) * PHYSICS_SCALE;
    lander.angularVel = sceneParameters[currentScene].entryAngularVelocity * PI / 180 * PHYSICS_SCALE;
    lander.isPlaying = true;
    lander.crashed = false;
    lander.color = [180, 180, 180];
    currentManeuver = 0;
    maneuverStartTime = millis();
    maneuvers = parseGenome(genomeInput.value());
    activeThrusters = {
        main: false,
        left: false,
        right: false
    };
}

function parseGenome(genomeStr) {
    if (!genomeStr) return [];
    
    try {
        return genomeStr.split(';')
            .map(m => m.trim())
            .filter(m => m.length > 0)
            .map(m => {
                const [action, duration] = m.split(',');
                return {
                    action: action.trim().toUpperCase(),
                    duration: parseFloat(duration)
                };
            })
            .slice(0, 10); // Maximum 10 maneuvers
    } catch (e) {
        console.error("Error parsing genome:", e);
        return [];
    }
}

function updateLander() {
    if (!lander.isPlaying || lander.crashed) {
        // Stop all thrusters when crashed or not playing
        activeThrusters.main = false;
        activeThrusters.left = false;
        activeThrusters.right = false;
        return;
    }

    // Execute maneuvers if we have any
    if (maneuvers.length > 0 && currentManeuver < maneuvers.length) {
        const elapsedTime = (millis() - maneuverStartTime) / 1000; // Convert to seconds
        const currentAction = maneuvers[currentManeuver];
        
        // Reset all thrusters
        activeThrusters.main = false;
        activeThrusters.left = false;
        activeThrusters.right = false;
        
        // Execute current action
        if (elapsedTime < currentAction.duration) {
            switch (currentAction.action) {
                case 'T':
                    activeThrusters.main = true;
                    lander.vy -= MAIN_THRUSTER_FORCE * PHYSICS_SCALE;
                    break;
                case 'L':
                    activeThrusters.left = true;
                    lander.angularVel += SIDE_THRUSTER_FORCE * PHYSICS_SCALE;
                    break;
                case 'R':
                    activeThrusters.right = true;
                    lander.angularVel -= SIDE_THRUSTER_FORCE * PHYSICS_SCALE;
                    break;
                case 'D':
                    // Do nothing during drift
                    break;
            }
        } else {
            // Move to next maneuver
            currentManeuver++;
            maneuverStartTime = millis();
        }
    }

    // Apply gravity (scaled)
    lander.vy += sceneParameters[currentScene].gravity * PHYSICS_SCALE;

    // Apply wind (scaled)
    let windRad = sceneParameters[currentScene].windDirection * PI / 180;
    let windForceX = sceneParameters[currentScene].windVelocity * Math.cos(windRad) * PHYSICS_SCALE * 0.1;
    let windForceY = sceneParameters[currentScene].windVelocity * Math.sin(windRad) * PHYSICS_SCALE * 0.1;
    lander.vx += windForceX;
    lander.vy += windForceY;

    // Update position
    lander.x += lander.vx;
    lander.y += lander.vy;
    lander.angle += lander.angularVel;

    // Check for out of bounds (including upward boundary)
    if (lander.x < 0 || lander.x > width || lander.y < 0) {
        lander.crashed = true;
        lander.color = [255, 0, 0];
        console.log("Out of bounds - Mission failed");
        return;
    }

    // Check for collision with ground
    if (lander.y + lander.size/2 >= 500) {
        lander.crashed = true;
        lander.y = 500 - lander.size/2;
        
        // Calculate landing speed and angle
        let landingSpeed = Math.sqrt(lander.vx * lander.vx + lander.vy * lander.vy);
        let landingAngle = (lander.angle * 180 / PI) % 360;
        if (landingAngle > 180) landingAngle -= 360;
        if (landingAngle < -180) landingAngle += 360;
        
        let platformX = sceneParameters[currentScene].platformX;
        let onPlatform = lander.x >= platformX - 50 && lander.x <= platformX + 50;
        
        // Landing criteria (adjusted for scaled physics)
        let safeSpeed = landingSpeed < 5.0; // Reduced safe landing speed threshold
        let safeAngle = landingAngle >= -10 && landingAngle <= 10;
        
        console.log("Landing speed: " + landingSpeed.toFixed(2));
        console.log("Landing angle: " + landingAngle.toFixed(2) + "°");
        
        if (safeSpeed) {
            console.log("Successful landing!");
            lander.color = [0, 255, 0];
        } else {
            console.log("Landing failed");
            lander.color = [255, 0, 0];
        }
    }
}

function drawLander() {
    push();
    translate(lander.x, lander.y);
    rotate(lander.angle);
    
    // Main body
    fill(lander.color);
    stroke(100);
    strokeWeight(2);
    rectMode(CENTER);
    rect(0, 0, lander.size, lander.size);
    
    // Landing feet
    stroke(100);
    strokeWeight(2);
    // Left foot
    line(-lander.size/2, lander.size/2, -lander.size/2 - 10, lander.size/2 + 8);
    line(-lander.size/2 - 10, lander.size/2 + 8, -lander.size/2 - 5, lander.size/2 + 8);
    // Right foot
    line(lander.size/2, lander.size/2, lander.size/2 + 10, lander.size/2 + 8);
    line(lander.size/2 + 10, lander.size/2 + 8, lander.size/2 + 5, lander.size/2 + 8);
    
    // Thrusters with flame animations
    stroke(100);
    fill(100);
    
    // Main thruster
    rect(0, lander.size/2, 10, 5);
    if (activeThrusters.main) {
        noStroke();
        fill(255, 150, 0, 200);
        triangle(-5, lander.size/2, 5, lander.size/2, 
                0, lander.size/2 + random(15, 25));
    }
    
    // Left thruster (pointing right and up)
    push();
    translate(-lander.size/2, 0);
    rotate(PI/4);  // Changed to +45 degrees
    rect(0, 0, 8, 4);
    if (activeThrusters.left) {
        noStroke();
        fill(255, 150, 0, 200);
        triangle(-4, 0, 4, 0, 
                0, random(12, 18));
    }
    pop();
    
    // Right thruster (pointing left and up)
    push();
    translate(lander.size/2, 0);
    rotate(-PI/4);  // Changed to -45 degrees
    rect(0, 0, 8, 4);
    if (activeThrusters.right) {
        noStroke();
        fill(255, 150, 0, 200);
        triangle(-4, 0, 4, 0, 
                0, random(12, 18));
    }
    pop();
    
    pop();
}

// Add these functions for the genetic algorithm

function initializePopulation() {
    population = [];
    for (let i = 0; i < POPULATION_SIZE; i++) {
        population.push(generateRandomGenome());
    }
}

function generateRandomGenome() {
    const actions = ['T', 'D', 'L', 'R'];
    let genome = '';
    for (let i = 0; i < 8; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        const duration = (Math.random() * 0.49 + 0.01).toFixed(2); // Duration between 0.01-0.5 seconds
        genome += `${action},${duration}`;
        if (i < 7) genome += ';';
    }
    return genome;
}

function evaluateFitness(genome) {
    return new Promise(resolve => {
        genomeInput.value(genome);
        resetLander();
        
        let checkInterval = setInterval(() => {
            if (lander.crashed) {
                clearInterval(checkInterval);
                
                // Get landing parameters
                const platformX = sceneParameters[currentScene].platformX;
                const distanceToTarget = Math.abs(lander.x - platformX);
                const landingSpeed = Math.sqrt(lander.vx * lander.vx + lander.vy * lander.vy);
                let landingAngle = Math.abs((lander.angle * 180 / Math.PI) % 360);
                if (landingAngle > 180) landingAngle = 360 - landingAngle;

                // Check for successful landing
                const onPlatform = distanceToTarget < 50;
                const safeSpeed = landingSpeed < 5.0;
                const safeAngle = landingAngle < 10;
                
                if (safeSpeed) {
                    // Perfect landing! Return a special high value to indicate success
                    resolve({ fitness: 10000, isSuccess: true });
                } else {
                    // Calculate regular fitness for non-perfect landings
                    let fitness = 1000;
                    
                    if (lander.y < 0) {
                        return resolve({ fitness: -1000, isSuccess: false });
                    }
                    
                    const speedScore = 2000 / (1 + landingSpeed);
                    fitness += speedScore;
                    
                    resolve({ fitness, isSuccess: false });
                }
            }
        }, 100);
    });
}

// Single point crossover, not doing so well
// function crossover(parent1, parent2) {
//     const genes1 = parent1.split(';');
//     const genes2 = parent2.split(';');
//     const crossoverPoint = Math.floor(Math.random() * 7) + 1;
    
//     const child = [...genes1.slice(0, crossoverPoint), ...genes2.slice(crossoverPoint)];
//     return child.join(';');
// }
// Uniform crossover, doing better
function crossover(parent1, parent2) {
    const genes1 = parent1.split(';');
    const genes2 = parent2.split(';');

    const child = genes1.map((gene, i) =>
        Math.random() < 0.5 ? gene : genes2[i]
    );

    return child.join(';');
}
// Mutation is too agressive
// function mutate(genome) {
//     const genes = genome.split(';');
//     const actions = ['T', 'D', 'L', 'R'];
    
//     return genes.map(gene => {
//         if (Math.random() < MUTATION_RATE) {
//             const action = actions[Math.floor(Math.random() * actions.length)];
//             const duration = (Math.random() * 1).toFixed(2);
//             return `${action},${duration}`;
//         }
//         return gene;
//     }).join(';');
// }
// Less agressive mutation
function mutate(genome) {
    const genes = genome.split(';');
    const actions = ['T', 'D', 'L', 'R'];

    return genes.map((gene, index) => {
        if (Math.random() < MUTATION_RATE) {
            const [action, duration] = gene.split(',');
            
            // Randomly decide whether to change action or duration
            if (Math.random() < 0.5) {
                // Change action
                return `${actions[Math.floor(Math.random() * actions.length)]},${duration}`;
            } else {
                // Slightly tweak duration instead of randomizing
                let newDuration = Math.max(0.01, Math.min(1, parseFloat(duration) + (Math.random() * 0.2 - 0.1))); // Small tweak
                return `${action},${newDuration.toFixed(2)}`;
            }
        }
        return gene;
    }).join(';');
}

async function trainGeneration() {
    // Initialize fitnessResults array
    let fitnessResults = [];
    
    // Evaluate fitness for each genome
    for (let i = 0; i < population.length; i++) {
        const result = await evaluateFitness(population[i]);
        
        // If we found a successful landing, stop immediately
        if (result.isSuccess) {
            bestFitness = result.fitness;
            bestGenome = population[i];
            console.log("Perfect landing found!");
            console.log(`Generation ${currentGeneration}`);
            console.log(`Best Fitness = ${bestFitness}`);
            console.log(`Best Genome = ${bestGenome}`);
            return false; // Stop training
        }
        
        fitnessResults.push({
            genome: population[i],
            fitness: result.fitness
        });
    }
    
    // Sort by fitness
    fitnessResults.sort((a, b) => b.fitness - a.fitness);
    
    // Update best genome if we found a better one
    if (fitnessResults[0].fitness > bestFitness) {
        bestFitness = fitnessResults[0].fitness;
        bestGenome = fitnessResults[0].genome;
    }
    
    // Log generation results
    console.log(`Generation ${currentGeneration}:`);
    console.log(`Best Fitness = ${bestFitness}`);
    console.log(`Best Genome = ${bestGenome}`);
    
    // Create new population starting with elites
    const newPopulation = [];
    const eliteCount = Math.floor(POPULATION_SIZE * 0.1); // 10% elites
    
    // Directly copy the elite genomes
    for (let i = 0; i < eliteCount; i++) {
        newPopulation.push(fitnessResults[i].genome);
    }
    
    // Create selection pool for parents (top 50%)
    const breedingPool = fitnessResults.slice(0, POPULATION_SIZE / 2);
    
    // Fill the rest of the population with crossover and mutation
    while (newPopulation.length < POPULATION_SIZE) {
        // Select parents from breeding pool
        const parent1 = breedingPool[Math.floor(Math.random() * breedingPool.length)].genome;
        const parent2 = breedingPool[Math.floor(Math.random() * breedingPool.length)].genome;
        
        // Create child
        let child = crossover(parent1, parent2);
        if (Math.random() < 0.2) { // 20% chance to mutate
            child = mutate(child);
        }
        newPopulation.push(child);
    }
    
    population = newPopulation;
    currentGeneration++;
    
    return currentGeneration < GENERATION_LIMIT;
}
