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
const BASE_POPULATION_SIZE = 10000;
const BASE_MUTATION_RATE = 0.1;
const BASE_GENERATION_LIMIT = 50;
let currentGeneration = 0;
let bestFitness = -Infinity;
let bestGenome = '';

// Add global variables for tracking frozen L/R genes
let hasFoundGoodAngle = false;  // Flag indicating if we've found a good landing angle
let frozenLRGenes = [];  // Will store the L/R genes that achieved good angle
let frozenLRPositions = [];  // Will store the positions of L/R genes in the genome
let genomeTemplate = [];  // Will store the entire genome template when a good angle is found

const PHYSICS_SCALE = 0.05;  
// Modified to be base values that will scale with gravity
const BASE_MAIN_THRUSTER_FORCE = 10.0;  
const BASE_SIDE_THRUSTER_FORCE = 0.05;  
// Reference gravity to scale against (Moon gravity)
const REFERENCE_GRAVITY = 1.62;

// Add scene-specific genome templates
const sceneGenomeTemplates = {
    'Moon': [
        'T,0.3;D,0.5;T,0.3;D,0.5;T,0.3;D,0.5;T,0.3',
        'D,1.0;T,0.4;D,0.2;T,0.4;D,0.2;T,0.4',
        'T,0.2;L,0.1;T,0.4;D,0.3;T,0.4;R,0.1;T,0.2'
    ],
    'Earth': [
        'T,1.0;T,1.0;D,0.5;T,0.8;D,0.3;T,0.8;T,0.5',
        'T,0.8;L,0.2;T,0.8;D,0.4;T,0.8;R,0.2;T,0.5',
        'T,1.2;D,0.3;T,1.0;D,0.3;T,0.8;D,0.3;T,0.6'
    ],
    'Mars': [
        'T,1.0;T,1.0;D,0.5;T,0.7;T,0.7;D,0.3;T,0.5',
        'T,0.7;L,0.2;T,0.7;D,0.4;T,0.7;R,0.2;T,0.7;T,0.5',
        'T,1.2;D,0.3;T,1.0;D,0.3;T,0.8;D,0.3;T,0.6'
    ],
    'Asteroid': [
        'T,0.2;D,1.0;T,0.2;D,0.5;L,0.1;D,0.5;R,0.1',
        'D,1.5;T,0.2;D,0.5;T,0.2;D,0.5;T,0.2',
        'D,0.8;L,0.1;D,0.5;T,0.2;D,0.5;R,0.1;T,0.1'
    ],
    'Custom': [
        'T,0.6;D,0.4;T,0.6;D,0.4;T,0.6;D,0.4;T,0.4',
        'T,0.8;L,0.2;T,0.7;D,0.5;T,0.7;R,0.2;T,0.5',
        'D,0.5;T,0.8;T,0.8;T,0.6;D,0.3;T,0.6;T,0.6'
    ]
};

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
    
    // Try to load saved genome for this scene
    try {
        const savedScene = localStorage.getItem('lastSuccessfulScene');
        const savedGenome = localStorage.getItem('lastSuccessfulGenome');
        
        if (savedScene === currentScene && savedGenome) {
            genomeInput.value(savedGenome);
            console.log("Loaded saved genome for", currentScene);
        }
    } catch (e) {
        console.log("No saved genome found:", e);
    }

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
        // Get parameters adjusted for current gravity
        const params = getGravityAdjustedParameters();
        console.log(`Training with adjusted parameters for ${currentScene}:`, params);
        
        initializePopulation(params.populationSize);
        currentGeneration = 0;
        bestFitness = -Infinity;
        
        while (await trainGeneration(params)) {
            // Training continues until generation limit is reached
        }
        
        // Use best genome found
        genomeInput.value(bestGenome);
        resetLander();
    });
    
    // Add a second row of buttons
    let buttonContainer2 = createDiv();
    buttonContainer2.parent(panel);
    buttonContainer2.style('display', 'flex');
    buttonContainer2.style('gap', '10px');
    buttonContainer2.style('margin-top', '10px');
    
    // Load previous success button
    let loadButton = createButton('Load Previous Success');
    loadButton.parent(buttonContainer2);
    loadButton.class('action-button');
    loadButton.mousePressed(() => {
        try {
            const savedScene = localStorage.getItem('lastSuccessfulScene');
            const savedGenome = localStorage.getItem('lastSuccessfulGenome');
            
            if (savedGenome) {
                genomeInput.value(savedGenome);
                console.log(`Loaded previously successful genome from ${savedScene}`);
                if (savedScene !== currentScene) {
                    console.log(`Warning: This genome was trained for ${savedScene}, not ${currentScene}`);
                }
                resetLander();
            } else {
                console.log("No previously successful genome found");
            }
        } catch (e) {
            console.error("Error loading genome:", e);
        }
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

    // Calculate gravity scaling factor for thruster power
    const gravity = sceneParameters[currentScene].gravity;
    let gravityScaleFactor = Math.sqrt(gravity / REFERENCE_GRAVITY);
    
    const scaledMainThrusterForce = BASE_MAIN_THRUSTER_FORCE * gravityScaleFactor;
    const scaledSideThrusterForce = BASE_SIDE_THRUSTER_FORCE * gravityScaleFactor;

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
                    lander.vy -= scaledMainThrusterForce * PHYSICS_SCALE;
                    break;
                case 'L':
                    activeThrusters.left = true;
                    lander.angularVel += scaledSideThrusterForce * PHYSICS_SCALE;
                    break;
                case 'R':
                    activeThrusters.right = true;
                    lander.angularVel -= scaledSideThrusterForce * PHYSICS_SCALE;
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
        
        // Add condition for global L/R freezing
        if (hasFoundGoodAngle) {
            console.log("OUT OF BOUNDS - But global genome template freezing is active");
            console.log("OUT OF BOUNDS - A new genome will be created using the strict template");
            console.log("OUT OF BOUNDS - Only the durations of T/D genes will be varied");
        } else {
            console.log("OUT OF BOUNDS - Genome will be completely replaced in GA");
            console.log("OUT OF BOUNDS - Landings with previously good angles/speeds will NOT have genes preserved");
        }
        
        // If out the top, make sure to mark it as such
        if (lander.y < 0) {
            lander.y = 0; // Keep at the top boundary for visualization
        }
        return;
    }

    // Check for collision with ground
    if (lander.y + lander.size/2 >= 500) {
        lander.crashed = true;
        lander.y = 500 - lander.size/2;
        
        // Calculate landing speed and angle
        let landingSpeed = Math.sqrt(lander.vx * lander.vx + lander.vy * lander.vy);
        let landingAngle = Math.abs((lander.angle * 180 / PI) % 360);
        if (landingAngle > 180) landingAngle = 360 - landingAngle;
        
        let platformX = sceneParameters[currentScene].platformX;
        let onPlatform = lander.x >= platformX - 50 && lander.x <= platformX + 50;
        
        // Landing criteria (adjusted for scaled physics)
        let safeSpeed = landingSpeed < 5.0; // Reduced safe landing speed threshold
        let safeAngle = landingAngle < 30; // Increased from 10 to 30 degrees
        
        console.log("Landing speed: " + landingSpeed.toFixed(2));
        console.log("Landing angle: " + landingAngle.toFixed(2) + "°");
        console.log("On platform: " + onPlatform);
        
        // Use the same success criteria as in evaluateFitness
        if (safeSpeed && onPlatform && safeAngle) {
            console.log("Perfect landing!");
            lander.color = [0, 255, 0];
        } else if (safeSpeed) {
            console.log("Safe landing but not perfect");
            console.log("Genome for safe landing: " + genomeInput.value());
            console.log("Missing criteria: " + 
                        (!onPlatform ? "Not on platform" : "") + 
                        (!safeAngle ? ((!onPlatform ? ", " : "") + "Angle too large") : ""));
            lander.color = [0, 180, 0];
        } else {
            console.log("Crash landing");
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

function initializePopulation(populationSize = BASE_POPULATION_SIZE) {
    population = [];
    
    // Reset global L/R freezing state when starting a new training session
    hasFoundGoodAngle = false;
    frozenLRGenes = [];
    frozenLRPositions = [];
    genomeTemplate = [];
    console.log("GLOBAL FREEZING - Reset global L/R gene freezing state and genome template for new training session");
    
    // Add scene-specific templates as a starting point
    if (sceneGenomeTemplates[currentScene]) {
        const templates = sceneGenomeTemplates[currentScene];
        for (const template of templates) {
            population.push(template);
        }
        
        // Add slight variations of the templates
        for (let i = 0; i < Math.min(20, populationSize * 0.05); i++) {
            const templateIndex = Math.floor(Math.random() * templates.length);
            const template = templates[templateIndex];
            population.push(mutate(template, 0.3)); // Higher mutation rate for variations
        }
    }
    
    // Fill the rest with random genomes
    while (population.length < populationSize) {
        population.push(generateRandomGenome());
    }
}

function generateRandomGenome() {
    const actions = ['T', 'D', 'L', 'R'];
    let genome = '';
    
    // Scale max duration based on gravity
    const gravity = sceneParameters[currentScene].gravity;
    const gravityFactor = Math.sqrt(gravity / REFERENCE_GRAVITY);
    const maxDuration = Math.min(2.0, 0.5 * gravityFactor); // Cap at 2.0 seconds
    const minDuration = 0.1 * gravityFactor; // Minimum duration also scales with gravity
    
    const numManeuvers = Math.floor(Math.random() * 3) + 6; // 6-8 maneuvers
    
    // If global L/R freezing is active, create a genome that respects it
    if (hasFoundGoodAngle) {
        console.log("RANDOM GENOME - Using strict genome template with frozen L/R genes");
        console.log(`GLOBAL FREEZING - Template length: ${genomeTemplate.length} genes`);
        
        // Create a new genome following the exact template structure
        let newGenes = [];
        
        for (let i = 0; i < genomeTemplate.length; i++) {
            const [action, duration] = genomeTemplate[i].split(',');
            
            // If this is an L/R gene, use the exact frozen value
            if (action === 'L' || action === 'R') {
                newGenes[i] = genomeTemplate[i];
                console.log(`GLOBAL FREEZING - Using exact L/R gene at position ${i}: ${genomeTemplate[i]}`);
            } else {
                // For T/D positions, keep the same action type but randomize duration
                const newDuration = (Math.random() * (maxDuration - minDuration) + minDuration).toFixed(2);
                newGenes[i] = `${action},${newDuration}`;
                console.log(`GLOBAL FREEZING - Generated new ${action} gene at position ${i}: ${newGenes[i]}`);
            }
        }
        
        return newGenes.join(';');
    }
    
    // Normal random genome generation if no global L/R freezing
    for (let i = 0; i < numManeuvers; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        const duration = (Math.random() * (maxDuration - minDuration) + minDuration).toFixed(2);
        genome += `${action},${duration}`;
        if (i < numManeuvers - 1) genome += ';';
    }
    return genome;
}

function evaluateFitness(genome) {
    return new Promise(resolve => {
        genomeInput.value(genome);
        resetLander();
        
        // Add timeout to prevent infinite simulations
        const maxSimTime = 10000; // 10 seconds max
        const startTime = millis();
        
        // Track if we've gone out of bounds during simulation
        let wentOutOfBounds = false;
        
        let checkInterval = setInterval(() => {
            // Check for out of bounds during simulation
            if (lander.x < 0 || lander.x > width || lander.y < 0) {
                wentOutOfBounds = true;
            }
            
            // Check for timeout
            if (millis() - startTime > maxSimTime) {
                clearInterval(checkInterval);
                console.log("Simulation timed out");
                // Make timeout worse than out of bounds
                resolve({ 
                    fitness: -10000, 
                    isSuccess: false,
                    landingAngle: Infinity,
                    landingSpeed: Infinity,
                    onPlatform: false,
                    hasLanded: false,
                    safeAngle: false,
                    safeSpeed: false
                });
                return;
            }
            
            if (lander.crashed) {
                clearInterval(checkInterval);
                
                // Get landing parameters
                const platformX = sceneParameters[currentScene].platformX;
                const distanceToTarget = Math.abs(lander.x - platformX);
                const landingSpeed = Math.sqrt(lander.vx * lander.vx + lander.vy * lander.vy);
                let landingAngle = Math.abs((lander.angle * 180 / Math.PI) % 360);
                if (landingAngle > 180) landingAngle = 360 - landingAngle;

                // CRITICAL FIX: Check for out-of-bounds BEFORE evaluating any other characteristics
                // This ensures out-of-bounds always takes precedence over any "good" landing characteristics
                // Make out of bounds the worst possible outcome with a much larger penalty
                if (wentOutOfBounds || lander.y < 0 || lander.x < 0 || lander.x > width) {
                    console.log("Went out of bounds - severe penalty");
                    console.log("OUT OF BOUNDS - No genes will be preserved regardless of angle or speed");
                    return resolve({ 
                        fitness: -5000, 
                        isSuccess: false,
                        landingAngle: landingAngle, // Keep the actual angle value for reference
                        landingSpeed: landingSpeed, // Keep the actual speed value for reference
                        onPlatform: false,
                        hasLanded: false,
                        safeAngle: false,  // NEVER preserve angle genes for out-of-bounds
                        safeSpeed: false   // NEVER preserve speed genes for out-of-bounds
                    });
                }
                
                // Check for successful landing - ONLY FOR NON-OUT-OF-BOUNDS landings
                const onPlatform = distanceToTarget < 50;
                const safeSpeed = landingSpeed < 5.0;
                const safeAngle = landingAngle < 30;
                
                // Flag that indicates we have landed (even if crashed)
                const hasLanded = true;
                
                // If we have a safe angle, store the L/R genes for global use
                // CRITICAL FIX: Only store L/R genes the FIRST time we find a good angle
                if (safeAngle && hasLanded && !hasFoundGoodAngle) {
                    console.log("GLOBAL FREEZING - Good landing angle detected! Freezing all L/R genes for future generations");
                    // Extract L/R genes from the genome
                    const currentGenome = genomeInput.value();
                    const genes = currentGenome.split(';');
                    
                    // Reset the frozen gene arrays
                    frozenLRGenes = [];
                    frozenLRPositions = [];
                    
                    // Store all L/R genes and their positions
                    for (let i = 0; i < genes.length; i++) {
                        const [action, duration] = genes[i].split(',');
                        if (action === 'L' || action === 'R') {
                            frozenLRGenes.push(genes[i]);
                            frozenLRPositions.push(i);
                            console.log(`GLOBAL FREEZING - Storing L/R gene at position ${i}: ${genes[i]}`);
                        }
                    }
                    
                    // Store the entire genome as a template
                    genomeTemplate = [...genes];
                    console.log("GLOBAL FREEZING - Storing entire genome structure as template");
                    console.log(`GLOBAL FREEZING - Template length: ${genomeTemplate.length} genes`);
                    console.log(`GLOBAL FREEZING - Template: ${currentGenome}`);
                    
                    // Set the global flag that we've found a good angle
                    hasFoundGoodAngle = true;
                } else if (safeAngle && hasLanded && hasFoundGoodAngle) {
                    // Log that we've found another good angle but won't update the frozen genes
                    console.log("GLOBAL FREEZING - Another good landing angle detected, but template already frozen");
                    console.log("GLOBAL FREEZING - Keeping original genome template");
                }
                
                // Perfect landing conditions - must be on the platform with safe speed and angle
                if (safeSpeed && onPlatform && safeAngle) {
                    // Double-check that we're actually on ground level
                    if (Math.abs(lander.y + lander.size/2 - 500) < 5) {
                        console.log("Perfect landing validated!");
                        resolve({ 
                            fitness: 10000, 
                            isSuccess: true,
                            landingAngle: landingAngle,
                            landingSpeed: landingSpeed,
                            onPlatform: true,
                            hasLanded: true,
                            safeAngle: true,
                            safeSpeed: true
                        });
                        return;
                    }
                }
                
                // Calculate regular fitness for non-perfect landings
                // Ensure all crash landings start with a positive base fitness
                // to always be better than out-of-bounds
                let fitness = 1000;
                
                // Add bonuses for each good aspect of landing
                    const speedScore = 2000 / (1 + landingSpeed);
                const distanceScore = onPlatform ? 2000 : 2000 / (1 + distanceToTarget/10);
                const angleScore = 1000 / (1 + landingAngle/5);
                
                // Apply more weight to critical factors based on gravity
                const gravity = sceneParameters[currentScene].gravity;
                const gravityFactor = gravity / REFERENCE_GRAVITY;
                
                // For higher gravity, speed control is more important
                const weightedSpeedScore = speedScore * (1 + 0.5 * gravityFactor);
                
                fitness += weightedSpeedScore + distanceScore + angleScore;
                
                // Even the worst crash should have a minimum fitness that's better than out-of-bounds
                fitness = Math.max(fitness, -4000);
                
                // Add explicit logging for what was good about the landing
                if (safeAngle) {
                    console.log(`Good landing angle: ${landingAngle.toFixed(2)}° - will preserve L/R genes`);
                }
                if (safeSpeed) {
                    console.log(`Good landing speed: ${landingSpeed.toFixed(2)} - will preserve T/D genes`);
                }
                
                resolve({ 
                    fitness, 
                    isSuccess: false,
                    landingAngle: landingAngle,
                    landingSpeed: landingSpeed,
                    onPlatform: onPlatform,
                    hasLanded: hasLanded,
                    safeAngle: safeAngle,
                    safeSpeed: safeSpeed
                });
            }
        }, 100);
    });
}

// Update the mutation function to strictly preserve successful elements
function mutate(genome, mutationRate = BASE_MUTATION_RATE, fitnessInfo = null) {
    const genes = genome.split(';');
    const actions = ['T', 'D', 'L', 'R'];
    const gravity = sceneParameters[currentScene].gravity;
    const gravityFactor = Math.sqrt(gravity / REFERENCE_GRAVITY);
    
    // Check if we have found a good landing angle globally
    if (hasFoundGoodAngle) {
        console.log("MUTATION - Using strict genome template with frozen L/R genes");
        
        // When global template is active, follow it strictly - same length, same actions
        let newGenes = [];
        
        // Ensure genome length matches template
        if (genes.length !== genomeTemplate.length) {
            console.log("MUTATION - Genome length doesn't match template, rebuilding from template");
            
            // Create a genome following the exact template structure
            for (let i = 0; i < genomeTemplate.length; i++) {
                const [templateAction, templateDuration] = genomeTemplate[i].split(',');
                
                // For L/R genes, use exact template value
                if (templateAction === 'L' || templateAction === 'R') {
                    newGenes[i] = genomeTemplate[i];
                } else {
                    // For T/D genes, use the same type, but allow mutation of duration
                    // Default to a random duration if outside bounds
                    const duration = i < genes.length ? genes[i].split(',')[1] : null;
                    const maxDuration = Math.min(2.0, 0.5 * gravityFactor);
                    
                    if (duration && Math.random() > mutationRate) {
                        // Keep the same duration
                        newGenes[i] = `${templateAction},${duration}`;
                    } else {
                        // Create a new duration
                        const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
                        newGenes[i] = `${templateAction},${newDuration}`;
                    }
                }
            }
            
            return newGenes.join(';');
        }
        
        // If genome length matches template, process gene by gene
        for (let i = 0; i < genes.length; i++) {
            const [action, duration] = genes[i].split(',');
            const [templateAction] = genomeTemplate[i].split(',');
            
            // If this gene type doesn't match the template, fix it
            if (action !== templateAction) {
                console.log(`MUTATION - Gene at position ${i} doesn't match template (${action} vs ${templateAction}), fixing`);
                
                if (templateAction === 'L' || templateAction === 'R') {
                    // If template says this should be an L/R gene, use exact template value
                    newGenes[i] = genomeTemplate[i];
                } else {
                    // If template says this should be a T/D gene, keep the action type but allow duration mutation
                    if (Math.random() < mutationRate) {
                        // Mutate duration
                        const maxDuration = Math.min(2.0, 0.5 * gravityFactor);
                        const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
                        newGenes[i] = `${templateAction},${newDuration}`;
                    } else {
                        // Use existing duration with correct action
                        newGenes[i] = `${templateAction},${duration}`;
                    }
                }
            } else {
                // Gene type matches template
                if (action === 'L' || action === 'R') {
                    // L/R genes are fixed exactly to template
                    newGenes[i] = genomeTemplate[i];
                } else {
                    // For T/D genes, allow duration mutation
                    if (Math.random() < mutationRate) {
                        // Mutate duration
                        const mutationSize = Math.min(0.5, 0.15 * gravityFactor);
                        let newDuration = parseFloat(duration) + (Math.random() * 2 * mutationSize - mutationSize);
                        newDuration = Math.max(0.01, Math.min(2, newDuration));
                        newGenes[i] = `${action},${newDuration.toFixed(2)}`;
                    } else {
                        // Keep unchanged
                        newGenes[i] = genes[i];
                    }
                }
            }
        }
        
        return newGenes.join(';');
    }
    
    // Check if we have found a good landing angle globally
    if (hasFoundGoodAngle) {
        console.log("MUTATION - Using globally frozen L/R genes from previous good landing");
        console.log(`GLOBAL FREEZING - These L/R genes (${frozenLRGenes.join(', ')}) are permanently frozen`);
    }
    
    // CRITICAL FIX: If fitnessInfo is null, treat it as a completely fresh genome that shouldn't 
    // preserve any historical information, BUT still respect global L/R freezing
    if (!fitnessInfo) {
        console.log("MUTATION - No fitness info provided - treating as fresh genome with no history");
        
        // If out of bounds, generate a new genome BUT maintain frozen L/R genes if available
        if (hasFoundGoodAngle) {
            console.log("MUTATION - Genome went out of bounds but we have frozen L/R genes - preserving them");
            
            // Create a new random genome first
            let newGenome = [];
            const newSize = Math.max(10, frozenLRPositions.length * 2); // Ensure adequate size for frozen genes
            
            // First fill with random genes
            for (let i = 0; i < newSize; i++) {
                // Default to random T/D genes (not L/R)
                const action = Math.random() < 0.5 ? 'T' : 'D';
                const maxDuration = Math.min(2.0, 0.5 * gravityFactor);
                const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
                newGenome[i] = `${action},${newDuration}`;
            }
            
            // Then inject the frozen L/R genes at their original positions if possible
            for (let i = 0; i < frozenLRGenes.length; i++) {
                const pos = frozenLRPositions[i];
                if (pos < newSize) {
                    console.log(`MUTATION - Injecting permanent frozen L/R gene ${frozenLRGenes[i]} at position ${pos}`);
                    newGenome[pos] = frozenLRGenes[i];
                } else {
                    // If position is beyond the new genome size, add it at the end
                    console.log(`MUTATION - Adding permanent frozen L/R gene ${frozenLRGenes[i]} at the end`);
                    newGenome.push(frozenLRGenes[i]);
                }
            }
            
            return newGenome.join(';');
        }
        
        // Apply standard mutation without any gene preservation
        const mutatedGenes = genes.map((gene) => {
            if (Math.random() < mutationRate * 1.5) {  // Increased mutation rate for exploration
            const [action, duration] = gene.split(',');
            
                // Even with no fitness info, never mutate L/R genes if we have global freezing
                if (hasFoundGoodAngle && (action === 'L' || action === 'R')) {
                    console.log(`MUTATION - Preserving permanent frozen L/R gene: ${gene}`);
                    return gene;
                }
                
                // Otherwise, generate random genes, BUT respect L/R freezing by only generating T/D
                const allowedActions = hasFoundGoodAngle ? ['T', 'D'] : actions;
                const randomAction = allowedActions[Math.floor(Math.random() * allowedActions.length)];
                const maxDuration = Math.min(2.0, 0.5 * gravityFactor);
                const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
                return `${randomAction},${newDuration}`;
            }
            return gene;
        });
        return mutatedGenes.join(';');
    }
    
    // Normal processing with fitness info
    // Check if we have landed (even if crashed) AND not out of bounds
    // Out of bounds landers should never have their genes preserved
    const hasLanded = fitnessInfo && fitnessInfo.hasLanded;
    const isOutOfBounds = fitnessInfo && fitnessInfo.fitness <= -5000; // Out of bounds penalty is -5000
    const goodAngle = fitnessInfo && fitnessInfo.safeAngle;
    const goodSpeed = fitnessInfo && fitnessInfo.safeSpeed;
    
    // If this was an out-of-bounds lander, regenerate most genes BUT preserve frozen L/R genes
    if (isOutOfBounds) {
        console.log("MUTATION - Genome went out of bounds");
        
        // If we have global L/R freezing, create a new genome but preserve L/R genes
        if (hasFoundGoodAngle) {
            console.log("MUTATION - Using globally frozen L/R genes despite out-of-bounds");
            
            // Create a new genome based on the input size but with preserved L/R genes
            let newGenome = [];
            const newSize = genes.length;
            
            // First fill with random T/D genes
            for (let i = 0; i < newSize; i++) {
                // Only use T or D for random genes
                const action = Math.random() < 0.5 ? 'T' : 'D';
                const maxDuration = Math.min(2.0, 0.5 * gravityFactor);
                const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
                newGenome[i] = `${action},${newDuration}`;
            }
            
            // Then inject the frozen L/R genes at their original positions if possible
            for (let i = 0; i < frozenLRGenes.length; i++) {
                const pos = frozenLRPositions[i];
                if (pos < newSize) {
                    console.log(`MUTATION - Injecting frozen L/R gene ${frozenLRGenes[i]} at position ${pos}`);
                    newGenome[pos] = frozenLRGenes[i];
            } else {
                    // If position is beyond the new genome size, add it at the end
                    console.log(`MUTATION - Adding frozen L/R gene ${frozenLRGenes[i]} at the end`);
                    newGenome.push(frozenLRGenes[i]);
                }
            }
            
            return newGenome.join(';');
        }
        
        // If no global L/R freezing yet, just generate a completely new random genome
        console.log("MUTATION - Completely replacing all genes (no global L/R freezing yet)");
        return generateRandomGenome();
    }
    
    // Log what we're preserving for debugging
    if (hasLanded) {
        console.log("MUTATION - Genome has landed, preserving size.");
        if (goodAngle) {
            console.log("MUTATION - Good angle detected, COMPLETELY FREEZING ALL L/R genes.");
        }
        if (goodSpeed) {
            console.log("MUTATION - Good speed detected, COMPLETELY FREEZING ALL T/D genes.");
        }
    }
    
    // If global L/R freezing is active, never modify L/R genes regardless of this genome's performance
    if (hasFoundGoodAngle) {
        console.log("MUTATION - Global L/R freezing active - never modifying L/R genes");
    }
    
    // NEVER add or remove genes if we've landed at all
    if (!hasLanded) {
        // Increase gene addition chance for higher gravity (more maneuvers needed)
        const addChance = Math.min(0.2, 0.1 * gravityFactor);
        
        // Add new genes with higher probability in high gravity environments
        if (genes.length < 12 && Math.random() < addChance) {
            // If global L/R freezing is active, only add T or D genes
            const allowedActions = hasFoundGoodAngle ? ['T', 'D'] : actions;
            const action = allowedActions[Math.floor(Math.random() * allowedActions.length)];
            const maxDuration = Math.min(2.0, 0.5 * gravityFactor);
            const duration = (Math.random() * maxDuration + 0.1).toFixed(2);
            genes.push(`${action},${duration}`);
        }
        
        // Remove gene logic - less likely to remove genes in high gravity
        // BUT never remove L/R genes if global freezing is active
        if (genes.length > 4 && Math.random() < 0.05 / gravityFactor) {
            // Find a gene that isn't a frozen L/R gene
            let canRemove = false;
            let indexToRemove = -1;
            let attempts = 0;
            const maxAttempts = genes.length;
            
            while (!canRemove && attempts < maxAttempts) {
                indexToRemove = Math.floor(Math.random() * genes.length);
                const [action] = genes[indexToRemove].split(',');
                
                // Never remove L/R genes if global freezing is active
                if (!(hasFoundGoodAngle && (action === 'L' || action === 'R'))) {
                    canRemove = true;
                }
                attempts++;
            }
            
            // Only remove if we found a suitable gene
            if (canRemove) {
                genes.splice(indexToRemove, 1);
            }
        }
    }

    // For landed genomes, apply a strict freeze based on landing characteristics
    if (hasLanded) {
        // Prepare the mutated genes array with copies of originals as default
        const mutatedGenes = [...genes]; 
        
        // Create lists of allowed action types based on landing characteristics
        const allowedActions = [];
        
        // If angle is good, only allow mutating T/D genes
        if (goodAngle) {
            allowedActions.push('T', 'D');
            console.log("MUTATION - Allowing only T/D genes to be mutated");
        }
        
        // If speed is good, only allow mutating L/R genes
        if (goodSpeed) {
            // But if global L/R freezing is active, don't allow L/R mutations regardless
            if (!hasFoundGoodAngle) {
                allowedActions.push('L', 'R');
                console.log("MUTATION - Allowing only L/R genes to be mutated");
            } else {
                console.log("MUTATION - Global L/R freezing overrides local speed preservation");
            }
        }
        
        // If both angle and speed are good, no mutations should occur
        if (goodAngle && goodSpeed) {
            console.log("MUTATION - Both angle and speed are good, freezing ALL genes");
            return genes.join(';'); // Return unchanged genome
        }
        
        // If neither angle nor speed are good, allow all mutations except frozen L/R genes
        if (!goodAngle && !goodSpeed) {
            // If global L/R freezing is active, only allow T/D mutations
            if (hasFoundGoodAngle) {
                allowedActions.push('T', 'D');
                console.log("MUTATION - Neither angle nor speed are good, but L/R genes globally frozen - only T/D mutations allowed");
            } else {
                allowedActions.push('T', 'D', 'L', 'R');
                console.log("MUTATION - Neither angle nor speed are good, all genes can be mutated");
            }
        }
        
        // Only mutate genes that are allowed to be changed
        for (let i = 0; i < genes.length; i++) {
            const [action, duration] = genes[i].split(',');
            
            // STRICT FREEZE: If action type is not in allowed list, preserve it completely
            // Additionally, NEVER mutate L/R genes if global freezing is active
            const isGloballyFrozen = hasFoundGoodAngle && (action === 'L' || action === 'R');
            const canMutate = !isGloballyFrozen && allowedActions.includes(action) && Math.random() < mutationRate;
            
            if (canMutate) {
                // Only change duration of allowed genes, never the action type
                const mutationSize = Math.min(0.5, 0.15 * gravityFactor);
                let newDuration = parseFloat(duration) + (Math.random() * 2 * mutationSize - mutationSize);
                newDuration = Math.max(0.01, Math.min(2, newDuration));
                console.log(`MUTATION - Modified duration for gene at position ${i}: ${action},${duration} -> ${action},${newDuration.toFixed(2)}`);
                mutatedGenes[i] = `${action},${newDuration.toFixed(2)}`;
            } else {
                console.log(`MUTATION - Preserved gene at position ${i}: ${genes[i]}`);
            }
        }
        
        return mutatedGenes.join(';');
    }
    
    // For non-landed genomes, perform normal mutation
    const mutatedGenes = genes.map((gene, index) => {
        if (Math.random() < mutationRate) {
            const [action, duration] = gene.split(',');
            
            // NEVER mutate L/R genes if global freezing is active
            if (hasFoundGoodAngle && (action === 'L' || action === 'R')) {
                console.log(`MUTATION - Globally frozen L/R gene preserved: ${gene}`);
                return gene;
            }
            
            const durationChangeChance = Math.min(0.8, 0.5 * gravityFactor);
            
            if (Math.random() < durationChangeChance) {
                const mutationSize = Math.min(0.5, 0.15 * gravityFactor);
                let newDuration = parseFloat(duration) + (Math.random() * 2 * mutationSize - mutationSize);
                newDuration = Math.max(0.01, Math.min(2, newDuration));
                return `${action},${newDuration.toFixed(2)}`;
            } else {
                // Otherwise full random change (only for non-landed genomes)
                // But respect global L/R freezing by only generating T/D when active
                const allowedActions = hasFoundGoodAngle ? ['T', 'D'] : actions;
                return `${allowedActions[Math.floor(Math.random() * allowedActions.length)]},${duration}`;
            }
        }
        return gene;
    });
    
    return mutatedGenes.join(';');
}

// Update crossover to strictly preserve successful gene patterns
function crossover(parent1, parent2, fitnessInfo1 = null, fitnessInfo2 = null) {
    const genes1 = parent1.split(';');
    const genes2 = parent2.split(';');
    
    // Check if we have global L/R freezing active
    if (hasFoundGoodAngle) {
        console.log("CROSSOVER - Global genome template active - using strict template");
        
        // Create a new genome that strictly follows the template
        let childGenes = [];
        
        for (let i = 0; i < genomeTemplate.length; i++) {
            const [templateAction, templateDuration] = genomeTemplate[i].split(',');
            
            // L/R genes are always fixed exactly as in the template
            if (templateAction === 'L' || templateAction === 'R') {
                childGenes[i] = genomeTemplate[i];
                console.log(`CROSSOVER - Using exact template L/R gene at position ${i}: ${genomeTemplate[i]}`);
            } else {
                // For T/D genes, crossover from parents (if position exists) or use template
                const parent1HasGene = i < genes1.length;
                const parent2HasGene = i < genes2.length;
                
                // If both parents have genes at this position, do a crossover
                if (parent1HasGene && parent2HasGene) {
                    const [action1, duration1] = genes1[i].split(',');
                    const [action2, duration2] = genes2[i].split(',');
                    
                    // If either parent has correct action type, use it
                    const validParent1 = action1 === templateAction;
                    const validParent2 = action2 === templateAction;
                    
                    if (validParent1 && validParent2) {
                        // Both parents have correct type, choose one randomly
                        const useParent1 = Math.random() < 0.5;
                        childGenes[i] = useParent1 ? genes1[i] : genes2[i];
                        console.log(`CROSSOVER - Using ${useParent1 ? 'parent1' : 'parent2'}'s gene at position ${i}: ${childGenes[i]}`);
                    } else if (validParent1) {
                        // Only parent1 has correct type
                        childGenes[i] = genes1[i];
                        console.log(`CROSSOVER - Using parent1's gene at position ${i}: ${childGenes[i]}`);
                    } else if (validParent2) {
                        // Only parent2 has correct type
                        childGenes[i] = genes2[i];
                        console.log(`CROSSOVER - Using parent2's gene at position ${i}: ${childGenes[i]}`);
                    } else {
                        // Neither parent has correct type, use template with random duration
                        const maxDuration = Math.min(2.0, 0.5 * Math.sqrt(sceneParameters[currentScene].gravity / REFERENCE_GRAVITY));
                        const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
                        childGenes[i] = `${templateAction},${newDuration}`;
                        console.log(`CROSSOVER - Neither parent has correct type, using template with random duration: ${childGenes[i]}`);
                    }
                } else if (parent1HasGene) {
                    // Only parent1 has a gene at this position
                    const [action1, duration1] = genes1[i].split(',');
                    
                    if (action1 === templateAction) {
                        // If correct type, use it
                        childGenes[i] = genes1[i];
                    } else {
                        // Otherwise create from template
                        const maxDuration = Math.min(2.0, 0.5 * Math.sqrt(sceneParameters[currentScene].gravity / REFERENCE_GRAVITY));
                        const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
                        childGenes[i] = `${templateAction},${newDuration}`;
                    }
                } else if (parent2HasGene) {
                    // Only parent2 has a gene at this position
                    const [action2, duration2] = genes2[i].split(',');
                    
                    if (action2 === templateAction) {
                        // If correct type, use it
                        childGenes[i] = genes2[i];
                    } else {
                        // Otherwise create from template
                        const maxDuration = Math.min(2.0, 0.5 * Math.sqrt(sceneParameters[currentScene].gravity / REFERENCE_GRAVITY));
                        const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
                        childGenes[i] = `${templateAction},${newDuration}`;
                    }
                } else {
                    // Neither parent has a gene at this position, create from template
                    const maxDuration = Math.min(2.0, 0.5 * Math.sqrt(sceneParameters[currentScene].gravity / REFERENCE_GRAVITY));
                    const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
                    childGenes[i] = `${templateAction},${newDuration}`;
                }
            }
        }
        
        return childGenes.join(';');
    }
    
    // Ensure we have genes to work with
    if (genes1.length < 2 || genes2.length < 2) {
        return genes1.length > genes2.length ? parent1 : parent2;
    }
    
    // Check for out-of-bounds cases - never preserve these genes
    const parent1OutOfBounds = fitnessInfo1 && fitnessInfo1.fitness <= -5000;
    const parent2OutOfBounds = fitnessInfo2 && fitnessInfo2.fitness <= -5000;
    
    // Special handling for out-of-bounds cases
    if (parent1OutOfBounds && parent2OutOfBounds) {
        console.log("CROSSOVER - Both parents went out of bounds");
        
        // Even with both parents out of bounds, preserve frozen L/R genes if we have them
        if (hasFoundGoodAngle) {
            console.log("CROSSOVER - Creating new genome but preserving frozen L/R genes");
            
            // Create a new base genome with only T/D genes
            let newGenome = [];
            const newSize = Math.max(10, frozenLRPositions.length * 2); // Ensure adequate size
            
            // Fill with random T/D genes
            for (let i = 0; i < newSize; i++) {
                const action = Math.random() < 0.5 ? 'T' : 'D';
                const maxDuration = Math.min(2.0, 0.5 * Math.sqrt(sceneParameters[currentScene].gravity / REFERENCE_GRAVITY));
                const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
                newGenome[i] = `${action},${newDuration}`;
            }
            
            // Then inject the frozen L/R genes at their original positions
            for (let i = 0; i < frozenLRGenes.length; i++) {
                const pos = frozenLRPositions[i];
                if (pos < newSize) {
                    console.log(`CROSSOVER - Injecting frozen L/R gene ${frozenLRGenes[i]} at position ${pos}`);
                    newGenome[pos] = frozenLRGenes[i];
                } else {
                    console.log(`CROSSOVER - Adding frozen L/R gene ${frozenLRGenes[i]} at the end`);
                    newGenome.push(frozenLRGenes[i]);
                }
            }
            
            return newGenome.join(';');
        }
        
        // If no global L/R freezing, create a completely new random genome
        console.log("CROSSOVER - Both parents went out of bounds, creating COMPLETELY NEW random genome");
        return generateRandomGenome();
    } else if (parent1OutOfBounds) {
        if (hasFoundGoodAngle) {
            console.log("CROSSOVER - Parent 1 out of bounds, using parent 2 but enforcing frozen L/R genes");
            // Start with parent 2's genes
            let newGenome = [...genes2];
            
            // Replace any L/R genes with the frozen versions at the right positions
            for (let i = 0; i < frozenLRGenes.length; i++) {
                const pos = frozenLRPositions[i];
                if (pos < newGenome.length) {
                    const [action] = newGenome[pos].split(',');
                    // Only replace if this position has a gene but it's not an L/R gene from parent2
                    if (!(action === 'L' || action === 'R')) {
                        console.log(`CROSSOVER - Replacing gene at position ${pos} with frozen L/R gene: ${frozenLRGenes[i]}`);
                        newGenome[pos] = frozenLRGenes[i];
                    }
                } else {
                    // If position is beyond parent2's genome, add it
                    console.log(`CROSSOVER - Adding frozen L/R gene to parent 2's genome: ${frozenLRGenes[i]}`);
                    newGenome.push(frozenLRGenes[i]);
                }
            }
            
            return newGenome.join(';');
        } else {
            console.log("CROSSOVER - Parent 1 went out of bounds, using ONLY parent 2's genes");
            return parent2;
        }
    } else if (parent2OutOfBounds) {
        if (hasFoundGoodAngle) {
            console.log("CROSSOVER - Parent 2 out of bounds, using parent 1 but enforcing frozen L/R genes");
            // Start with parent 1's genes
            let newGenome = [...genes1];
            
            // Replace any L/R genes with the frozen versions at the right positions
            for (let i = 0; i < frozenLRGenes.length; i++) {
                const pos = frozenLRPositions[i];
                if (pos < newGenome.length) {
                    const [action] = newGenome[pos].split(',');
                    // Only replace if this position has a gene but it's not an L/R gene from parent1
                    if (!(action === 'L' || action === 'R')) {
                        console.log(`CROSSOVER - Replacing gene at position ${pos} with frozen L/R gene: ${frozenLRGenes[i]}`);
                        newGenome[pos] = frozenLRGenes[i];
                    }
                } else {
                    // If position is beyond parent1's genome, add it
                    console.log(`CROSSOVER - Adding frozen L/R gene to parent 1's genome: ${frozenLRGenes[i]}`);
                    newGenome.push(frozenLRGenes[i]);
                }
            }
            
            return newGenome.join(';');
        } else {
            console.log("CROSSOVER - Parent 2 went out of bounds, using ONLY parent 1's genes");
            return parent1;
        }
    }
    
    // Regular crossover for non-out-of-bounds parents
    // But with global L/R gene freezing if active
    if (hasFoundGoodAngle) {
        console.log("CROSSOVER - Using regular crossover with global L/R gene freezing");
        
        // Choose base genome size (prefer successful landings)
        let childGenes = [];
        let baseGenomeSize = Math.max(genes1.length, genes2.length);
        
        // First, perform regular crossover but only for T/D genes
        // For common length genes
        const commonLength = Math.min(genes1.length, genes2.length);
        
        // Use standard two-point crossover
        const maxPoint = commonLength;
        let point1 = Math.floor(Math.random() * (maxPoint - 1)) + 1;
        let point2 = Math.floor(Math.random() * (maxPoint - 1)) + 1;
        
        // Make sure we get different points
        while (point1 === point2 && maxPoint > 2) {
            point2 = Math.floor(Math.random() * (maxPoint - 1)) + 1;
        }
        
        // Ensure point1 is less than point2
        if (point1 > point2) {
            [point1, point2] = [point2, point1];
        }
        
        console.log(`CROSSOVER - Using crossover points: ${point1} and ${point2}`);
        
        // Create child using crossover but never touching L/R genes
        for (let i = 0; i < baseGenomeSize; i++) {
            // If we're beyond the common length, take genes from the longer parent
            if (i >= commonLength) {
                if (i < genes1.length) {
                    const [action] = genes1[i].split(',');
                    // For L/R genes, always use the frozen version
                    if (action === 'L' || action === 'R') {
                        // Check if this position matches a frozen L/R gene position
                        const frozenIndex = frozenLRPositions.indexOf(i);
                        if (frozenIndex !== -1) {
                            childGenes[i] = frozenLRGenes[frozenIndex];
                            console.log(`CROSSOVER - Using frozen L/R gene at position ${i}: ${frozenLRGenes[frozenIndex]}`);
                        } else {
                            // Otherwise keep parent's L/R gene
                            childGenes[i] = genes1[i];
                            console.log(`CROSSOVER - Keeping parent 1's L/R gene at position ${i}: ${genes1[i]}`);
                        }
                    } else {
                        // For T/D genes, use the parent's gene
                        childGenes[i] = genes1[i];
                    }
                } else if (i < genes2.length) {
                    const [action] = genes2[i].split(',');
                    // For L/R genes, always use the frozen version
                    if (action === 'L' || action === 'R') {
                        // Check if this position matches a frozen L/R gene position
                        const frozenIndex = frozenLRPositions.indexOf(i);
                        if (frozenIndex !== -1) {
                            childGenes[i] = frozenLRGenes[frozenIndex];
                            console.log(`CROSSOVER - Using frozen L/R gene at position ${i}: ${frozenLRGenes[frozenIndex]}`);
                        } else {
                            // Otherwise keep parent's L/R gene
                            childGenes[i] = genes2[i];
                            console.log(`CROSSOVER - Keeping parent 2's L/R gene at position ${i}: ${genes2[i]}`);
                        }
                    } else {
                        // For T/D genes, use the parent's gene
                        childGenes[i] = genes2[i];
                    }
                }
                continue;
            }
            
            // Handle genes within common length using crossover
            // Determine which parent gene to use based on crossover points
            const useParent1 = i < point1 || i >= point2;
            const sourceGene = useParent1 ? genes1[i] : genes2[i];
            const [action] = sourceGene.split(',');
            
            // If this is an L/R gene, check if we have a frozen version to use instead
            if (action === 'L' || action === 'R') {
                // Check if this position matches a frozen L/R gene position
                const frozenIndex = frozenLRPositions.indexOf(i);
                if (frozenIndex !== -1) {
                    childGenes[i] = frozenLRGenes[frozenIndex];
                    console.log(`CROSSOVER - Using frozen L/R gene at position ${i}: ${frozenLRGenes[frozenIndex]}`);
                } else {
                    // If no frozen gene for this position, use the source parent's gene
                    childGenes[i] = sourceGene;
                    console.log(`CROSSOVER - Using parent ${useParent1 ? '1' : '2'}'s L/R gene at position ${i}: ${sourceGene}`);
                }
            } else {
                // For T/D genes, use normal crossover logic
                childGenes[i] = sourceGene;
            }
        }
        
        // Finally, ensure all frozen L/R genes are included somewhere in the child genome
        // We may need to add some at the end if their positions weren't in the child
        for (let i = 0; i < frozenLRGenes.length; i++) {
            const pos = frozenLRPositions[i];
            // If this position wasn't included in the child or if the child already has an L/R gene there
            if (pos >= childGenes.length) {
                console.log(`CROSSOVER - Adding missing frozen L/R gene at the end: ${frozenLRGenes[i]}`);
                childGenes.push(frozenLRGenes[i]);
            }
        }
        
        return childGenes.join(';');
    }
    
    // Normal cases - proceed with regular landing check
    const parent1HasLanded = fitnessInfo1 && fitnessInfo1.hasLanded;
    const parent2HasLanded = fitnessInfo2 && fitnessInfo2.hasLanded;
    const parent1HasGoodAngle = fitnessInfo1 && fitnessInfo1.safeAngle;
    const parent2HasGoodAngle = fitnessInfo2 && fitnessInfo2.safeAngle;
    const parent1HasGoodSpeed = fitnessInfo1 && fitnessInfo1.safeSpeed;
    const parent2HasGoodSpeed = fitnessInfo2 && fitnessInfo2.safeSpeed;
    
    // If either parent has landed, use strict gene-by-gene crossover with freezing
    if (parent1HasLanded || parent2HasLanded) {
        console.log("CROSSOVER - Using strict gene-by-gene preservation with freezing for landed parents");
        
        // Detailed logging of parent characteristics for debugging
        if (parent1HasGoodAngle) console.log("CROSSOVER - Parent 1 has good angle - will PRESERVE ALL its L/R genes");
        if (parent1HasGoodSpeed) console.log("CROSSOVER - Parent 1 has good speed - will PRESERVE ALL its T/D genes");
        if (parent2HasGoodAngle) console.log("CROSSOVER - Parent 2 has good angle - will PRESERVE ALL its L/R genes");
        if (parent2HasGoodSpeed) console.log("CROSSOVER - Parent 2 has good speed - will PRESERVE ALL its T/D genes");
        
        // Find the parent with best angle and best speed (if any)
        const bestAngleParent = parent1HasGoodAngle ? 1 : (parent2HasGoodAngle ? 2 : 0);
        const bestSpeedParent = parent1HasGoodSpeed ? 1 : (parent2HasGoodSpeed ? 2 : 0);
        
        // Log which parent has the best characteristics
        if (bestAngleParent) {
            console.log(`CROSSOVER - Parent ${bestAngleParent} has the good angle - using ALL its L/R genes`);
        }
        if (bestSpeedParent) {
            console.log(`CROSSOVER - Parent ${bestSpeedParent} has the good speed - using ALL its T/D genes`);
        }
        
        // Choose base genome size (prefer successful landings)
        let baseGenomeSize;
        if (parent1HasLanded && !parent2HasLanded) {
            baseGenomeSize = genes1.length;
            console.log(`CROSSOVER - Using parent 1's genome size (${baseGenomeSize}) as base`);
        } else if (parent2HasLanded && !parent1HasLanded) {
            baseGenomeSize = genes2.length;
            console.log(`CROSSOVER - Using parent 2's genome size (${baseGenomeSize}) as base`);
        } else {
            // Both or neither landed - use the longer one
            baseGenomeSize = Math.max(genes1.length, genes2.length);
            console.log(`CROSSOVER - Using maximum genome size (${baseGenomeSize}) as base`);
        }
        
        // Create child by combining the best characteristics from each parent
        let childGenes = [];
        
        // Process all genes up to the length of the shorter parent
        const commonLength = Math.min(genes1.length, genes2.length);
        
        // Build the child genome using the COMPLETE FREEZE approach
        for (let i = 0; i < baseGenomeSize; i++) {
            // If we've gone beyond common length, use genes from the longer parent
            if (i >= commonLength) {
                // Take genes from the parent that has the longer genome
                const sourceGene = i < genes1.length ? genes1[i] : genes2[i];
                childGenes.push(sourceGene);
                console.log(`CROSSOVER - Position ${i}: Using gene from longer parent: ${sourceGene}`);
                continue;
            }
            
            // Within common length, apply the strict freezing rules
            const [action1] = genes1[i].split(',');
            const [action2] = genes2[i].split(',');
            
            // Complete freeze: if either parent has good angle, use its L/R genes without modification
            if ((action1 === 'L' || action1 === 'R') && bestAngleParent === 1) {
                console.log(`CROSSOVER - Position ${i}: FREEZING L/R gene from parent 1: ${genes1[i]}`);
                childGenes.push(genes1[i]);
            }
            else if ((action2 === 'L' || action2 === 'R') && bestAngleParent === 2) {
                console.log(`CROSSOVER - Position ${i}: FREEZING L/R gene from parent 2: ${genes2[i]}`);
                childGenes.push(genes2[i]);
            }
            // Complete freeze: if either parent has good speed, use its T/D genes without modification
            else if ((action1 === 'T' || action1 === 'D') && bestSpeedParent === 1) {
                console.log(`CROSSOVER - Position ${i}: FREEZING T/D gene from parent 1: ${genes1[i]}`);
                childGenes.push(genes1[i]);
            }
            else if ((action2 === 'T' || action2 === 'D') && bestSpeedParent === 2) {
                console.log(`CROSSOVER - Position ${i}: FREEZING T/D gene from parent 2: ${genes2[i]}`);
                childGenes.push(genes2[i]);
            }
            // For genes where neither parent has good characteristics, use the one with higher fitness
            else {
                const betterFitness = fitnessInfo1 && fitnessInfo2 && 
                                      fitnessInfo1.fitness > fitnessInfo2.fitness;
                
                const sourceGene = betterFitness ? genes1[i] : genes2[i];
                const sourceParent = betterFitness ? 1 : 2;
                
                console.log(`CROSSOVER - Position ${i}: Using gene from parent ${sourceParent} based on fitness: ${sourceGene}`);
                childGenes.push(sourceGene);
            }
        }
        
        const childGenome = childGenes.join(';');
        console.log(`CROSSOVER - Created child with frozen genes: ${childGenome}`);
        return childGenome;
    }
    
    // If neither parent has landed, use regular two-point crossover
    console.log("CROSSOVER - Using standard two-point crossover (no landing detected)");
    const maxPoint = Math.min(genes1.length, genes2.length);
    let point1 = Math.floor(Math.random() * (maxPoint - 1)) + 1;
    let point2 = Math.floor(Math.random() * (maxPoint - 1)) + 1;
    
    // Make sure we get different points
    while (point1 === point2 && maxPoint > 2) {
        point2 = Math.floor(Math.random() * (maxPoint - 1)) + 1;
    }
    
    // Ensure point1 is less than point2
    if (point1 > point2) {
        [point1, point2] = [point2, point1];
    }
    
    console.log(`CROSSOVER - Standard crossover points: ${point1} and ${point2}`);
    
    // Create child using traditional crossover
    let child = [];
    for (let i = 0; i < maxPoint; i++) {
        if (i < point1 || i >= point2) {
            child.push(genes1[i]);
        } else {
            child.push(genes2[i]);
        }
    }
    
    // Add any remaining genes from the longer parent
    if (genes1.length > maxPoint) {
        child = child.concat(genes1.slice(maxPoint));
    } else if (genes2.length > maxPoint) {
        child = child.concat(genes2.slice(maxPoint));
    }
    
    return child.join(';');
}

// Update trainGeneration to use the enhanced crossover and mutation with fitness info
async function trainGeneration(params = { populationSize: BASE_POPULATION_SIZE, mutationRate: BASE_MUTATION_RATE, generationLimit: BASE_GENERATION_LIMIT }) {
    // Initialize fitnessResults array
    let fitnessResults = [];
    
    console.log(`Generation ${currentGeneration} - Evaluating ${population.length} genomes with gravity ${sceneParameters[currentScene].gravity}m/s²`);
    
    // Evaluate fitness for each genome
    for (let i = 0; i < population.length; i++) {
        const result = await evaluateFitness(population[i]);
        
        // If we found a successful landing, validate it multiple times to be sure
        if (result.isSuccess) {
            console.log("Potential perfect landing found, validating...");
            
            // Perform validation attempts to ensure consistent success
            let validationSuccesses = 0;
            const VALIDATION_ATTEMPTS = 3;
            
            for (let j = 0; j < VALIDATION_ATTEMPTS; j++) {
                console.log(`Validation attempt ${j+1}/${VALIDATION_ATTEMPTS}...`);
                const validationResult = await evaluateFitness(population[i]);
                if (validationResult.isSuccess) {
                    validationSuccesses++;
                }
            }
            
            // Require at least 2 validations to pass (more lenient)
            if (validationSuccesses >= 2) {
            bestFitness = result.fitness;
            bestGenome = population[i];
                console.log(`Perfect landing confirmed! (${validationSuccesses}/${VALIDATION_ATTEMPTS} successes)`);
            console.log(`Generation ${currentGeneration}`);
            console.log(`Best Fitness = ${bestFitness}`);
            console.log(`Best Genome = ${bestGenome}`);
                
                // Save this genome to localStorage for future use
                try {
                    localStorage.setItem('lastSuccessfulGenome', bestGenome);
                    localStorage.setItem('lastSuccessfulScene', currentScene);
                    console.log("Genome saved to localStorage");
                } catch (e) {
                    console.error("Could not save genome to localStorage:", e);
                }
                
                return false; // Stop training
            } else {
                console.log(`Perfect landing validation failed (${validationSuccesses}/${VALIDATION_ATTEMPTS} successes), continuing training...`);
                // For genomes that almost made it, give them a significantly higher fitness to encourage exploration
                const nearPerfectBoostFactor = 1.5 + (validationSuccesses * 0.5); // Boost based on how many validations passed
                console.log(`Applying near-perfect boost factor: ${nearPerfectBoostFactor.toFixed(2)}x`);
        
        fitnessResults.push({
            genome: population[i],
                    fitness: result.fitness * nearPerfectBoostFactor, // Much higher boost for near-perfect landings
                    fitnessInfo: result // Store the detailed fitness info for smart mutation
                });
                
                // If at least one validation passed, make multiple copies in the results
                // to increase chances of selection for breeding
                if (validationSuccesses > 0) {
                    const copies = validationSuccesses + 1; // 1 or 2 extra copies based on validation success
                    console.log(`Adding ${copies} extra copies to breeding pool`);
                    
                    for (let k = 0; k < copies; k++) {
                        fitnessResults.push({
                            genome: population[i],
                            fitness: result.fitness * nearPerfectBoostFactor,
                            fitnessInfo: result
                        });
                    }
                }
            }
        } else {
            fitnessResults.push({
                genome: population[i],
                fitness: result.fitness,
                fitnessInfo: result
            });
        }
        
        // Log progress every 100 evaluations
        if (i % 100 === 0 && i > 0) {
            console.log(`Evaluated ${i}/${population.length} genomes...`);
        }
    }
    
    // Sort by fitness
    fitnessResults.sort((a, b) => b.fitness - a.fitness);
    
    // Log landing quality stats for top genomes
    console.log("Top genome landing stats:");
    for (let i = 0; i < Math.min(5, fitnessResults.length); i++) {
        const info = fitnessResults[i].fitnessInfo;
        console.log(`#${i+1}: Fitness ${fitnessResults[i].fitness.toFixed(2)}, Angle: ${info.landingAngle.toFixed(2)}°, Speed: ${info.landingSpeed.toFixed(2)}, On Platform: ${info.onPlatform}`);
    }
    
    // Update best genome if we found a better one
    if (fitnessResults[0].fitness > bestFitness) {
        bestFitness = fitnessResults[0].fitness;
        bestGenome = fitnessResults[0].genome;
    }
    
    // Calculate average fitness
    const avgFitness = fitnessResults.reduce((sum, result) => sum + result.fitness, 0) / fitnessResults.length;
    
    // Log generation results
    console.log(`Generation ${currentGeneration} completed:`);
    console.log(`Best Fitness = ${bestFitness.toFixed(2)}`);
    console.log(`Average Fitness = ${avgFitness.toFixed(2)}`);
    console.log(`Best Genome = ${bestGenome}`);
    
    // Adaptive elitism based on gravity and current generation
    const gravity = sceneParameters[currentScene].gravity;
    const gravityFactor = gravity / REFERENCE_GRAVITY;
    const progressFactor = currentGeneration / params.generationLimit;
    
    // More elites for higher gravity scenarios, and more elites as generations progress
    const elitePercentage = Math.min(0.25, 0.1 + (0.05 * gravityFactor) + (0.1 * progressFactor));
    const eliteCount = Math.max(2, Math.floor(params.populationSize * elitePercentage));
    
    console.log(`Using elite percentage: ${(elitePercentage*100).toFixed(1)}% (${eliteCount} genomes)`);
    
    // Create new population starting with elites
    const newPopulation = [];
    
    // Directly copy the elite genomes
    for (let i = 0; i < eliteCount && i < fitnessResults.length; i++) {
        newPopulation.push(fitnessResults[i].genome);
    }
    
    // Create a weighted selection pool with emphasis on better genomes
    const breedingPool = [];
    const topHalf = Math.ceil(fitnessResults.length / 2);
    
    for (let i = 0; i < topHalf; i++) {
        // Add multiple copies of better genomes to increase selection probability
        const copies = Math.max(1, Math.floor(10 * (1 - i/topHalf))); 
        for (let j = 0; j < copies; j++) {
            breedingPool.push(i); // Store the index in fitnessResults instead of the genome
        }
    }
    
    // Fill the rest of the population with crossover and mutation
    while (newPopulation.length < params.populationSize) {
        // Select parents from breeding pool
        const parent1Index = breedingPool[Math.floor(Math.random() * breedingPool.length)];
        const parent2Index = breedingPool[Math.floor(Math.random() * breedingPool.length)];
        
        const parent1 = fitnessResults[parent1Index].genome;
        const parent2 = fitnessResults[parent2Index].genome;
        const fitnessInfo1 = fitnessResults[parent1Index].fitnessInfo;
        const fitnessInfo2 = fitnessResults[parent2Index].fitnessInfo;
        
        // Define out-of-bounds checks up front
        const parent1OutOfBounds = fitnessInfo1 && fitnessInfo1.fitness <= -5000;
        const parent2OutOfBounds = fitnessInfo2 && fitnessInfo2.fitness <= -5000;
        
        // Create child with smart crossover using fitness info
        let child = crossover(parent1, parent2, fitnessInfo1, fitnessInfo2);
        
        // Higher mutation chance for higher gravity environments
        const mutationChance = Math.min(0.5, 0.2 + (0.1 * gravityFactor));
        if (Math.random() < mutationChance) {
            // CRITICAL FIX: Check if child was created from out-of-bounds parents
            // If crossover resulted in a completely new genome (because both parents were out of bounds)
            // or if child is identical to either parent who went out of bounds,
            // we need to generate a completely new mutated genome without preserving anything
            const isFromOutOfBounds = 
                (parent1OutOfBounds && parent2OutOfBounds) || 
                (parent1OutOfBounds && child === parent2) || 
                (parent2OutOfBounds && child === parent1);
                
            if (isFromOutOfBounds) {
                // For genomes that came from out-of-bounds parents, apply normal mutation
                // without any special preservation - don't pass any fitnessInfo
                if (hasFoundGoodAngle) {
                    console.log("Child came from out-of-bounds parent(s) - but global template freezing is active");
                    console.log("Genome structure and L/R genes will be strictly preserved per template");
                    // Pass null fitnessInfo but the global freezing will still preserve the template
                    child = mutate(child, params.mutationRate, null);
                } else {
                    console.log("Child came from out-of-bounds parent(s) - not preserving any genes in mutation");
                    child = mutate(child, params.mutationRate, null);
                }
            } else {
                // Normal case: Use the better parent's fitness info for mutation guidance
                // as long as that parent didn't go out of bounds
                let betterFitnessInfo = null;
                
                if (!parent1OutOfBounds && !parent2OutOfBounds) {
                    // If neither parent went out of bounds, use the one with better fitness
                    betterFitnessInfo = fitnessInfo1.fitness > fitnessInfo2.fitness ? fitnessInfo1 : fitnessInfo2;
                } else if (!parent1OutOfBounds) {
                    // Only use parent1's info if it didn't go out of bounds
                    betterFitnessInfo = fitnessInfo1;
                } else if (!parent2OutOfBounds) {
                    // Only use parent2's info if it didn't go out of bounds
                    betterFitnessInfo = fitnessInfo2;
                }
                
                child = mutate(child, params.mutationRate, betterFitnessInfo);
            }
        }
        
        newPopulation.push(child);
    }
    
    population = newPopulation;
    currentGeneration++;
    
    return currentGeneration < params.generationLimit;
}

// Add these functions to adjust GA parameters based on gravity
function getGravityAdjustedParameters() {
    const gravity = sceneParameters[currentScene].gravity;
    const gravityFactor = gravity / REFERENCE_GRAVITY;
    
    // Adjusted parameters based on gravity factor
    return {
        populationSize: Math.min(50000, Math.floor(BASE_POPULATION_SIZE * Math.sqrt(gravityFactor))),
        mutationRate: Math.max(0.1, BASE_MUTATION_RATE), // Higher minimum mutation rate to prevent stagnation
        generationLimit: Math.min(200, Math.floor(BASE_GENERATION_LIMIT * Math.sqrt(gravityFactor)))
    };
}


