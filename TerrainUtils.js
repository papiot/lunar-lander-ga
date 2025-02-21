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
