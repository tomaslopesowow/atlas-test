import { execSync } from 'node:child_process';

const DOCKER_MONGO_PORT = 27018;
const DOCKER_IS_RUNNING = (() => {
    try {
        return (
            execSync(
                'docker ps --filter "name=mongo-test" --filter "status=running" --format "{{.ID}}"',
                { stdio: 'pipe' },
            )
                .toString()
                .trim().length > 0
        );
    } catch {
        return false;
    }
})();

const DOCKER_RUN_DB = !DOCKER_IS_RUNNING
    ? `docker run -d --rm \
    --name mongo-test \
    -p ${DOCKER_MONGO_PORT}:${DOCKER_MONGO_PORT} \
    --log-driver=none \
    --tmpfs /data/db \
    mongo:latest \
    --port ${DOCKER_MONGO_PORT} \
    --storageEngine=wiredTiger`
    : null;

const DOCKER_SERVICE_POLL_INTERVAL_MS = 2_000;
const DOCKER_SERVICE_TIMEOUT_MS = 30_000;
const DOCKER_SERVICE_MAX_ATTEMPTS = Math.ceil(
    DOCKER_SERVICE_TIMEOUT_MS / DOCKER_SERVICE_POLL_INTERVAL_MS,
);

async function setup() {
    DOCKER_RUN_DB && execSync(DOCKER_RUN_DB);

    // Wait for the docker service to start
    await new Promise((resolve) =>
        setTimeout(resolve, DOCKER_SERVICE_POLL_INTERVAL_MS),
    );

    // Poll the docker service (mongo-test) at an interval, resolve when it's up
    await new Promise((resolve) => {
        let attempts = 0;

        const checkMongo = async () => {
            console.log(
                `Checking MongoDB service... (${attempts + 1}/${DOCKER_SERVICE_MAX_ATTEMPTS})`,
            );

            try {
                // Try to connect via docker exec: return 0 if mongo responds to ping
                execSync(
                    `docker exec mongo-test mongosh \
                        --port ${DOCKER_MONGO_PORT} \
                        --eval "db.runCommand({ ping: 1 })" \
                        --quiet`,
                );
                resolve(undefined);
            } catch (_err) {
                attempts += 1;
                if (attempts < DOCKER_SERVICE_MAX_ATTEMPTS) {
                    setTimeout(checkMongo, DOCKER_SERVICE_POLL_INTERVAL_MS);
                } else {
                    console.error('MongoDB service did not start in time.');
                    resolve(undefined); // Don't hang forever
                }
            }
        };

        checkMongo();
    });

    execSync('pnpm payload run tests/_seed.ts', { stdio: 'inherit' });
}

await setup();
