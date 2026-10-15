export {
    LAYOUT_MODES,
    SORT_OPTIONS,
    FILTER_OPTIONS,
} from '../common/filter-shared';
export type {
    OverviewFilters,
    OverviewFilterOption,
} from '../common/filter-shared';

/** @deprecated Use OverviewFilters from common/filter-shared instead */
export type { OverviewFilters as FleetFilters } from '../common/filter-shared';
/** @deprecated Use OverviewFilterOption from common/filter-shared instead */
export type { OverviewFilterOption as FleetFilterOption } from '../common/filter-shared';

export const DISPLAY_MODES = ['spotlight', 'all'] as const;
