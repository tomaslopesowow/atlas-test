import type { DedupSensitivity } from '@repo/content-pipeline/pipeline/dedup-sensitivity';
import { type AppLocale, I18N_LOCALES } from '@repo/i18n/shared';
import type { Payload } from 'payload';

/**
 * Default brand-style guidance for generated cover images. Look-and-feel only
 * (palette/mood/composition) — the article topic is added automatically. Keep
 * it neutral here; each client describes their own palette in words (avoid hex
 * codes, the model ignores them). Shared by the admin field default and the
 * runtime fallback, so a settings global saved before this field existed still
 * produces a usable image.
 */
export const DEFAULT_IMAGE_STYLE_PROMPT =
    'Editorial mixed-media collage: black-and-white halftone photo cut-outs combined with flat vector shapes and a couple of bright accent colours on a soft, single-colour pastel background. Confident, modern, magazine-poster energy — rich and dense but not cluttered.';

/** Normalized, ready-to-use pipeline configuration with fallbacks applied. */
export type PipelineSettings = {
    seedTerms: string[];
    competitorDomains: string[];
    ownDomain?: string;
    searchLocationCode: number;
    searchLanguageCode: string;
    minVolume: number;
    maxDifficulty: number;
    brandVoice: string;
    /** What the business does — woven into the brief + article prompts. */
    businessContext: string;
    /** e.g. "B2B project-management software". Drives the writer persona. */
    industry: string;
    /** e.g. "operations managers at mid-size agencies". Drives the framing. */
    audience: string;
    /** Domains of hands-on experience for the E-E-A-T worked-example line. */
    experienceDomains: string;
    targetLocales: AppLocale[];
    postsPerWeek: number;
    /** Recipients for the "drafts ready" email. */
    notificationEmails: string[];
    /** How aggressively the near-duplicate gate drops overlapping topics. */
    dedupSensitivity: DedupSensitivity;
    /** Taxonomy type assigned to generated article pages (e.g. "news"). */
    taxonomyType: string;
    /** Optional author (person) byline for generated pages. */
    authorId?: string;
    /** Generate a branded AI cover image for each draft page. */
    enableImageGeneration: boolean;
    /** Brand look-and-feel guidance woven into the image prompt. */
    imageStylePrompt: string;
    /** Aspect ratio for generated cover images (e.g. "16:9"). */
    imageAspectRatio: string;
};

/**
 * Reads the `content-pipeline-settings` global and applies fallbacks. The
 * pipeline writes draft `pages` of the configured `taxonomyType`; their public
 * path is resolved from `settings.<taxonomyType>.overviewPage`, so that
 * overview page must exist for generated pages to get a sensible URL.
 */
export async function loadPipelineSettings(
    payload: Payload,
): Promise<PipelineSettings> {
    const settings = await payload.findGlobal({
        slug: 'content-pipeline-settings',
        depth: 0,
    });

    const seedTerms = (settings.seedTerms ?? [])
        .map((s) => s.term)
        .filter((term): term is string => !!term);

    const competitorDomains = (settings.competitorDomains ?? [])
        .map((c) => c.domain)
        .filter((domain): domain is string => !!domain);

    const targetLocales =
        Array.isArray(settings.targetLocales) && settings.targetLocales.length
            ? (settings.targetLocales as AppLocale[])
            : [...I18N_LOCALES];

    const notificationEmails = (settings.notificationEmails ?? [])
        .map((n) => n.email)
        .filter((email): email is string => !!email);

    return {
        seedTerms,
        competitorDomains,
        ownDomain: settings.ownDomain || undefined,
        searchLocationCode: settings.searchLocationCode ?? 2840,
        searchLanguageCode: settings.searchLanguageCode ?? 'en',
        minVolume: settings.minVolume ?? 100,
        maxDifficulty: settings.maxDifficulty ?? 60,
        brandVoice: settings.brandVoice ?? '',
        businessContext: settings.businessContext ?? '',
        industry: settings.industry ?? '',
        audience: settings.audience ?? '',
        experienceDomains: settings.experienceDomains ?? '',
        targetLocales,
        postsPerWeek: settings.postsPerWeek ?? 2,
        notificationEmails,
        dedupSensitivity:
            (settings.dedupSensitivity as
                | DedupSensitivity
                | null
                | undefined) ?? 'duplicates-only',
        taxonomyType: settings.taxonomyType || 'news',
        authorId: relationshipId(settings.defaultAuthor),
        enableImageGeneration: settings.enableImageGeneration ?? false,
        imageStylePrompt:
            settings.imageStylePrompt ?? DEFAULT_IMAGE_STYLE_PROMPT,
        imageAspectRatio: settings.imageAspectRatio ?? '16:9',
    };
}

/** Extracts a document id from a Payload relationship value (id or populated doc). */
function relationshipId(rel: unknown): string | undefined {
    if (!rel) return undefined;
    if (typeof rel === 'string' || typeof rel === 'number') return String(rel);
    if (typeof rel === 'object' && 'id' in rel) {
        return String((rel as { id: unknown }).id);
    }
    return undefined;
}
