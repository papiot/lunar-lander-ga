let currentScene = 'simulation'; // Track current scene

function setup() {
    createCanvas(800, 600);
    createSceneToggles();
}

function createSceneToggles() {
    const simButton = createButton('Simulation');
    const trainButton = createButton('Training');
    
    let canvas = document.querySelector('canvas');
    let canvasX = canvas.offsetLeft;
    let canvasY = canvas.offsetTop;
    
    // Position buttons at top of canvas
    simButton.position(canvasX + 70, canvasY - 40);
    trainButton.position(canvasX + 160, canvasY - 40);
    
    simButton.mousePressed(() => currentScene = 'simulation');
    trainButton.mousePressed(() => currentScene = 'training');
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
    // Placeholder for simulation scene content
    fill(255);
    textSize(24);
    text('Simulation Scene', width/2 - 80, height/2);
}

function drawTrainingScene() {
    // Placeholder for training scene content
    fill(255);
    textSize(24);
    text('Training Scene', width/2 - 70, height/2);
} 