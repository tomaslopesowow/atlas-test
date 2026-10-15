import { useEffect } from 'react';

const OUT = 150;

/** Closes a popover's details or a dialog after the exit animation its `data-closing` starts. */
export function dismiss(element: HTMLDetailsElement | HTMLDialogElement) {
    if (element.dataset.closing !== undefined) return;

    const close = () => {
        delete element.dataset.closing;
        if (element instanceof HTMLDialogElement) element.close();
        else element.open = false;
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        return close();

    element.dataset.closing = '';
    setTimeout(close, OUT);
}

const openPopovers = () =>
    document.querySelectorAll<HTMLDetailsElement>('details[open]');

const closeOutside = (target: Node) => {
    for (const details of openPopovers())
        if (!details.contains(target)) dismiss(details);
};

/** Closes popovers on a click or Tab outside, a second click on their button or Escape, and dialogs on their backdrop or Escape. */
export function DismissLayer() {
    useEffect(() => {
        // where the pointer went down, as a drag from a dialog's box to its backdrop clicks the dialog too
        let pressed: EventTarget | null = null;

        const pointerDown = (event: PointerEvent) => {
            pressed = event.target;
            closeOutside(event.target as Node);
        };

        const focusIn = (event: FocusEvent) =>
            closeOutside(event.target as Node);

        const click = (event: MouseEvent) => {
            const target = event.target as Element;
            const summary = target.closest('summary');
            const details = summary?.parentElement;

            // a second click on the button closes it with the animation, not at once
            if (details instanceof HTMLDetailsElement && details.open) {
                event.preventDefault();
                dismiss(details);
            }

            // the backdrop belongs to the dialog element, so a click outside its box is on the backdrop
            if (
                target instanceof HTMLDialogElement &&
                target.open &&
                pressed === target
            ) {
                const box = target.getBoundingClientRect();
                const outside =
                    event.clientX < box.left ||
                    event.clientX > box.right ||
                    event.clientY < box.top ||
                    event.clientY > box.bottom;

                if (outside) dismiss(target);
            }
        };

        const keyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;

            for (const details of openPopovers()) {
                // focus within what closes goes back to its button, rather than to the page
                if (details.contains(document.activeElement))
                    details.querySelector('summary')?.focus();
                dismiss(details);
            }
        };

        // the browser's own Escape on a dialog closes it at once; this closes it with the animation
        const cancel = (event: Event) => {
            if (event.target instanceof HTMLDialogElement) {
                event.preventDefault();
                dismiss(event.target);
            }
        };

        document.addEventListener('pointerdown', pointerDown);
        document.addEventListener('focusin', focusIn);
        document.addEventListener('click', click);
        document.addEventListener('keydown', keyDown);
        document.addEventListener('cancel', cancel, true);

        return () => {
            document.removeEventListener('pointerdown', pointerDown);
            document.removeEventListener('focusin', focusIn);
            document.removeEventListener('click', click);
            document.removeEventListener('keydown', keyDown);
            document.removeEventListener('cancel', cancel, true);
        };
    }, []);

    return null;
}
