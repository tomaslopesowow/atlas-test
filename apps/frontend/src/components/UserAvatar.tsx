import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { imageUrl, type UserSummary } from '../api';

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join('') || '?';

interface UserAvatarProps {
    user: UserSummary;
    size?: 'sm' | 'default' | 'lg';
    /** Which of the picture's sizes to load. */
    image?: string;
    className?: string;
}

/** shadcn's Avatar with the user's picture, or their initials while there is none. */
export function UserAvatar({
    user,
    size,
    image = 'thumb',
    className,
}: UserAvatarProps) {
    return (
        <Avatar size={size} className={className}>
            {user.avatar && (
                <AvatarImage
                    src={imageUrl(user.avatar, image)}
                    alt={user.name}
                />
            )}
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
    );
}
