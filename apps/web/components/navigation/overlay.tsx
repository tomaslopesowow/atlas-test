import { cn } from '@/features/shadcn/utils/ui';
const OVERLAY_OPACITY = 0.5;

interface NavigationOverlayProps {
    isOpen: boolean;
    className?: string;
}

export const NavigationOverlay = ({
    isOpen,
    className,
}: NavigationOverlayProps) => (
    <div
        className={cn(
            'fixed inset-0 z-40 bg-[black] dark transition-opacity pointer-events-none',
            className,
        )}
        style={{
            opacity: isOpen ? OVERLAY_OPACITY : 0,
            transitionDuration: 'calc(var(--nav-open-duration) / 2)',
            transitionDelay: !isOpen
                ? 'calc(var(--nav-open-duration) / 2)'
                : '0s',
            viewTransitionName: 'navigation-overlay',
        }}
    />
);
