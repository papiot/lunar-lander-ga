class PIDController {
    constructor(kp, ki, kd) {
        console.log(`Creating PID controller with Kp=${kp}, Ki=${ki}, Kd=${kd}`);
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        this.previousError = 0;
        this.integral = 0;
        this.lastTime = null;
        this.threshold = 0.5;  // Add threshold for activation
    }
    
    compute(setpoint, measuredValue, velocity) {
        const currentTime = millis();
        if (this.lastTime === null) {
            this.lastTime = currentTime;
            return 0;
        }
        
        const dt = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;
        
        const error = setpoint - measuredValue;
        
        // Penalize moving away from target when below it
        if (error < 0 && velocity < 0) {  
            this.integral += error * dt;
        } else if (error > 0 && velocity > 0) { 
            this.integral += error * dt;
        } else {
            this.integral = 0; 
        }
        
        const derivative = (error - this.previousError) / dt;
        
        const output = this.kp * error + 
                      this.ki * this.integral + 
                      this.kd * derivative;
        
        this.previousError = error;
        return output;
    }
    
    reset() {
        this.previousError = 0;
        this.integral = 0;
        this.lastTime = null;
    }
}