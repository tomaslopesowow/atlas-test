// This file configures OpenTelemetry browser instrumentation
// https://signoz.io/docs/frontend-monitoring/sending-traces-with-opentelemetry/

import {
    WebTracerProvider,
    BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';

export function initializeBrowserTelemetry() {
    // Create a resource with service information
    const resource = new Resource({
        // TODO: should be name of project
        [ATTR_SERVICE_NAME]: 'atlas-web-browser',
    });

    // Create the tracer provider
    const provider = new WebTracerProvider({
        resource,
    });

    // Configure the OTLP exporter
    const exporter = new OTLPTraceExporter({
        url: process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    });

    // Add batch span processor
    provider.addSpanProcessor(new BatchSpanProcessor(exporter));

    // Register the provider
    provider.register({
        contextManager: new ZoneContextManager(),
    });

    // Register auto-instrumentations
    registerInstrumentations({
        instrumentations: [
            getWebAutoInstrumentations({
                '@opentelemetry/instrumentation-fetch': {
                    propagateTraceHeaderCorsUrls: /.*/,
                    clearTimingResources: true,
                },
                '@opentelemetry/instrumentation-xml-http-request': {
                    propagateTraceHeaderCorsUrls: /.*/,
                },
            }),
        ],
    });

    return provider;
}
