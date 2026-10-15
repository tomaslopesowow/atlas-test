import dynamic from 'next/dynamic';

export const Sheet = dynamic(() => import('./sheet').then((m) => m.Sheet));

export const SheetPortal = dynamic(() =>
    import('./sheet').then((m) => m.SheetPortal),
);

export const SheetOverlay = dynamic(() =>
    import('./sheet').then((m) => m.SheetOverlay),
);

export const SheetTrigger = dynamic(() =>
    import('./sheet').then((m) => m.SheetTrigger),
);

export const SheetClose = dynamic(() =>
    import('./sheet').then((m) => m.SheetClose),
);

export const SheetContent = dynamic(() =>
    import('./sheet').then((m) => m.SheetContent),
);

export const SheetBody = dynamic(() =>
    import('./sheet').then((m) => m.SheetBody),
);

export const SheetHeader = dynamic(() =>
    import('./sheet').then((m) => m.SheetHeader),
);

export const SheetFooter = dynamic(() =>
    import('./sheet').then((m) => m.SheetFooter),
);

export const SheetTitle = dynamic(() =>
    import('./sheet').then((m) => m.SheetTitle),
);

export const SheetDescription = dynamic(() =>
    import('./sheet').then((m) => m.SheetDescription),
);
