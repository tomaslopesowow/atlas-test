import {
    type ContentPipelineEngine,
    type ContentPipelineLogger,
    createContentPipelineEngine,
} from '@repo/content-pipeline/engine';
import { I18N_DEFAULT_LOCALE } from '@repo/i18n/shared';
import type { Payload } from 'payload';
import { getContentPipelineRuntime } from '../plugin';
import { findInternalLinks } from './find-internal-links';

const engines = new WeakMap<Payload, ContentPipelineEngine>();

function required(value: string | undefined, name: string): string {
    if (!value) {
        throw new Error(`[content-pipeline] Missing runtime value: ${name}.`);
    }
    return value;
}

function payloadLogger(payload: Payload): ContentPipelineLogger {
    return {
        debug: (message) => payload.logger.debug(message),
        info: (message) => payload.logger.info(message),
        warn: (message) => payload.logger.warn(message),
        error: (message) => payload.logger.error(message),
    };
}

export function getContentPipelineEngine(
    payload: Payload,
): ContentPipelineEngine {
    const cached = engines.get(payload);
    if (cached) return cached;

    const runtime = getContentPipelineRuntime(payload.config);
    if (!runtime) {
        throw new Error(
            '[content-pipeline] Runtime configuration was not registered.',
        );
    }

    const engine = createContentPipelineEngine({
        dataForSeo: {
            login: required(runtime.dataForSeo.login, 'DATAFORSEO_LOGIN'),
            password: required(
                runtime.dataForSeo.password,
                'DATAFORSEO_PASSWORD',
            ),
        },
        anthropic: {
            apiKey: required(runtime.anthropic.apiKey, 'ANTHROPIC_API_KEY'),
            articleModel: runtime.anthropic.articleModel,
            fastModel: runtime.anthropic.fastModel,
            dedupModel: runtime.anthropic.dedupModel,
        },
        defaultLocale: I18N_DEFAULT_LOCALE,
        findInternalLinks: (input) => findInternalLinks(payload, input),
        logger: payloadLogger(payload),
        fal: runtime.fal?.apiKey
            ? {
                  apiKey: runtime.fal.apiKey,
                  model: runtime.fal.model,
                  style: runtime.fal.style,
                  maxAttempts: runtime.fal.maxAttempts,
              }
            : undefined,
    });
    engines.set(payload, engine);
    return engine;
}
