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

// For testing:

const genome_1 = "D,1.0;T,2.3;D,1.5;T,3.2;D,4.1;T,0.8"   
const genome_2 = "D,1.0;D,1.2;T,4.5;D,2.1;T,1.9;D,3.3;T,2.7"
const genome_3 = "D,1.0;T,1.1;T,2.4;D,3.7;T,1.5"

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

// Add current genome tracking
let currentGenome = genome_1; // Using the test genome we defined earlier
let currentGenomeIndex = 1;

// Add these near other lander-related variables
let currentActionIndex = 0;  // Which gene we're currently executing
let actionTimer = 0;        // How long current action has been running
let currentActions = [];    // Parsed array of [action, duration] pairs

function setup() {
    createCanvas(800, 600);
    createSceneToggles();
    loadTerrain('terrain/terrain_2024-12-04T11-42-51.json'); // Load default terrain
    resetLander();
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
        text(`Using genome ${currentGenomeIndex}`, 20, 30);
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
