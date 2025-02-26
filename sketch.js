let currentScene = 'Moon';
let scenes = ['Moon', 'Earth', 'Mars', 'Asteroid', 'Custom'];
let buttons = [];

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
    
    // Draw landing pad
    fill(255, 140, 0); // Orange color
    rect(350, 500, 100, 10);
    
    // Draw flags
    stroke(255);
    strokeWeight(2);
    // Left flag
    line(350, 500, 350, 470);
    fill(255, 0, 0);
    noStroke();
    triangle(350, 470, 370, 480, 350, 490);
    
    // Right flag
    stroke(255);
    line(450, 500, 450, 470);
    fill(255, 0, 0);
    noStroke();
    triangle(450, 470, 470, 480, 450, 490);
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
}
