import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminActivityEntity } from './activity/activity.entity.js';
import { ActivityLog } from './activity/activity-log.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { AdminUiController } from './admin-ui.controller.js';
import { ResourceRegistry } from './registry/resource-registry.js';

/** The tables of the panel, for a data source that lists its entities, as the one migrations are generated from. */
export const ADMIN_ENTITIES = [AdminActivityEntity];

// no forRoot: resources, the dashboard and the sign-in are found by the classes they extend, in whatever module provides them
@Module({
    imports: [DiscoveryModule, TypeOrmModule.forFeature(ADMIN_ENTITIES)],
    // the API's routes before the panel's catch-all, which would answer any of them otherwise
    controllers: [AdminController, AdminUiController],
    providers: [ResourceRegistry, AdminService, ActivityLog],
})
export class AdminModule {}
