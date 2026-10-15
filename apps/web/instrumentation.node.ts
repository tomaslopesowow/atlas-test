import { event, warn } from 'next/dist/build/output/log';

export const sendReady = () => {
    if (process.send) {
        process.send('ready');
        event('Sent "ready" to PM2');
    } else {
        warn('process.send is undefined, retrying in 1 second...');
        setTimeout(sendReady, 1000);
    }
};
