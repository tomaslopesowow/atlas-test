'use client';

const ENABLED = false;

window.addEventListener('load', () => {
    if (!ENABLED) return;

    const docWidth = document.documentElement.offsetWidth;
    let scrollBarWidth: number;

    const mutationObserver = new MutationObserver((list) => {
        for (const record of list) {
            if (
                record.target === document.documentElement &&
                record.type === 'attributes'
            ) {
                const currentDocWidth = document.documentElement.offsetWidth;
                scrollBarWidth = Math.abs(currentDocWidth - docWidth);
                document.body.style.paddingRight = `${scrollBarWidth}px`;
            }
        }
    });

    mutationObserver.observe(document.documentElement, { attributes: true });
});
