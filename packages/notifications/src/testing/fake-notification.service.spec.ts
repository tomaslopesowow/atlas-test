import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Notification } from '../notification.js';
import { FakeNotificationService } from './fake-notification.service.js';

class Welcome extends Notification<{ name: string }> {
    readonly type = 'welcome';
    readonly channels = ['mail'];
}

class InvoicePaid extends Notification {
    readonly type = 'invoice.paid';
    readonly channels = ['database'];
}

describe('FakeNotificationService', () => {
    it('records each send, gives an id per recipient, and finds the sends of a notification class', async () => {
        const fake = new FakeNotificationService();
        const welcome = {
            recipients: [
                { email: 'ann@example.com' },
                { modelType: 'user', modelId: 5 },
            ],
            notification: new Welcome({ name: 'Ann' }),
        };

        const { ids } = await fake.send(welcome);
        await fake.send({ recipients: [], notification: new InvoicePaid({}) });

        assert.equal(new Set(ids).size, 2);
        assert.equal(fake.sent.length, 2);
        assert.deepEqual(fake.sentOf({ notification: Welcome }), [welcome]);
    });
});
