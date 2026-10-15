import { render, toPlainText } from 'react-email';

export const renderHtmlAndText = async (...args: Parameters<typeof render>) => {
    const html = await render(...args);
    const text = toPlainText(html);
    return { html, text };
};
