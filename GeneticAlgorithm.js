class GeneticAlgorithm {
    constructor() {
        this.populationSize = 100;
        this.currentGeneration = 0;
        this.maxGenerations = 5;
        this.mutationRate = 0.1;
        this.population = [];
        this.bestFitness = -Infinity;
        this.bestGenome = null;
        
        // PID ranges
        this.KP_RANGE = { min: 0.01, max: 1.0 };
        this.KI_RANGE = { min: 0.001, max: 0.1 };
        this.KD_RANGE = { min: 0.01, max: 0.5 };
        
        // Sequence parameters
        this.MAX_SEQUENCE_LENGTH = 10;
        this.DURATION_RANGE = { min: 1.0, max: 2.5 };  // Updated duration range: minimum 1s, maximum 2.5s
        
        this.activeSimulations = new Array(10).fill(null);
        
        // Add these arrays to store historical data
        this.fitnessHistory = [];
        this.diversityHistory = [];
        this.successRateHistory = [];
        
        this.initialize();
    }
    
    initialize() {
        // Create initial population
        for (let i = 0; i < this.populationSize; i++) {
            const genome = this.createRandomGenome();
            this.population.push(genome);
        }
    }
    
    createRandomGenome() {
        // Generate random PID constants
        const kp = random(this.KP_RANGE.min, this.KP_RANGE.max);
        const ki = random(this.KI_RANGE.min, this.KI_RANGE.max);
        const kd = random(this.KD_RANGE.min, this.KD_RANGE.max);
        
        // Generate random sequence
        const sequenceLength = floor(random(3, this.MAX_SEQUENCE_LENGTH));
        let sequence = '';
        
        for(let i = 0; i < sequenceLength; i++) {
            const action = random() > 0.5 ? 'T' : 'D';
            const duration = random(this.DURATION_RANGE.min, this.DURATION_RANGE.max);
            sequence += `${action},${duration.toFixed(2)};`;
        }
        
        return `${kp.toFixed(3)},${ki.toFixed(3)},${kd.toFixed(3)};${sequence}`;
    }
    
    async evolve() {
        while (this.currentGeneration < this.maxGenerations) {
            console.log(`\n=== Generation ${this.currentGeneration + 1}/${this.maxGenerations} ===`);
            
            // Evaluate fitness for all genomes
            const fitnessScores = [];
            for (let i = 0; i < this.population.length; i++) {
                const fitness = await this.evaluateFitness(this.population[i]);
                fitnessScores.push(fitness);
            }
            
            // Find best genome of this generation
            const bestIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
            const avgFitness = fitnessScores.reduce((a, b) => a + b) / fitnessScores.length;
            
            console.log(`Best Fitness: ${fitnessScores[bestIndex].toFixed(2)}`);
            console.log(`Average Fitness: ${avgFitness.toFixed(2)}`);
            
            // Update all-time best if necessary
            if (fitnessScores[bestIndex] > this.bestFitness) {
                this.bestFitness = fitnessScores[bestIndex];
                this.bestGenome = this.population[bestIndex];
                console.log(`New Best Overall Fitness: ${this.bestFitness.toFixed(2)}`);
            }
            
            // After evaluating fitness scores, store the historical data
            this.fitnessHistory.push(avgFitness);
            this.diversityHistory.push(this.calculatePopulationDiversity());
            
            // Calculate and store success rate
            const successfulLandings = fitnessScores.filter(score => score > 0).length;
            const successRate = successfulLandings / this.populationSize;
            this.successRateHistory.push(successRate);
            
            // Create new population
            const newPopulation = [];
            
            // Keep best 10% of population (elitism)
            const eliteCount = Math.floor(this.populationSize * 0.1);
            const sortedIndices = fitnessScores
                .map((f, i) => ({f, i}))
                .sort((a, b) => b.f - a.f)
                .map(x => x.i);
            
            for (let i = 0; i < eliteCount; i++) {
                newPopulation.push(this.population[sortedIndices[i]]);
            }
            
            // Create rest through crossover and mutation
            while (newPopulation.length < this.populationSize) {
                const parent1 = this.selectParent(fitnessScores);
                const parent2 = this.selectParent(fitnessScores);
                let child = this.crossover(
                    this.population[parent1],
                    this.population[parent2]
                );
                child = this.mutate(child);
                newPopulation.push(child);
            }
            
            // Update population and increment generation
            this.population = newPopulation;
            this.currentGeneration++;
            
            // Save best genome periodically
            if (this.currentGeneration % 1 === 0) {
                console.log('\nSaving checkpoint...');
                this.saveGenome();
            }
            
            // Add a small delay between generations to allow UI updates
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('\n=== Training Complete ===');
        console.log(`Final Best Fitness: ${this.bestFitness.toFixed(2)}`);
        console.log(`Final Best Genome: ${this.bestGenome}`);
        this.saveGenome();
    }
    
    async evaluateFitness(genome) {
        // Test each genome under 10 different random gravity conditions
        const gravityTests = Array.from({length: 10}, () => random(1.2, 10));
        
        // Initialize simulation objects for visualization
        this.activeSimulations = gravityTests.map(gravity => ({
            gravity,
            lander: {
                pos: { x: width/2, y: 50 },
                vel: { x: 0, y: 0 },
                crashed: false,
                landed: false
            },
            fitness: undefined
        }));
        
        const fitnessPromises = gravityTests.map((gravity, index) => 
            this.evaluateUnderGravity(genome, gravity, index)
        );
        
        const fitnessResults = await Promise.all(fitnessPromises);
        const avgFitness = fitnessResults.reduce((a, b) => a + b) / fitnessResults.length;
        
        return avgFitness;
    }
    
    async evaluateUnderGravity(genome, testGravity, simulationIndex) {
        return new Promise(resolve => {
            const parts = genome.split(';');
            const [kp, ki, kd] = parts[0].split(',').map(Number);
            const actions = parts.slice(1, -1);
            
            const testPID = new PIDController(kp, ki, kd);
            let currentActionIndex = 0;
            let currentActionTime = 0;
            let thrusterUsage = 0;
            
            const testLander = {
                pos: { x: width/2, y: 50 },
                vel: { x: 0, y: 0 },
                rotation: 0,
                angularVelocity: 0,
                crashed: false,
                landed: false,
                escaped: false,
                mainThruster: false
            };
            
            let simulationSteps = 0;
            const maxSteps = 1000;
            const targetY = height - 100;
            
            const simulate = () => {
                simulationSteps++;
                
                // Check if simulation should end
                const shouldEndSimulation = 
                    testLander.crashed || 
                    testLander.landed || 
                    testLander.escaped ||
                    simulationSteps >= maxSteps;
                
                if (!shouldEndSimulation) {
                    // Update physics and controls
                    this.updateSimulation(testLander, testPID, actions, currentActionIndex, 
                        currentActionTime, thrusterUsage, testGravity, targetY);
                    
                    // Update visualization
                    this.activeSimulations[simulationIndex] = {
                        gravity: testGravity,
                        lander: {
                            pos: { ...testLander.pos },
                            vel: { ...testLander.vel },
                            crashed: testLander.crashed,
                            landed: testLander.landed,
                            escaped: testLander.escaped,
                            mainThruster: testLander.mainThruster
                        }
                    };
                    
                    requestAnimationFrame(simulate);
                } else {
                    // Calculate final fitness
                    const fitness = this.calculateFitness(testLander, simulationSteps, 
                        thrusterUsage, targetY);
                    
                    // Update final state
                    this.activeSimulations[simulationIndex] = {
                        gravity: testGravity,
                        lander: {
                            pos: { ...testLander.pos },
                            vel: { ...testLander.vel },
                            crashed: testLander.crashed,
                            landed: testLander.landed,
                            escaped: testLander.escaped,
                            mainThruster: testLander.mainThruster
                        },
                        fitness: fitness
                    };
                    
                    resolve(fitness);
                }
            };
            
            simulate();
        });
    }
    
    updateSimulation(lander, pid, actions, actionIndex, actionTime, thrusterUsage, gravity, targetY) {
        // Update PID control and thrusters
        if (actionIndex < actions.length) {
            const [type, duration] = actions[actionIndex].split(',');
            const scaledDuration = Number(duration) / Math.sqrt(gravity);
            actionTime += 1/60;

            if (actionTime >= scaledDuration) {
                actionIndex++;
                actionTime = 0;
            }

            if (type === 'T') {
                const pidOutput = pid.compute(targetY, lander.pos.y, lander.vel.y);
                lander.mainThruster = pidOutput > pid.threshold;
                if (lander.mainThruster) {
                    thrusterUsage++;
                }
            } else {
                lander.mainThruster = false;
            }
        }

        // Update physics - match exactly with main simulation
        lander.vel.y += gravity * SCALE;
        if (lander.mainThruster) {
            // Calculate thrust direction based on rotation
            const thrustAngle = lander.rotation - PI/2; // Adjust so 0 means thrusting up
            
            // Convert polar coordinates (angle and magnitude) to Cartesian (x,y)
            const thrustForce = BASE_THRUST_FORCE * (gravity / MIN_GRAVITY);
            const thrustX = thrustForce * Math.cos(thrustAngle) * SCALE;
            const thrustY = thrustForce * Math.sin(thrustAngle) * SCALE;
            
            // Add thrust to velocity
            lander.vel.x += thrustX;
            lander.vel.y += thrustY;
        }
        
        // Update position
        lander.pos.x += lander.vel.x;
        lander.pos.y += lander.vel.y;

        // Add dampening like in main simulation
        lander.vel.x *= 0.99;
        lander.vel.y *= 0.99;

        // Check for atmosphere escape
        if (lander.pos.y <= 0) {
            lander.pos.y = 0;
            lander.vel.y = 0;
            lander.crashed = true;
            lander.escaped = true;
            return;
        }

        // Keep lander within screen bounds like main simulation
        lander.pos.x = constrain(lander.pos.x, 0, width);
        lander.pos.y = constrain(lander.pos.y, 0, height);

        // Check terrain collision
        this.checkTerrainCollision(lander);
    }
    
    calculateFitness(lander, steps, thrusterUsage, targetY) {
        let fitness = 10000;
        
        // Apply penalties
        if (lander.escaped) {
            fitness -= 9500;  // Most severe penalty for escaping atmosphere
        } else if (lander.crashed) {
            const crashVelocity = Math.abs(lander.vel.y) / SCALE;
            fitness -= 1000 + crashVelocity * 500;  // Severe crash penalty
        } else if (steps >= 1000) {
            fitness -= 7000;  // Timeout penalty
        } else if (lander.landed) {
            fitness += 5000;  // Landing bonus
        }

        // Distance penalty
        const finalDistance = Math.abs(lander.pos.y - targetY);
        fitness -= Math.min(5000, finalDistance);

        // Thruster usage penalty
        fitness -= Math.min(1000, thrusterUsage * 2);

        return fitness;
    }
    
    selectParent(fitnessScores) {
        // Tournament selection
        const tournamentSize = 5;
        let bestIndex = Math.floor(random(this.populationSize));
        let bestFitness = fitnessScores[bestIndex];
        
        for (let i = 0; i < tournamentSize - 1; i++) {
            const index = Math.floor(random(this.populationSize));
            if (fitnessScores[index] > bestFitness) {
                bestIndex = index;
                bestFitness = fitnessScores[index];
            }
        }
        
        return bestIndex;
    }
    
    crossover(genome1, genome2) {
        const parts1 = genome1.split(';');
        const parts2 = genome2.split(';');
        
        // Crossover PID constants
        const [kp1, ki1, kd1] = parts1[0].split(',').map(Number);
        const [kp2, ki2, kd2] = parts2[0].split(',').map(Number);
        
        const kp = (kp1 + kp2) / 2 * random(0.9, 1.1);
        const ki = (ki1 + ki2) / 2 * random(0.9, 1.1);
        const kd = (kd1 + kd2) / 2 * random(0.9, 1.1);
        
        // Crossover sequences
        const seq1 = parts1.slice(1, -1);
        const seq2 = parts2.slice(1, -1);
        
        // Randomly select actions from both parents
        const newSeqLength = floor(random(3, this.MAX_SEQUENCE_LENGTH));
        let newSequence = '';
        
        for(let i = 0; i < newSeqLength; i++) {
            const sourceSeq = random() > 0.5 ? seq1 : seq2;
            if(sourceSeq.length > 0) {
                const randomIndex = floor(random(sourceSeq.length));
                newSequence += sourceSeq[randomIndex] + ';';
            }
        }
        
        return `${kp.toFixed(3)},${ki.toFixed(3)},${kd.toFixed(3)};${newSequence}`;
    }
    
    mutate(genome) {
        const parts = genome.split(';');
        const [kp, ki, kd] = parts[0].split(',').map(Number);
        
        // Mutate PID constants
        const newKp = this.mutationRate > random() ? kp * random(0.8, 1.2) : kp;
        const newKi = this.mutationRate > random() ? ki * random(0.8, 1.2) : ki;
        const newKd = this.mutationRate > random() ? kd * random(0.8, 1.2) : kd;
        
        // Mutate sequence
        let newSequence = '';
        const actions = parts.slice(1, -1);
        
        for(let action of actions) {
            if(action) {
                const [type, duration] = action.split(',');
                const newType = this.mutationRate > random() ? (type === 'T' ? 'D' : 'T') : type;
                let newDuration = Number(duration);
                
                if(this.mutationRate > random()) {
                    newDuration *= random(0.8, 1.2);
                    // Clamp duration to valid range
                    newDuration = Math.max(this.DURATION_RANGE.min, 
                                        Math.min(this.DURATION_RANGE.max, newDuration));
                }
                
                newSequence += `${newType},${newDuration.toFixed(2)};`;
            }
        }
        
        return `${newKp.toFixed(3)},${newKi.toFixed(3)},${newKd.toFixed(3)};${newSequence}`;
    }
    
    saveGenome() {
        const date = new Date();
        const filename = `genomes/pid_genome_${date.toISOString()}.txt`;
        saveStrings([this.bestGenome], filename);
        console.log(`Saved PID genome to ${filename}`);
    }

    checkTerrainCollision(lander) {
        for (let i = 0; i < terrain.length - 1; i++) {
            const p1 = terrain[i];
            const p2 = terrain[i + 1];
            
            if (lander.pos.x >= p1.x && lander.pos.x <= p2.x) {
                const terrainY = map(
                    lander.pos.x,
                    p1.x, p2.x,
                    p1.y, p2.y
                );
                
                if (lander.pos.y >= terrainY - LANDER_HEIGHT/2) {
                    lander.pos.y = terrainY - LANDER_HEIGHT/2;
                    const landingSpeed = Math.abs(lander.vel.y) / SCALE;
                    
                    // Check if it's a safe landing in the landing zone
                    if (landingSpeed < 2.0 && 
                        lander.pos.x >= width/2 - 80 && 
                        lander.pos.x <= width/2 + 80) {
                        lander.landed = true;
                        lander.crashed = false;
                    } else {
                        lander.crashed = true;
                        lander.landed = false;
                    }
                    
                    lander.vel.y = 0;
                    return true;
                }
            }
        }
        return false;
    }

    collectMetrics() {
        return {
            generationStats: {
                avgFitness: this.calculateAverageFitness(),
                bestFitness: this.bestFitness,
                worstFitness: Math.min(...this.fitnessScores),
                diversity: this.calculatePopulationDiversity()
            },
            successRate: this.calculateSuccessRate(),
            convergenceSpeed: this.generationsToConverge
        };
    }
    
    calculatePopulationDiversity() {
        // Measure how different genomes are from each other
        let totalDifference = 0;
        for(let i = 0; i < this.population.length; i++) {
            for(let j = i + 1; j < this.population.length; j++) {
                totalDifference += this.genomeDifference(
                    this.population[i], 
                    this.population[j]
                );
            }
        }
        return totalDifference / (this.population.length * (this.population.length - 1) / 2);
    }

    genomeDifference(genome1, genome2) {
        const parts1 = genome1.split(';');
        const parts2 = genome2.split(';');
        
        // Compare PID values
        const pid1 = parts1[0].split(',').map(Number);
        const pid2 = parts2[0].split(',').map(Number);
        
        // Calculate normalized PID difference
        const pidDiff = pid1.reduce((sum, val, i) => {
            const diff = Math.abs(val - pid2[i]);
            return sum + diff / Math.max(val, pid2[i]);
        }, 0) / 3;  // Divide by 3 for average
        
        // Compare action sequences
        const actions1 = parts1.slice(1, -1);
        const actions2 = parts2.slice(1, -1);
        
        // Calculate sequence difference
        const seqDiff = Math.abs(actions1.length - actions2.length) / 
                       Math.max(actions1.length, actions2.length);
        
        // Return weighted average (60% PID params, 40% sequence)
        return pidDiff * 0.6 + seqDiff * 0.4;
    }
} 