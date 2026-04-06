require('dotenv').config();
const https = require('https');
const http = require('http');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5174';
const IOT_SECRET = process.env.IOT_SECRET || '';

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

const addNoise = (value, variance) => {
    const shift = (Math.random() * variance * 2) - variance;
    return Number((value + shift).toFixed(2));
};

const postToBackend = (payload) => {
    const body = JSON.stringify(payload);
    const url = new URL(`${BACKEND_URL}/api/iot/update`);

    const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'x-iot-secret': IOT_SECRET
        }
    };

    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.error(`[${payload.machineId}] Backend responded: ${res.statusCode} - ${data}`);
            }
        });
    });

    req.on('error', (err) => {
        console.error(`[${payload.machineId}] Failed to send data:`, err.message);
    });

    req.write(body);
    req.end();
};

const simulateData = () => {
    machines.forEach(machine => {
        if (machine.status === 'Running') {
            const tempVariance = machine.temperature > 85 ? 5 : 2;
            machine.temperature = addNoise(machine.temperature, tempVariance);

            if (Math.random() > 0.8 && machine.temperature < 95) {
                machine.temperature += 2;
            } else if (Math.random() > 0.7 && machine.temperature > 50) {
                machine.temperature -= 1.5;
            }

            const baseRpm = machine.machineId === 'MCH-1003' ? 1800 : 1200;
            const baseCurrent = machine.machineId === 'MCH-1003' ? 15 : 10;

            machine.rpm = addNoise(baseRpm, 50);
            machine.voltage = addNoise(220, 5);
            machine.current = addNoise(baseCurrent, 1.5);
        } else if (machine.status === 'Stopped' || machine.status === 'Error') {
            if (machine.temperature > 25) machine.temperature -= 1;
            machine.rpm = 0;
            machine.current = 0;
        }

        const payload = {
            machineId: machine.machineId,
            temperature: machine.temperature,
            rpm: machine.rpm,
            voltage: machine.voltage,
            current: machine.current
        };

        console.log(`[${new Date().toISOString()}] Sending ${machine.machineId}: Temp=${payload.temperature.toFixed(1)}°C RPM=${payload.rpm.toFixed(0)}`);
        postToBackend(payload);
    });
};

// Poll backend for machine status changes (e.g. stop/start commands)
const pollMachineStatus = () => {
    machines.forEach(machine => {
        const url = new URL(`${BACKEND_URL}/api/machine/status/${machine.machineId}`);
        const lib = url.protocol === 'https:' ? https : http;

        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            method: 'GET',
            headers: {
                'x-iot-secret': IOT_SECRET
            }
        };

        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const serverMachine = JSON.parse(data);
                        if (serverMachine.status && serverMachine.status !== machine.status) {
                            console.log(`[${machine.machineId}] Status changed by server: ${machine.status} → ${serverMachine.status}`);
                            machine.status = serverMachine.status;
                            // Reset temperature on restart
                            if (machine.status === 'Running' && machine.temperature < 40) {
                                machine.temperature = 45;
                            }
                        }
                    } catch (e) {
                        // ignore parse errors
                    }
                }
            });
        });
        req.on('error', () => {}); // ignore poll errors silently
        req.end();
    });
};

console.log(`IoT Simulator starting. Backend: ${BACKEND_URL}`);
console.log('Sending machine data every 5 seconds...');

// Start simulation loop
setInterval(simulateData, 5000);

// Poll for command status changes every 6 seconds
setInterval(pollMachineStatus, 6000);

// Send initial data immediately
simulateData();
