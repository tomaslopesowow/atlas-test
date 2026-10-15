import CompassNeedle from '../icons/compass-needle';

export const StyledDivider = () => (
    <div className="w-full max-w-80 flex gap-x-4 items-center">
        <div className="w-full h-[1px] bg-invert" />
        <CompassNeedle className="text-primary size-16" />
        <div className="w-full h-[1px] bg-invert" />
    </div>
);
