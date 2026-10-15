import { Link } from 'react-router';
import { Tooltip } from './Tooltip';

/** An icon with its label in a tooltip: a link given `href`, else a button; `of`, e.g. a row's title, tells a list of them apart. */
export function IconButton({
    icon,
    label,
    of,
    href,
    variant = 'ghost',
    align = 'center',
    tooltipClassName,
    className = '',
    ...button
}: {
    icon: React.ReactNode;
    label: string;
    of?: string;
    href?: string;
    variant?: 'ghost' | 'outline' | 'destructive';
    align?: 'center' | 'end';
    tooltipClassName?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
    const props = {
        className: `btn btn-${variant} btn-icon ${className}`,
        'aria-label': of ? `${label} ${of}` : label,
    };

    return (
        <Tooltip content={label} align={align} className={tooltipClassName}>
            {href ? (
                <Link to={href} {...props}>
                    {icon}
                </Link>
            ) : (
                <button type="button" {...button} {...props}>
                    {icon}
                </button>
            )}
        </Tooltip>
    );
}
