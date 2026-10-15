import { execSync } from 'node:child_process';

async function teardown() {
    try {
        execSync('docker stop mongo-test');
    } catch (error) {
        console.error('Error stopping MongoDB service:', error);
    }
}

export default teardown;
