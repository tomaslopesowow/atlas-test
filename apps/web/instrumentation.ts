export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { NodeSDK } = await import('@opentelemetry/sdk-node');
        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
        const { Resource } = await import('@opentelemetry/resources');
        const { ATTR_SERVICE_NAME } = await import('@opentelemetry/semantic-conventions');
        const { BatchSpanProcessor } = await import('@opentelemetry/sdk-trace-node');
        const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
        const { MongooseInstrumentation } = await import('@opentelemetry/instrumentation-mongoose');

        const sdk = new NodeSDK({
            resource: new Resource({
                [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'atlas-web',
            }),
            spanProcessor: new BatchSpanProcessor(
                new OTLPTraceExporter({
                    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
                })
            ),
            instrumentations: [
                // Add all auto-instrumentations except Mongoose (to configure it manually)
                ...getNodeAutoInstrumentations({
                    '@opentelemetry/instrumentation-mongoose': {
                        enabled: false,
                    },
                }),
                // Configure Mongoose instrumentation with requireParentSpan: false
                // This allows tracing of Mongoose operations during app initialization
                new MongooseInstrumentation({
                    requireParentSpan: false,
                }),
            ],
        });

        sdk.start();
    }
}
