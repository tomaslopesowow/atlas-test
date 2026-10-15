import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1791964731765 implements MigrationInterface {
    name = 'Init1791964731765';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "admin_activity" ("id" SERIAL NOT NULL, "resource" character varying NOT NULL, "recordKey" character varying NOT NULL, "recordTitle" character varying NOT NULL, "event" character varying NOT NULL, "action" character varying, "changes" jsonb NOT NULL DEFAULT '{}', "actor" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9a163d0f6bf432cb24674e5708a" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_2e151d41ee72fb24ce7631246f" ON "admin_activity"  ("resource", "recordKey", "id") `,
        );
        await queryRunner.query(
            `CREATE TABLE "media_attachment" ("id" SERIAL NOT NULL, "modelType" character varying NOT NULL, "modelId" integer NOT NULL, "mediaId" uuid, CONSTRAINT "UQ_402c2c9f2950e7d50671637da4e" UNIQUE ("modelType", "modelId", "mediaId"), CONSTRAINT "PK_b13383401c0375193cc36b3939f" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_94ef45af52ed35d2f013825ba8" ON "media_attachment"  ("mediaId") `,
        );
        await queryRunner.query(
            `CREATE TABLE "media" ("id" uuid NOT NULL, "name" character varying NOT NULL, "fileName" character varying NOT NULL, "collectionName" character varying NOT NULL, "mimeType" character varying NOT NULL, "disk" character varying NOT NULL, "size" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "conversions" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_f4e0fcac36e050de337b670d8bd" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_03b24381f3a7e3fe6a1f6407fb" ON "media"  ("createdAt") WHERE "conversions" @? '$.* ? (@.status == "PENDING" || @.status == "PROCESSING")'`,
        );
        await queryRunner.query(
            `CREATE TABLE "device" ("id" SERIAL NOT NULL, "modelType" character varying NOT NULL, "modelId" integer NOT NULL, "token" character varying NOT NULL, "provider" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_6182945bab989e0c4a2218e4993" UNIQUE ("token"), CONSTRAINT "PK_2dc10972aa4e27c01378dad2c72" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_95c1e90f09bc51e2dba635a2f1" ON "device"  ("modelType", "modelId") `,
        );
        await queryRunner.query(
            `CREATE TABLE "notification" ("id" uuid NOT NULL, "modelType" character varying, "modelId" integer, "type" character varying NOT NULL, "payload" jsonb NOT NULL, "inbox" boolean NOT NULL DEFAULT false, "readAt" TIMESTAMP WITH TIME ZONE, "deliveries" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_5c7acf33f045fd37869028fb56" ON "notification"  ("id") WHERE "deliveries" @? '$.* ? (@.status == "PENDING" || @.status == "PROCESSING")'`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_a201b54581471bce2b14833329" ON "notification"  ("modelType", "modelId") WHERE "inbox" AND "readAt" IS NULL`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_1077f889a4fdd97ae5fddf2fe2" ON "notification"  ("modelType", "modelId", "id") WHERE "inbox"`,
        );
        await queryRunner.query(
            `CREATE TABLE "role_attachment" ("id" SERIAL NOT NULL, "roleId" integer NOT NULL, "modelType" character varying NOT NULL, "modelId" integer NOT NULL, CONSTRAINT "UQ_03fd5a8e33d4b31a064ac032c71" UNIQUE ("modelType", "modelId", "roleId"), CONSTRAINT "PK_fb3a61569061d4c95088a47018c" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "role" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "UQ_ae4578dcaed5adff96595e61660" UNIQUE ("name"), CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "permission" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "UQ_240853a0c3353c25fb12434ad33" UNIQUE ("name"), CONSTRAINT "PK_3b8b97af9d9d8807e41e6f48362" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."post_status_enum" AS ENUM('active', 'disabled')`,
        );
        await queryRunner.query(
            `CREATE TABLE "post" ("id" SERIAL NOT NULL, "authorId" integer NOT NULL, "body" text NOT NULL, "status" "public"."post_status_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_be5fda3aac270b134ff9c21cdee" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_c6fb082a3114f35d0cc27c518e" ON "post"  ("authorId") `,
        );
        await queryRunner.query(
            `CREATE TABLE "comment" ("id" SERIAL NOT NULL, "postId" integer NOT NULL, "authorId" integer NOT NULL, "body" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0b0e4bbc8415ec426f87f3a88e2" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_94a85bb16d24033a2afdd5df06" ON "comment"  ("postId") `,
        );
        await queryRunner.query(
            `CREATE TABLE "user" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "name" character varying(50) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "session" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "tokenHash" character(64) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_ff3b5bfd0767bd32942e5ccaad0" UNIQUE ("tokenHash"), CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_3d2f174ef04fb312fdebd0ddc5" ON "session"  ("userId") `,
        );
        await queryRunner.query(
            `CREATE TABLE "post_like" ("postId" integer NOT NULL, "userId" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_754a5e1d4e513c739e9c39a8d79" PRIMARY KEY ("postId", "userId"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_909fc474ef645901d01f0cc066" ON "post_like"  ("userId") `,
        );
        await queryRunner.query(
            `CREATE TABLE "role_permission" ("roleId" integer NOT NULL, "permissionId" integer NOT NULL, CONSTRAINT "PK_b42bbacb8402c353df822432544" PRIMARY KEY ("roleId", "permissionId"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_e3130a39c1e4a740d044e68573" ON "role_permission"  ("roleId") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_72e80be86cab0e93e67ed1a7a9" ON "role_permission"  ("permissionId") `,
        );
        await queryRunner.query(
            `ALTER TABLE "media_attachment" ADD CONSTRAINT "FK_94ef45af52ed35d2f013825ba88" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "role_attachment" ADD CONSTRAINT "FK_a2bc172362b3a04fb5fef0a6617" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "post" ADD CONSTRAINT "FK_c6fb082a3114f35d0cc27c518e0" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "comment" ADD CONSTRAINT "FK_94a85bb16d24033a2afdd5df060" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "comment" ADD CONSTRAINT "FK_276779da446413a0d79598d4fbd" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "session" ADD CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "post_like" ADD CONSTRAINT "FK_789b3f929eb3d8760419f87c8a9" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "post_like" ADD CONSTRAINT "FK_909fc474ef645901d01f0cc0662" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "role_permission" ADD CONSTRAINT "FK_e3130a39c1e4a740d044e685730" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
        );
        await queryRunner.query(
            `ALTER TABLE "role_permission" ADD CONSTRAINT "FK_72e80be86cab0e93e67ed1a7a9a" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "role_permission" DROP CONSTRAINT "FK_72e80be86cab0e93e67ed1a7a9a"`,
        );
        await queryRunner.query(
            `ALTER TABLE "role_permission" DROP CONSTRAINT "FK_e3130a39c1e4a740d044e685730"`,
        );
        await queryRunner.query(
            `ALTER TABLE "post_like" DROP CONSTRAINT "FK_909fc474ef645901d01f0cc0662"`,
        );
        await queryRunner.query(
            `ALTER TABLE "post_like" DROP CONSTRAINT "FK_789b3f929eb3d8760419f87c8a9"`,
        );
        await queryRunner.query(
            `ALTER TABLE "session" DROP CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53"`,
        );
        await queryRunner.query(
            `ALTER TABLE "comment" DROP CONSTRAINT "FK_276779da446413a0d79598d4fbd"`,
        );
        await queryRunner.query(
            `ALTER TABLE "comment" DROP CONSTRAINT "FK_94a85bb16d24033a2afdd5df060"`,
        );
        await queryRunner.query(
            `ALTER TABLE "post" DROP CONSTRAINT "FK_c6fb082a3114f35d0cc27c518e0"`,
        );
        await queryRunner.query(
            `ALTER TABLE "role_attachment" DROP CONSTRAINT "FK_a2bc172362b3a04fb5fef0a6617"`,
        );
        await queryRunner.query(
            `ALTER TABLE "media_attachment" DROP CONSTRAINT "FK_94ef45af52ed35d2f013825ba88"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_72e80be86cab0e93e67ed1a7a9"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_e3130a39c1e4a740d044e68573"`,
        );
        await queryRunner.query(`DROP TABLE "role_permission"`);
        await queryRunner.query(
            `DROP INDEX "public"."IDX_909fc474ef645901d01f0cc066"`,
        );
        await queryRunner.query(`DROP TABLE "post_like"`);
        await queryRunner.query(
            `DROP INDEX "public"."IDX_3d2f174ef04fb312fdebd0ddc5"`,
        );
        await queryRunner.query(`DROP TABLE "session"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(
            `DROP INDEX "public"."IDX_94a85bb16d24033a2afdd5df06"`,
        );
        await queryRunner.query(`DROP TABLE "comment"`);
        await queryRunner.query(
            `DROP INDEX "public"."IDX_c6fb082a3114f35d0cc27c518e"`,
        );
        await queryRunner.query(`DROP TABLE "post"`);
        await queryRunner.query(`DROP TYPE "public"."post_status_enum"`);
        await queryRunner.query(`DROP TABLE "permission"`);
        await queryRunner.query(`DROP TABLE "role"`);
        await queryRunner.query(`DROP TABLE "role_attachment"`);
        await queryRunner.query(
            `DROP INDEX "public"."IDX_1077f889a4fdd97ae5fddf2fe2"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_a201b54581471bce2b14833329"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_5c7acf33f045fd37869028fb56"`,
        );
        await queryRunner.query(`DROP TABLE "notification"`);
        await queryRunner.query(
            `DROP INDEX "public"."IDX_95c1e90f09bc51e2dba635a2f1"`,
        );
        await queryRunner.query(`DROP TABLE "device"`);
        await queryRunner.query(
            `DROP INDEX "public"."IDX_03b24381f3a7e3fe6a1f6407fb"`,
        );
        await queryRunner.query(`DROP TABLE "media"`);
        await queryRunner.query(
            `DROP INDEX "public"."IDX_94ef45af52ed35d2f013825ba8"`,
        );
        await queryRunner.query(`DROP TABLE "media_attachment"`);
        await queryRunner.query(
            `DROP INDEX "public"."IDX_2e151d41ee72fb24ce7631246f"`,
        );
        await queryRunner.query(`DROP TABLE "admin_activity"`);
    }
}
