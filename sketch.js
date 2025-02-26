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
        let safeSpeed = landingSpeed < 0.5; // Reduced safe landing speed threshold
        let safeAngle = landingAngle >= -10 && landingAngle <= 10;
        
        console.log("Landing speed: " + landingSpeed.toFixed(2));
        console.log("Landing angle: " + landingAngle.toFixed(2) + "°");
        
        if (onPlatform && safeSpeed && safeAngle) {
            console.log("Successful landing!");
            lander.color = [0, 255, 0];
        } else {
            console.log("Landing failed");
            lander.color = [255, 0, 0];
        }
    }

    // Check for screen boundaries
    if (lander.x < 0) lander.x = 0;
    if (lander.x > width) lander.x = width;
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
