require('dotenv').config();
const { io } = require('socket.io-client');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5174';
const socket = io(BACKEND_URL);

// Base machine states for 3 machines
let machines = [
    {
        machineId: 'MCH-1001',
        status: 'Running',
        temperature: 45, 
        rpm: 1200,      
        voltage: 220,
        current: 10
    },
    {
        machineId: 'MCH-1002',
        status: 'Stopped',
        temperature: 20, 
        rpm: 0,      
        voltage: 220,
        current: 0
    },
    {
        machineId: 'MCH-1003',
        status: 'Running',
        temperature: 65, 
        rpm: 1800,      
        voltage: 230,
        current: 15
    }
];

let simulateInterval = null;

const addNoise = (value, variance) => {
    const shift = (Math.random() * variance * 2) - variance;
    return Number((value + shift).toFixed(2));
};

const simulateData = () => {
    machines.forEach(machine => {
        if (machine.status === 'Running') {
            // Normal operating variations
            const tempVariance = machine.temperature > 85 ? 5 : 2; 
            machine.temperature = addNoise(machine.temperature, tempVariance);
            
            // Push temp towards 90 occasioanlly to simulate heating
            if (Math.random() > 0.8 && machine.temperature < 95) {
                machine.temperature += 2; 
            } 
            // Cool down if it gets too high, occasionally
            else if (Math.random() > 0.7 && machine.temperature > 50) {
                machine.temperature -= 1.5;
            }

            // Variable baselines depending on machine
            const baseRpm = machine.machineId === 'MCH-1003' ? 1800 : 1200;
            const baseCurrent = machine.machineId === 'MCH-1003' ? 15 : 10;
            
            machine.rpm = addNoise(baseRpm, 50);
            machine.voltage = addNoise(220, 5);
            machine.current = addNoise(baseCurrent, 1.5);
            
        } else if (machine.status === 'Stopped' || machine.status === 'Error') {
            // Cooling down
            if (machine.temperature > 25) {
                machine.temperature -= 1;
            }
            machine.rpm = 0;
            machine.current = 0;
            // voltage might still be present, but draw is 0
        }

        const payload = {
            machineId: machine.machineId,
            temperature: machine.temperature,
            rpm: machine.rpm,
            voltage: machine.voltage,
            current: machine.current
        };

        console.log(`[${new Date().toISOString()}] Sending data for ${machine.machineId}: Status=${machine.status}, Temp=${payload.temperature.toFixed(1)}°C`);
        socket.emit('iot_data_update', payload);
    });
};

socket.on('connect', () => {
    console.log(`Connected to backend. Initializing simulator for 3 machines.`);
    // Start sending data every 5 seconds
    simulateInterval = setInterval(simulateData, 5000);
});

socket.on('disconnect', () => {
    console.log('Disconnected from backend. Retrying...');
});

// Listen to control commands from backend
socket.on('machine_command', (data) => {
    const targetMachine = machines.find(m => m.machineId === data.machineId);
    
    if (targetMachine) {
        console.log(`Received command for ${data.machineId}: ${data.command}`);
        switch (data.command) {
            case 'start':
                targetMachine.status = 'Running';
                targetMachine.temperature = targetMachine.temperature < 40 ? 45 : targetMachine.temperature;
                console.log(`${data.machineId} Started`);
                break;
            case 'stop':
                targetMachine.status = 'Stopped';
                console.log(`${data.machineId} Stopped`);
                break;
            case 'restart':
                targetMachine.status = 'Stopped';
                console.log(`${data.machineId} Restarting... (Stopped)`);
                setTimeout(() => {
                    targetMachine.status = 'Running';
                    console.log(`${data.machineId} Restarted (Running)`);
                }, 3000);
                break;
            case 'emergency_stop':
                targetMachine.status = 'Error';
                console.log(`EMERGENCY STOP ACTIVATED for ${data.machineId}`);
                break;
        }
        
        // Immediately trigger a sync for all machines to update faster
        simulateData();
    }
});
