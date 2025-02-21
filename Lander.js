class Lander {
    constructor() {
        console.log("Initializing lander");
        this.pos = { x: 0, y: 0 };
        this.vel = { x: 0, y: 0 };
        this.rotation = 0;
        this.angularVelocity = 0; 
        this.crashed = false;
        this.mainThruster = false;
        this.leftThruster = false;
        this.rightThruster = false;
        this.landed = false;
    }
}
