import { getSiteUrl } from '@/utils/get-site-url';
import { getLocale } from 'next-intl/server';
import { getPayloadClient } from '../client';
import { getBrand } from './get-brand';
import { getFooter } from './get-footer';
import { getIntegrations } from './get-integrations';
import { getNavigation } from './get-navigation';
import { getSettings } from './get-settings';

/**
 * Preloads essential data for the application by triggering data fetching in parallel
 *
 * This function initiates requests for:
 * - Brand information
 * - Navigation structure
 * - Footer content
 *
 * The void operator is used to explicitly ignore the Promise results since we only
 * want to trigger the requests for caching purposes.
 */
export const preload = () => {
    void getSiteUrl();
    void getPayloadClient();
    void getLocale();
    void getBrand();
    void getFooter();
    void getIntegrations();
    void getNavigation();
    void getSettings();
};
