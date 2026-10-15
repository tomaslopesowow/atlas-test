import {
    ArrowDown,
    ArrowUp,
    Bell,
    Calendar,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ChevronsUpDown,
    CirclePlus,
    Contrast,
    Eye,
    History,
    House,
    LogOut,
    type LucideIcon,
    Menu,
    Monitor,
    Moon,
    Pencil,
    Plus,
    Rows3,
    Rows4,
    Search,
    Sun,
    Table,
    Trash2,
    X,
} from 'lucide-react';

// lucide's icons under the panel's names, 16px unless where they sit sizes them, and hidden from
// screen readers, as each sits by a label or is given one
const icon = (Lucide: LucideIcon) => () => (
    <Lucide size={16} aria-hidden="true" />
);

export const CalendarIcon = icon(Calendar);
export const ChevronLeftIcon = icon(ChevronLeft);
export const ChevronRightIcon = icon(ChevronRight);
export const ChevronsLeftIcon = icon(ChevronsLeft);
export const ChevronsRightIcon = icon(ChevronsRight);
export const ChevronDownIcon = icon(ChevronDown);
export const PlusIcon = icon(Plus);
export const SearchIcon = icon(Search);
export const XIcon = icon(X);
export const HomeIcon = icon(House);
export const HistoryIcon = icon(History);
export const TableIcon = icon(Table);
export const BellIcon = icon(Bell);
export const ThemeIcon = icon(Contrast);
export const LogOutIcon = icon(LogOut);
export const SunIcon = icon(Sun);
export const MoonIcon = icon(Moon);
export const MonitorIcon = icon(Monitor);
export const TrashIcon = icon(Trash2);
export const ViewIcon = icon(Eye);
export const EditIcon = icon(Pencil);
export const MenuIcon = icon(Menu);
export const RowsIcon = icon(Rows3);
export const CompactRowsIcon = icon(Rows4);
export const PlusCircleIcon = icon(CirclePlus);
export const CheckIcon = icon(Check);

export function SortIcon({ direction }: { direction?: 'asc' | 'desc' }) {
    const Lucide =
        direction === 'asc'
            ? ArrowUp
            : direction === 'desc'
              ? ArrowDown
              : ChevronsUpDown;

    return <Lucide size={16} aria-hidden="true" />;
}
