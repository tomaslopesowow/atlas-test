import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    csvCell,
    ExportAsCsv,
    MAX_ROWS,
    toCsv,
} from './export-as-csv.action.js';

describe('csvCell', () => {
    it('leaves plain text as it is, and empties null', () => {
        assert.equal(csvCell('Hello'), 'Hello');
        assert.equal(csvCell(42), '42');
        assert.equal(csvCell(null), '');
    });

    it('quotes a comma, a quote or a line break, doubling the quotes', () => {
        assert.equal(csvCell('a, b'), '"a, b"');
        assert.equal(csvCell('say "hi"'), '"say ""hi"""');
        assert.equal(csvCell('one\ntwo'), '"one\ntwo"');
    });

    it('keeps what a spreadsheet would run as a formula as text', () => {
        assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
        assert.equal(csvCell('+31 6 1234'), "'+31 6 1234");
        assert.equal(csvCell('@here'), "'@here");
    });

    it('writes a date as ISO and an object as JSON', () => {
        assert.equal(
            csvCell(new Date('2026-10-08T10:00:00Z')),
            '2026-10-08T10:00:00.000Z',
        );
        assert.equal(csvCell({ a: 1 }), '"{""a"":1}"');
    });
});

describe('toCsv', () => {
    it('heads the rows with the columns, each cell read from its record', () => {
        assert.equal(
            toCsv({
                columns: {
                    Name: (user: { name: string }) => user.name,
                    Shout: (user) => `${user.name}!`,
                },
                records: [{ name: 'Ada' }, { name: 'Grace, H' }],
            }),
            '\uFEFFName,Shout\r\nAda,Ada!\r\n"Grace, H","Grace, H!"\r\n',
        );
    });
});

describe('ExportAsCsv', () => {
    it('downloads the records picked as CSV, named after the day', async () => {
        const action = new ExportAsCsv<{ id: number }>({
            columns: { ID: ({ id }) => id },
            filename: 'users',
        });
        const result = await action.handle({
            records: [{ id: 1 }, { id: 2 }],
            values: {},
            repository: undefined as never,
        });

        assert.equal(result.message, 'Exported 2 records');
        assert.match(
            result.download.filename,
            /^users-\d{4}-\d{2}-\d{2}\.csv$/,
        );
        assert.equal(result.download.content, '\uFEFFID\r\n1\r\n2\r\n');
    });

    it('exports every record instead with all, oldest first and at most MAX_ROWS', async () => {
        const action = new ExportAsCsv<{ id: number }>({
            columns: { ID: ({ id }) => id },
            all: true,
        });
        let asked: unknown;
        const repository = {
            metadata: { primaryColumns: [{ propertyName: 'id' }] },
            find: async (options: unknown) => {
                asked = options;
                return [{ id: 1 }, { id: 2 }, { id: 3 }];
            },
        };
        const result = await action.handle({
            records: [],
            values: {},
            repository: repository as never,
        });

        assert.equal(action.standalone, true);
        assert.equal(action.name, 'export-all-as-csv');
        assert.deepEqual(asked, { order: { id: 'ASC' }, take: MAX_ROWS + 1 });
        assert.equal(result.download.content, '\uFEFFID\r\n1\r\n2\r\n3\r\n');
    });

    it('says so when everything is more than MAX_ROWS', async () => {
        const action = new ExportAsCsv<{ id: number }>({
            columns: { ID: ({ id }) => id },
            all: true,
        });
        const result = await action.handle({
            records: [],
            values: {},
            repository: {
                metadata: { primaryColumns: [] },
                find: async () =>
                    Array.from({ length: MAX_ROWS + 1 }, (_, id) => ({ id })),
            } as never,
        });

        assert.match(result.message, /first 10000 records; there are more/);
        assert.equal(
            result.download.content.trim().split('\r\n').length,
            MAX_ROWS + 1,
        );
    });
});
