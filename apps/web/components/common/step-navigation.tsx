import { ScrollProgressIndicator } from '@/components/common/scroll-progress-indicator';
import { cn } from '@/features/shadcn/utils/ui';
import type { StepsNavigationStep } from '@/types/shared';
import Link from 'next/link';

const LINK_POSITION_CLASSNAMES = [
    '-translate-y-12',
    '-translate-y-8 translate-x-8',
    'translate-x-12',
];

type StepNavigationProps = {
    title: string;
    currentStep: Omit<StepsNavigationStep, 'permalink'>;
    steps: StepsNavigationStep[];
};

const formatLabel = (index: number) => String(index).padStart(2, '0');

export const StepNavigation = async ({
    title,
    currentStep,
    steps,
}: StepNavigationProps) => {
    return (
        <div className="group size-20 fixed bottom-10 left-10 hidden lg:flex justify-start items-end z-50 cursor-pointer">
            <div className="flex items-center justify-center">
                <ScrollProgressIndicator
                    content={
                        <span className="text-sm font-serif italic">
                            {formatLabel(currentStep.index)}
                        </span>
                    }
                    rotateContent={false}
                />
                <p className="text-xs font-sweet-sans-pro uppercase group-hover:opacity-0 transition-opacity duration-300 absolute left-14">
                    {title}
                </p>
                {steps
                    .sort((a, b) => a.index - b.index)
                    .map(({ index: stepIndex, permalink }, index) => (
                        <Link
                            key={permalink}
                            className={cn(
                                LINK_POSITION_CLASSNAMES[index],
                                'size-8 text-xs font-serif italic absolute border border-secondary hover:border-primary rounded-full flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                                {
                                    'pointer-events-none group-hover:opacity-30':
                                        stepIndex === currentStep.index,
                                },
                            )}
                            href={permalink}
                        >
                            {formatLabel(stepIndex)}
                        </Link>
                    ))}
            </div>
        </div>
    );
};
