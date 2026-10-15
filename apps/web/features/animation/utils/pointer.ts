import { createNormalizedVec2, createVec2 } from './vectors';
type mouseContext = 'client' | 'page' | 'screen';

let mouseEvent: MouseEvent | null = null;
let mouseEventListenersCreated = false;

export const getMousePosition = () => {
    if (!mouseEventListenersCreated) {
        createEventListener('mousemove');
        mouseEventListenersCreated = true;
    }
    return {
        get client() {
            return createMousePosition('client');
        },
        get page() {
            return createMousePosition('page');
        },
        get screen() {
            return createMousePosition('screen');
        },
    };
};

const createEventListener = (event: 'mousemove') => {
    window.addEventListener(
        event,
        (event) => {
            mouseEvent = event;
        },
        {
            passive: true,
        },
    );
};

const createMousePosition = (context: mouseContext) => {
    return createNormalizedVec2(
        createMousePositionsFromEvent()[context],
        createDimensions()[context],
    );
};

const createMousePositionsFromEvent = () => {
    return {
        client: createVec2(mouseEvent?.clientX ?? 0, mouseEvent?.clientY ?? 0),
        page: createVec2(mouseEvent?.pageX ?? 0, mouseEvent?.pageY ?? 0),
        screen: createVec2(mouseEvent?.screenX ?? 0, mouseEvent?.screenY ?? 0),
    };
};

const createDimensions = () => {
    return {
        client: createVec2(window.innerWidth, window.innerHeight),
        page: createVec2(
            document.documentElement.scrollWidth,
            document.documentElement.scrollHeight,
        ),
        screen: createVec2(screen.width, screen.height),
    };
};
