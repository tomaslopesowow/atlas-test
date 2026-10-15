import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import type { Payload } from 'payload';
import { getContentPipelineEngine } from '../pipeline/engine';
import { getContentPipelineRuntime } from '../plugin';
import { contentPipelineWorkflow } from './workflows/content-pipeline.workflow';

const instances = new WeakMap<Payload, Mastra>();

export function getContentPipelineMastra(payload: Payload): Mastra {
    const cached = instances.get(payload);
    if (cached) return cached;

    const engine = getContentPipelineEngine(payload);
    const storage = getContentPipelineRuntime(payload.config)?.mastra;
    const mastra = new Mastra({
        agents: {
            seoWriter: engine.agents.seoWriterAgent,
            seoStrategist: engine.agents.seoStrategistAgent,
            dedupJudge: engine.agents.dedupJudgeAgent,
            categoryClassifier: engine.agents.categoryClassifierAgent,
        },
        workflows: { contentPipeline: contentPipelineWorkflow },
        tools: { keywordResearch: engine.tools.keywordResearch },
        storage: new LibSQLStore({
            id: 'content-pipeline-store',
            url: storage?.url || 'file:./content-pipeline.db',
            ...(storage?.authToken ? { authToken: storage.authToken } : {}),
        }),
        logger: new PinoLogger({ name: 'content-pipeline', level: 'info' }),
    });
    instances.set(payload, mastra);
    return mastra;
}
