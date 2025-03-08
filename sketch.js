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
const BASE_MAIN_THRUSTER_FORCE = 4.0;  
const BASE_SIDE_THRUSTER_FORCE = 0.05;  
// Reference gravity to scale against (Moon gravity)
const REFERENCE_GRAVITY = 1.62;

function createParameterControls() {
    // Container for parameters
    let panel = createDiv();
    panel.position(20, 50);
    panel.style('background-color', '#f0f0f0');
    panel.style('padding', '10px');
    panel.style('border-radius', '5px');
    panel.style('width', '280px');
    panel.style('margin-right', '20px');
    
    // Add panel to main container
    let container = document.getElementById('main-container');
    if (container) {
        container.appendChild(panel.elt);
    }
    
    // Add a title to the panel
    let title = createDiv('Scene Parameters');
    title.parent(panel);
    title.style('font-weight', 'bold');
    title.style('margin-bottom', '10px');
    title.style('font-size', '16px');
    
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
        container.style('display', 'flex');
        container.style('justify-content', 'space-between');
        container.style('align-items', 'center');
        
        let label = createSpan(param.label + ': ');
        label.parent(container);
        label.style('flex', '1');
        
        let input = createInput(sceneParameters[currentScene][param.name].toString(), 'number');
        input.parent(container);
        input.style('width', '80px');
        input.style('margin-left', '10px');
        input.style('padding', '2px 5px');
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
    panel.position(20, 350);
    panel.style('background-color', '#f0f0f0');
    panel.style('padding', '10px');
    panel.style('border-radius', '5px');
    panel.style('width', '280px');
    panel.style('margin-right', '20px');
    panel.style('height', '240px'); // Adjusted to reach the bottom with padding
    
    // Add panel to main container
    let container = document.getElementById('main-container');
    if (container) {
        container.appendChild(panel.elt);
    }
    
    // Add a title to the panel
    let title = createDiv('Genome Controls');
    title.parent(panel);
    title.style('font-weight', 'bold');
    title.style('margin-bottom', '10px');
    title.style('font-size', '16px');

    // Genome input
    let label = createSpan('Genome: ');
    label.parent(panel);
    label.style('display', 'block');
    label.style('margin-bottom', '5px');
    
    genomeInput = createInput('');
    genomeInput.parent(panel);
    genomeInput.style('width', '100%');
    genomeInput.style('box-sizing', 'border-box');
    genomeInput.style('margin', '5px 0 10px 0');
    genomeInput.style('padding', '5px');
    genomeInput.attribute('placeholder', 'Enter genome string...');
    
    // Try to load saved genome for this scene
    try {
        const savedScene = localStorage.getItem('lastSuccessfulScene');
        const savedGenome = localStorage.getItem('lastSuccessfulGenome');
        
        if (savedScene === currentScene && savedGenome) {
            genomeInput.value(savedGenome);
            console.log("Loaded saved genome for", currentScene);
            
            // Also set up the template if this was a successful genome
            if (!hasFoundGoodAngle) {
                console.log("Setting up genome template from saved successful genome");
                const genes = savedGenome.split(';');
                
                // Initialize the template
                genomeTemplate = [...genes];
                frozenLRGenes = [];
                frozenLRPositions = [];
                
                // Identify L/R genes to freeze
                for (let i = 0; i < genes.length; i++) {
                    const [action, duration] = genes[i].split(',');
                    if (action === 'L' || action === 'R') {
                        frozenLRGenes.push(genes[i]);
                        frozenLRPositions.push(i);
                    }
                }
                
                // Enable genome template freezing
                hasFoundGoodAngle = true;
                
                console.log("=====================================================");
                console.log("🔒 PERMANENT GENOME TEMPLATE RESTORED FROM SAVED GENOME 🔒");
                console.log("=====================================================");
                console.log(`TEMPLATE LENGTH: ${genomeTemplate.length} genes`);
                console.log(`COMPLETE TEMPLATE: ${genomeTemplate.join(';')}`);
                
                if (frozenLRGenes.length > 0) {
                    console.log("\nPERMANENTLY FROZEN L/R GENES:");
                    for (let i = 0; i < frozenLRGenes.length; i++) {
                        console.log(`  Position ${frozenLRPositions[i]}: ${frozenLRGenes[i]}`);
                    }
                } else {
                    console.log("\nNO L/R GENES TO FREEZE IN TEMPLATE");
                }
                console.log("=====================================================");
            }
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
    buttonContainer.style('justify-content', 'space-between');

    // Play button
    playButton = createButton('Play Genome');
    playButton.parent(buttonContainer);
    playButton.class('action-button');
    playButton.style('flex', '1');
    playButton.style('padding', '8px');
    playButton.mousePressed(() => {
        resetLander();
    });
    
    // Train button
    trainButton = createButton('Train + Play');
    trainButton.parent(buttonContainer);
    trainButton.class('action-button');
    trainButton.style('flex', '1');
    trainButton.style('padding', '8px');

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
    buttonContainer2.style('margin-top', '10px');
    
    // Load previous success button
    let loadButton = createButton('Load Previous Success');
    loadButton.parent(buttonContainer2);
    loadButton.class('action-button');
    loadButton.style('width', '100%');
    loadButton.style('padding', '8px');
    loadButton.mousePressed(() => {
        try {
            const savedScene = localStorage.getItem('lastSuccessfulScene');
            const savedGenome = localStorage.getItem('lastSuccessfulGenome');
            
            if (savedGenome) {
                genomeInput.value(savedGenome);
                console.log(`Loaded previously successful genome from ${savedScene}`);
                
                // Also set up the template when manually loading
                console.log("Setting up genome template from loaded successful genome");
                const genes = savedGenome.split(';');
                
                // Initialize the template
                genomeTemplate = [...genes];
                frozenLRGenes = [];
                frozenLRPositions = [];
                
                // Identify L/R genes to freeze
                for (let i = 0; i < genes.length; i++) {
                    const [action, duration] = genes[i].split(',');
                    if (action === 'L' || action === 'R') {
                        frozenLRGenes.push(genes[i]);
                        frozenLRPositions.push(i);
                    }
                }
                
                // Enable genome template freezing
                hasFoundGoodAngle = true;
                
                console.log("=====================================================");
                console.log("🔒 PERMANENT GENOME TEMPLATE RESTORED FROM LOADED GENOME 🔒");
                console.log("=====================================================");
                console.log(`TEMPLATE LENGTH: ${genomeTemplate.length} genes`);
                console.log(`COMPLETE TEMPLATE: ${genomeTemplate.join(';')}`);
                
                if (frozenLRGenes.length > 0) {
                    console.log("\nPERMANENTLY FROZEN L/R GENES:");
                    for (let i = 0; i < frozenLRGenes.length; i++) {
                        console.log(`  Position ${frozenLRPositions[i]}: ${frozenLRGenes[i]}`);
                    }
                } else {
                    console.log("\nNO L/R GENES TO FREEZE IN TEMPLATE");
                }
                console.log("=====================================================");
                
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
    // Create a container for everything
    let container = createDiv();
    container.style('position', 'relative');
    container.style('width', '1170px'); // 320px UI + 20px padding + 800px canvas
    container.style('height', '630px');  // 600px canvas + 20px padding
    container.style('border', '5px solid #333');
    container.style('box-sizing', 'border-box');
    container.style('background-color', '#fff');
    container.style('margin', '0 auto'); // Center the container
    container.id('main-container');
    
    // Create canvas
    createCanvas(800, 600);
    // Move the canvas to the right position inside the container
    let canvas = document.querySelector('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '340px';
    canvas.style.top = '10px';
    canvas.style.display = 'block';
    // Move canvas into container
    container.child(canvas);
    
    // Add scene selector UI at the top left with increased margin
    for (let i = 0; i < scenes.length; i++) {
        let button = createButton(scenes[i]);
        button.position(20, 10); // Position relative to container
        button.style('position', 'absolute');
        button.style('left', (20 + i * 58) + 'px');
        button.style('top', '10px');
        button.mousePressed(() => selectScene(scenes[i]));
        button.class('scene-button');
        button.style('padding', '5px 8px');
        // Add button to container
        container.child(button);
        buttons.push(button);
    }
    
    // Default to Moon scene
    selectScene('Moon');
    
    // Add window resize handler
    window.addEventListener('resize', windowResized);
}

// Update window resize handler to account for new padding
function windowResized() {
    // Ensure minimum space for UI (320px + padding) and canvas (800px) plus border
    let minWidth = 1150; // 1140px container + 10px margin
    
    if (window.innerWidth < minWidth) {
        // If window is too small, add scrollbars
        document.body.style.minWidth = minWidth + 'px';
    } else {
        if (document.body) {
            document.body.style.minWidth = 'auto';
        }
    }
    
    // Center the container
    let container = document.getElementById('main-container');
    if (container) {
        container.style.margin = '10px auto';
    }
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
    
    const currentGenome = genomeInput.value();
    
    // Critical fix: If a genome template is active, verify the current genome follows it
    if (hasFoundGoodAngle && genomeTemplate.length > 0) {
        const genes = currentGenome.split(';');
        let templateMismatch = false;
        
        // Check if the genome length matches the template
        if (genes.length !== genomeTemplate.length) {
            console.log("⚠️ TEMPLATE MISMATCH: Current genome length doesn't match the template!");
            console.log(`Template has ${genomeTemplate.length} genes, but genome has ${genes.length} genes`);
            templateMismatch = true;
        } else {
            // Check if each gene type matches the template
            for (let i = 0; i < genes.length; i++) {
                const [action] = genes[i].split(',');
                const [templateAction] = genomeTemplate[i].split(',');
                
                if (action !== templateAction) {
                    console.log(`⚠️ TEMPLATE MISMATCH: Gene at position ${i} doesn't match template (${action} vs ${templateAction})`);
                    templateMismatch = true;
                    break;
                }
            }
        }
        
        // If mismatch detected, generate a new genome that follows the template
        if (templateMismatch) {
            console.log("⚠️ REPLACING GENOME with one that follows the template");
            const correctedGenome = generateRandomGenome(); // This will use the template
            genomeInput.value(correctedGenome);
            console.log(`CORRECTED GENOME: ${correctedGenome}`);
        }
    }
    
    // Update currentGenome if it was corrected
    const finalGenome = genomeInput.value();
    maneuvers = parseGenome(finalGenome);
    
    // Log current genome details
    console.log("\n==================================================");
    console.log("🚀 STARTING NEW SIMULATION 🚀");
    console.log("==================================================");
    console.log(`SCENE: ${currentScene}`);
    console.log(`CURRENT GENOME: ${finalGenome}`);
    
    // Parse and log individual genes for better readability
    if (finalGenome) {
        const genes = finalGenome.split(';');
        console.log(`GENOME LENGTH: ${genes.length} genes`);
        console.log("GENOME BREAKDOWN:");
        
        genes.forEach((gene, index) => {
            const [action, duration] = gene.split(',');
            // Use different indicators for different gene types
            let indicator = '';
            if (action === 'T') indicator = '🔥'; // Thruster
            else if (action === 'D') indicator = '✨'; // Drift
            else if (action === 'L') indicator = '↩️'; // Left
            else if (action === 'R') indicator = '↪️'; // Right
            
            // Check if this gene is a frozen L/R gene when template is active
            let frozenMarker = '';
            if (hasFoundGoodAngle && (action === 'L' || action === 'R') && 
                frozenLRPositions.includes(index)) {
                frozenMarker = ' 🔒 FROZEN';
            }
            
            console.log(`  Gene ${index}: ${indicator} ${action},${duration}${frozenMarker}`);
        });
    }
    console.log("==================================================");
    
    activeThrusters = {
        main: false,
        left: false,
        right: false
    };
    
    // Log the first maneuver if there is one
    if (maneuvers.length > 0) {
        const firstAction = maneuvers[0];
        
        let indicator = '';
        if (firstAction.action === 'T') indicator = '🔥';
        else if (firstAction.action === 'D') indicator = '✨';
        else if (firstAction.action === 'L') indicator = '↩️';
        else if (firstAction.action === 'R') indicator = '↪️';
        
        // Check if this gene is frozen
        let frozenMarker = '';
        if (hasFoundGoodAngle && (firstAction.action === 'L' || firstAction.action === 'R')) {
            const template = genomeTemplate.map(gene => gene.split(',')[0]);
            if (template[0] === firstAction.action) {
                frozenMarker = ' 🔒 FROZEN';
            }
        }
        
        console.log(`▶️ STARTING: Maneuver 0: ${indicator} ${firstAction.action},${firstAction.duration.toFixed(2)}${frozenMarker}`);
    }
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
            // Log the completion of the current maneuver
            let indicator = '';
            if (currentAction.action === 'T') indicator = '🔥';
            else if (currentAction.action === 'D') indicator = '✨';
            else if (currentAction.action === 'L') indicator = '↩️';
            else if (currentAction.action === 'R') indicator = '↪️';
            
            console.log(`✓ COMPLETED: Maneuver ${currentManeuver}: ${indicator} ${currentAction.action},${currentAction.duration.toFixed(2)}`);
            
            currentManeuver++;
            maneuverStartTime = millis();
            
            // Log the start of the next maneuver if there is one
            if (currentManeuver < maneuvers.length) {
                const nextAction = maneuvers[currentManeuver];
                
                let nextIndicator = '';
                if (nextAction.action === 'T') nextIndicator = '🔥';
                else if (nextAction.action === 'D') nextIndicator = '✨';
                else if (nextAction.action === 'L') nextIndicator = '↩️';
                else if (nextAction.action === 'R') nextIndicator = '↪️';
                
                // Check if this gene is frozen
                let frozenMarker = '';
                if (hasFoundGoodAngle && (nextAction.action === 'L' || nextAction.action === 'R')) {
                    const template = genomeTemplate.map(gene => gene.split(',')[0]);
                    if (template[currentManeuver] === nextAction.action) {
                        frozenMarker = ' 🔒 FROZEN';
                    }
                }
                
                console.log(`▶️ STARTING: Maneuver ${currentManeuver}: ${nextIndicator} ${nextAction.action},${nextAction.duration.toFixed(2)}${frozenMarker}`);
            } else {
                console.log("📌 END OF GENOME: All maneuvers completed");
            }
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
    
    // Check if we need to preserve the template from a previous successful run
    const savedGenome = localStorage.getItem('lastSuccessfulGenome');
    const savedScene = localStorage.getItem('lastSuccessfulScene');
    
    // Only reset the template if this is a new scene, otherwise preserve it
    if (currentScene !== savedScene || !savedGenome || !hasFoundGoodAngle) {
        // Reset global L/R freezing state when starting a new training session on a different scene
        hasFoundGoodAngle = false;
        frozenLRGenes = [];
        frozenLRPositions = [];
        genomeTemplate = [];
        console.log("GLOBAL FREEZING - Reset global L/R gene freezing state and genome template for new training session");
    } else {
        console.log("GLOBAL FREEZING - Preserving existing genome template for continued training");
        console.log(`TEMPLATE LENGTH: ${genomeTemplate.length} genes`);
        console.log(`COMPLETE TEMPLATE: ${genomeTemplate.join(';')}`);
    }
    
    // If hasFoundGoodAngle is true, create population based on the template
    if (hasFoundGoodAngle && genomeTemplate.length > 0) {
        console.log("POPULATION - Creating population based on frozen template");
        // Add variations of the frozen template
        for (let i = 0; i < populationSize; i++) {
            population.push(generateRandomGenome()); // This will use the template when hasFoundGoodAngle is true
        }
    } else {
        // No template exists, initialize with completely random genomes
        console.log("POPULATION - Initializing with completely random genomes (no templates)");
        
        // Fill the population with random genomes
        while (population.length < populationSize) {
            population.push(generateRandomGenome());
        }
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
        // CRITICAL FIX: Make sure we actually have a valid template
        if (genomeTemplate.length === 0) {
            console.error("ERROR: Template is empty but hasFoundGoodAngle is true!");
            console.log("Resetting hasFoundGoodAngle to false due to corrupted state");
            hasFoundGoodAngle = false;
            // Continue with normal genome generation
        } else {
            console.log("RANDOM GENOME - Using strict genome template");
            console.log(`TEMPLATE LENGTH: ${genomeTemplate.length} genes`);
            console.log(`COMPLETE TEMPLATE: ${genomeTemplate.join(';')}`);
            
            // Create a new genome following the exact template structure
            let newGenes = [];
            let lrGenesUsed = [];
            let tdGenesGenerated = [];
            
            for (let i = 0; i < genomeTemplate.length; i++) {
                let [action, duration] = genomeTemplate[i].split(',');
                
                // If this is an L/R gene, use the exact frozen value
                if (action === 'L' || action === 'R') {
                    newGenes[i] = genomeTemplate[i];
                    lrGenesUsed.push(`Position ${i}: ${newGenes[i]}`);
                } else {
                    // 50% chance to switch between T and D
                    if (Math.random() < 0.5) {
                        action = action === 'T' ? 'D' : 'T';
                    }   
                    // For T/D positions, keep the same action type but randomize duration
                    const newDuration = (Math.random() * (maxDuration - minDuration) + minDuration).toFixed(2);
                    newGenes[i] = `${action},${newDuration}`;
                    tdGenesGenerated.push(`Position ${i}: ${newGenes[i]}`);
                }
            }
            
            // Enhanced logging
            if (lrGenesUsed.length > 0) {
                console.log("\n🔒 USING PERMANENT GENOME TEMPLATE 🔒");
                console.log("FROZEN L/R GENES USED:");
                lrGenesUsed.forEach(gene => console.log(`  ${gene}`));
            } else {
                console.log("\n🔒 USING PERMANENT GENOME TEMPLATE (NO L/R GENES) 🔒");
            }
            
            console.log("\nNEW T/D GENES GENERATED:");
            tdGenesGenerated.forEach(gene => console.log(`  ${gene}`));
            console.log(`FINAL GENOME: ${newGenes.join(';')}`);
            
            // FINAL VERIFICATION: Make sure the genome structure matches the template exactly
            const finalGenome = newGenes.join(';');
            const finalGenes = finalGenome.split(';');
            if (finalGenes.length !== genomeTemplate.length) {
                console.error("ERROR: Generated genome length doesn't match template!");
                console.log(`Template: ${genomeTemplate.length} genes, Generated: ${finalGenes.length} genes`);
                // Emergency fix: reconstruct the genome
                return generateRandomGenome();
            }
            
            return finalGenome;
        }
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
                    
                    // Enhanced logging for clarity
                    console.log("=====================================================");
                    console.log("🔒 PERMANENT GENOME TEMPLATE FROZEN 🔒");
                    console.log("=====================================================");
                    console.log(`TEMPLATE LENGTH: ${genomeTemplate.length} genes`);
                    console.log(`COMPLETE TEMPLATE: ${currentGenome}`);
                    console.log("\nPERMANENTLY FROZEN L/R GENES:");
                    for (let i = 0; i < frozenLRGenes.length; i++) {
                        console.log(`  Position ${frozenLRPositions[i]}: ${frozenLRGenes[i]}`);
                    }
                    console.log("\nT/D GENES (positions fixed, values will vary):");
                    for (let i = 0; i < genomeTemplate.length; i++) {
                        const [action, duration] = genomeTemplate[i].split(',');
                        if (action === 'T' || action === 'D') {
                            console.log(`  Position ${i}: ${action},${duration} (duration will vary)`);
                        }
                    }
                    console.log("=====================================================");
                    console.log("These L/R genes will NEVER change for the rest of training");
                    console.log("=====================================================");
                    
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
        // CRITICAL FIX: Make sure we actually have a valid template
        if (genomeTemplate.length === 0) {
            console.error("ERROR: Template is empty but hasFoundGoodAngle is true!");
            console.log("Resetting hasFoundGoodAngle to false due to corrupted state");
            hasFoundGoodAngle = false;
            // Fall back to normal mutation without template
        } else {
            console.log("MUTATION - Using strict genome template");
            
            // When global template is active, follow it strictly - same length, same actions
            let newGenes = [];
            let lrGenesPreserved = [];
            let tdGenesMutated = [];
            let tdGenesPreserved = [];
            
            // Ensure genome length matches template
            if (genes.length !== genomeTemplate.length) {
                console.log("MUTATION - Genome length doesn't match template, rebuilding from template");
                
                // Create a genome following the exact template structure
                for (let i = 0; i < genomeTemplate.length; i++) {
                    const [templateAction, templateDuration] = genomeTemplate[i].split(',');
                    
                    // For L/R genes, use exact template value
                    if (templateAction === 'L' || templateAction === 'R') {
                        newGenes[i] = genomeTemplate[i];
                        lrGenesPreserved.push(`Position ${i}: ${newGenes[i]}`);
                    } else {
                        // For T/D genes, use the same type, but allow mutation of duration
                        // Default to a random duration if outside bounds
                        const duration = i < genes.length ? genes[i].split(',')[1] : null;
                        const maxDuration = Math.min(2.0, 0.5 * gravityFactor);
                        
                        if (duration && Math.random() > mutationRate) {
                            // Keep the same duration
                            // BUG FIX: DO NOT allow random change between T and D - strictly follow template
                            newGenes[i] = `${templateAction},${duration}`;
                            tdGenesPreserved.push(`Position ${i}: ${newGenes[i]}`);
                        } else {
                            // Create a new duration
                            // BUG FIX: DO NOT allow random change between T and D - strictly follow template
                            const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
                            newGenes[i] = `${templateAction},${newDuration}`;
                            tdGenesMutated.push(`Position ${i}: ${newGenes[i]}`);
                        }
                    }
                }
                
                // Enhanced logging
                console.log("\n🔒 REBUILT USING PERMANENT TEMPLATE 🔒");
                console.log("FROZEN L/R GENES PRESERVED:");
                lrGenesPreserved.forEach(gene => console.log(`  ${gene}`));
                
                if (tdGenesPreserved.length > 0) {
                    console.log("\nT/D GENES PRESERVED:");
                    tdGenesPreserved.forEach(gene => console.log(`  ${gene}`));
                }
                
                console.log("\nT/D GENES MUTATED:");
                tdGenesMutated.forEach(gene => console.log(`  ${gene}`));
                
                // FINAL VERIFICATION: Ensure the genome matches the template length
                const finalGenome = newGenes.join(';');
                const finalGenes = finalGenome.split(';');
                if (finalGenes.length !== genomeTemplate.length) {
                    console.error("ERROR: Generated genome length doesn't match template!");
                    console.log(`Template: ${genomeTemplate.length} genes, Generated: ${finalGenes.length} genes`);
                    // Emergency fix: regenerate
                    return generateRandomGenome();
                }
                
                return finalGenome;
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
                        lrGenesPreserved.push(`Position ${i}: ${newGenes[i]} (fixed type mismatch)`);
                    } else {
                        // BUG FIX: DO NOT allow switching between T and D - strictly follow template
                        
                        if (Math.random() < mutationRate) {
                            // Mutate duration
                            const maxDuration = Math.min(2.0, 0.5 * gravityFactor);
                            const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
                            newGenes[i] = `${templateAction},${newDuration}`;
                            tdGenesMutated.push(`Position ${i}: ${genes[i]} → ${newGenes[i]}`);
                        } else {
                            // Use existing duration with correct action
                            newGenes[i] = `${templateAction},${duration}`;
                            tdGenesPreserved.push(`Position ${i}: ${newGenes[i]} (fixed type mismatch)`);
                        }
                    }
                } else {
                    // Gene type matches template
                    if (action === 'L' || action === 'R') {
                        // L/R genes are fixed exactly to template
                        newGenes[i] = genomeTemplate[i];
                        lrGenesPreserved.push(`Position ${i}: ${newGenes[i]}`);
                    } else {
                        // For T/D genes, allow duration mutation but NOT type mutation
                        if (Math.random() < mutationRate) {
                            // Mutate duration only
                            const mutationSize = Math.min(0.5, 0.15 * gravityFactor);
                            let newDuration = parseFloat(duration) + (Math.random() * 2 * mutationSize - mutationSize);
                            newDuration = Math.max(0.01, Math.min(2, newDuration));
                            
                            // BUG FIX: DO NOT allow T/D switching - keep templateAction
                            
                            newGenes[i] = `${templateAction},${newDuration.toFixed(2)}`;
                            tdGenesMutated.push(`Position ${i}: ${genes[i]} → ${newGenes[i]}`);
                        } else {
                            // Keep unchanged
                            newGenes[i] = genes[i];
                            tdGenesPreserved.push(`Position ${i}: ${newGenes[i]}`);
                        }
                    }
                }
            }
            
            // Enhanced logging
            console.log("\n🔒 MUTATING WITH PERMANENT TEMPLATE 🔒");
            console.log("FROZEN L/R GENES PRESERVED:");
            lrGenesPreserved.forEach(gene => console.log(`  ${gene}`));
            
            if (tdGenesPreserved.length > 0) {
                console.log("\nT/D GENES PRESERVED:");
                tdGenesPreserved.forEach(gene => console.log(`  ${gene}`));
            }
            
            if (tdGenesMutated.length > 0) {
                console.log("\nT/D GENES MUTATED:");
                tdGenesMutated.forEach(gene => console.log(`  ${gene}`));
            }
            
            // FINAL VERIFICATION: Ensure the genome matches the template exactly
            const finalGenome = newGenes.join(';');
            const finalGenes = finalGenome.split(';');
            if (finalGenes.length !== genomeTemplate.length) {
                console.error("ERROR: Generated genome length doesn't match template!");
                console.log(`Template: ${genomeTemplate.length} genes, Generated: ${finalGenes.length} genes`);
                // Emergency fix: regenerate
                return generateRandomGenome();
            }
            
            return finalGenome;
        }
    }
    
    // SIMPLIFIED APPROACH FOR NON-TEMPLATE CASE
    // When no template is active, we apply a basic mutation approach
    console.log("MUTATION - No template active, applying standard mutations");
    
    // Check if fitnessInfo is null (which means we're likely dealing with an out-of-bounds genome)
    if (!fitnessInfo || fitnessInfo.fitness <= -5000) {
        console.log("MUTATION - No fitness info or out-of-bounds genome, applying strong mutations");
        // Apply stronger mutations for exploration in this case
        
        // Mutate each gene with higher probability
        const mutatedGenes = genes.map(gene => {
            if (Math.random() < mutationRate * 2) { // Double mutation rate
                const [action, duration] = gene.split(',');
                
                // 50% chance to completely change the gene
                if (Math.random() < 0.5) {
                    const newAction = actions[Math.floor(Math.random() * actions.length)];
                    const maxDuration = Math.min(2.0, 0.5 * gravityFactor);
                    const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
                    return `${newAction},${newDuration}`;
                } else {
                    // 50% chance to just change the duration
                    const maxDuration = Math.min(2.0, 0.5 * gravityFactor);
                    const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
                    return `${action},${newDuration}`;
                }
            }
            return gene;
        });
        
        // Occasionally add or remove genes
        let finalGenes = [...mutatedGenes];
        
        // 20% chance to add a gene
        if (finalGenes.length < 12 && Math.random() < 0.2) {
            const newAction = actions[Math.floor(Math.random() * actions.length)];
            const maxDuration = Math.min(2.0, 0.5 * gravityFactor);
            const newDuration = (Math.random() * maxDuration + 0.1).toFixed(2);
            finalGenes.push(`${newAction},${newDuration}`);
            console.log("MUTATION - Added a new gene");
        }
        
        // 10% chance to remove a gene
        if (finalGenes.length > 4 && Math.random() < 0.1) {
            const indexToRemove = Math.floor(Math.random() * finalGenes.length);
            finalGenes.splice(indexToRemove, 1);
            console.log("MUTATION - Removed a gene");
        }
        
        return finalGenes.join(';');
    } else {
        // Normal case - standard mutation for genomes with valid fitness
        const mutatedGenes = genes.map(gene => {
            if (Math.random() < mutationRate) {
                const [action, duration] = gene.split(',');
                
                // 60% chance to only modify duration, 40% chance to change action type
                if (Math.random() < 0.6) {
                    const mutationSize = Math.min(0.5, 0.15 * gravityFactor);
                    let newDuration = parseFloat(duration) + (Math.random() * 2 * mutationSize - mutationSize);
                    newDuration = Math.max(0.01, Math.min(2, newDuration));
                    return `${action},${newDuration.toFixed(2)}`;
                } else {
                    // When changing action type, if current is T/D, randomly switch between these two with higher probability
                    let newAction;
                    if ((action === 'T' || action === 'D') && Math.random() < 0.8) {
                        // 80% chance to just toggle between T and D
                        newAction = action === 'T' ? 'D' : 'T';
                    } else {
                        // 20% chance to pick any action (including L/R)
                        newAction = actions[Math.floor(Math.random() * actions.length)];
                    }
                    return `${newAction},${duration}`;
                }
            }
            return gene;
        });
        
        return mutatedGenes.join(';');
    }
}

// Update crossover to strictly preserve successful gene patterns
function crossover(parent1, parent2, fitnessInfo1 = null, fitnessInfo2 = null) {
    const genes1 = parent1.split(';');
    const genes2 = parent2.split(';');
    
    // Check if we have global L/R freezing active
    if (hasFoundGoodAngle) {
        console.log("CROSSOVER - Global genome template active - using strict template");
        
        // CRITICAL FIX: Make sure we actually have a valid template
        if (genomeTemplate.length === 0) {
            console.error("ERROR: Template is empty but hasFoundGoodAngle is true!");
            console.log("Resetting hasFoundGoodAngle to false due to corrupted state");
            hasFoundGoodAngle = false;
            // Fall back to normal crossover without template
        } else {
            // Create a new genome that strictly follows the template
            let childGenes = [];
            
            for (let i = 0; i < genomeTemplate.length; i++) {
                const [templateAction, templateDuration] = genomeTemplate[i].split(',');
                if (templateAction === 'D' || templateAction === 'T') {
                    // 50% chance to switch between T and D
                    console.log("Switching between T and D");
                    if (Math.random() < 0.5) {
                        templateAction = templateAction === 'T' ? 'D' : 'T';
                    }
                }
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
                        
                        // BUG FIX: Strict template checking - gene must be EXACTLY the same type as template
                        const validParent1 = action1 === templateAction;  // Must match exactly
                        const validParent2 = action2 === templateAction;  // Must match exactly
                        
                        if (validParent1 && validParent2) {
                            // Both parents have correct type, choose one randomly
                            const useParent1 = Math.random() < 0.5;
                            // BUG FIX: Ensure gene type matches template exactly
                            const chosenDuration = useParent1 ? duration1 : duration2;
                            childGenes[i] = `${templateAction},${chosenDuration}`;
                            console.log(`CROSSOVER - Using ${useParent1 ? 'parent1' : 'parent2'}'s duration with template type at position ${i}: ${childGenes[i]}`);
                        } else if (validParent1) {
                            // Only parent1 has correct type
                            // BUG FIX: Ensure gene type matches template exactly
                            childGenes[i] = `${templateAction},${duration1}`;
                            console.log(`CROSSOVER - Using parent1's duration with template type at position ${i}: ${childGenes[i]}`);
                        } else if (validParent2) {
                            // Only parent2 has correct type
                            // BUG FIX: Ensure gene type matches template exactly
                            childGenes[i] = `${templateAction},${duration2}`;
                            console.log(`CROSSOVER - Using parent2's duration with template type at position ${i}: ${childGenes[i]}`);
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
            
            // FINAL VERIFICATION: Make sure the genome structure matches the template exactly
            const finalGenome = childGenes.join(';');
            const finalGenes = finalGenome.split(';');
            if (finalGenes.length !== genomeTemplate.length) {
                console.error("ERROR: Generated genome length doesn't match template!");
                console.log(`Template: ${genomeTemplate.length} genes, Generated: ${finalGenes.length} genes`);
                // Emergency fix: reconstruct using the template with random durations for T/D genes
                return generateRandomGenome();
            }
            
            return finalGenome;
        }
    }
    
    // Special handling for out-of-bounds cases
    if (parent1OutOfBounds && parent2OutOfBounds) {
        console.log("CROSSOVER - Both parents went out of bounds");
        
        // Just create a completely new random genome
        console.log("CROSSOVER - Both parents went out of bounds, creating new random genome");
        return generateRandomGenome();
    } else if (parent1OutOfBounds) {
        console.log("CROSSOVER - Parent 1 went out of bounds, using ONLY parent 2's genes");
        return parent2;
    } else if (parent2OutOfBounds) {
        console.log("CROSSOVER - Parent 2 went out of bounds, using ONLY parent 1's genes");
        return parent1;
    }
    
    // Normal crossover for non-out-of-bounds parents
    // Choose a random split point
    const splitPoint = Math.floor(Math.random() * Math.min(genes1.length, genes2.length));
    
    // Create the child using genes from both parents
    const child = [...genes1.slice(0, splitPoint), ...genes2.slice(splitPoint)];
    
    return child.join(';');
}

// Update trainGeneration to use the enhanced crossover and mutation with fitness info
async function trainGeneration(params = { populationSize: BASE_POPULATION_SIZE, mutationRate: BASE_MUTATION_RATE, generationLimit: BASE_GENERATION_LIMIT }) {
    // Initialize fitnessResults array
    let fitnessResults = [];
    
    console.log(`Generation ${currentGeneration} - Evaluating ${population.length} genomes with gravity ${sceneParameters[currentScene].gravity}m/s²`);
    
    // Evaluate fitness for each genome
    for (let i = 0; i < population.length; i++) {
        console.log(`Evaluating genome ${i+1}/${population.length}`);
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




