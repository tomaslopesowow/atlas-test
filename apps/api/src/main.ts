import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { setUpApp } from './app.setup.js';
import { type AppConfig, appConfig } from './config/app.config.js';

const bootstrap = async () => {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    await setUpApp(app);

    await app.listen(app.get<AppConfig>(appConfig.KEY).port);
};

void bootstrap();
