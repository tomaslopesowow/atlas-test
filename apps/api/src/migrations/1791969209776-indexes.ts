import { MigrationInterface, QueryRunner } from 'typeorm';

export class Indexes1791969209776 implements MigrationInterface {
    name = 'Indexes1791969209776';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE INDEX "IDX_06810d92ff9ec90b5a2f5ebd55" ON "notification"  ("modelType", "modelId") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_fb91bea2d37140a877b775e6b2" ON "post"  ("createdAt") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_276779da446413a0d79598d4fb" ON "comment"  ("authorId") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_3edd3cdb7232a3e9220607eabb" ON "comment"  ("createdAt") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_e11e649824a45d8ed01d597fd9" ON "user"  ("createdAt") `,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP INDEX "public"."IDX_e11e649824a45d8ed01d597fd9"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_3edd3cdb7232a3e9220607eabb"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_276779da446413a0d79598d4fb"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_fb91bea2d37140a877b775e6b2"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_06810d92ff9ec90b5a2f5ebd55"`,
        );
    }
}
