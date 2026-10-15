# CraftCMS Tag to Payload News Taxonomy Mapping

This document defines how CraftCMS tags should be mapped to Payload CMS news taxonomy categories during migration.

## Payload News Taxonomy Categories

Based on `features/payload/features/taxonomies/taxonomies.ts` line 72, the available categories are:

- `milestones`
- `innovation`
- `sustainability`
- `design`
- `crafting`
- `perspectives`
- `events`

## Tag Mapping Rules

### 1. Design
**Payload Category**: `design`

**CraftCMS Tags** (Usage count in parentheses):
- `design` (798)
- `glass` (183)
- `studio-de-voogt` (151)
- `concept-design` (1)
- `super-yacht-design` (1)
- `smart-design` (1)
- `naval-architecture-design` (7)
- `architecture` (1)
- `spiral` (1)

**Rationale**: Tags directly related to yacht design, aesthetics, architectural aspects, and design studios.

---

### 2. Innovation
**Payload Category**: `innovation`

**CraftCMS Tags** (Usage count in parentheses):
- `innovation` (546)
- `future-concepts` (275)
- `ai` (102)
- `automation` (1)
- `big-data` (1)
- `machine-learning` (1)
- `technology` (1)
- `data` (143)
- `systems` (1)
- `smart-design` (1) *[overlap with design]*

**Rationale**: Tags focused on technological advancement, future thinking, artificial intelligence, and data-driven innovation.

---

### 3. Sustainability
**Payload Category**: `sustainability`

**CraftCMS Tags** (Usage count in parentheses):
- `sustainability` (259)
- `energy` (214)
- `fuel` (157)
- `methanol` (106)
- `fuel-cells` (102)
- `nuclear` (102)
- `green-technology` (1)
- `emissions` (1)
- `hydrogen` (1)
- `hvo` (1)
- `biofuel` (1)
- `alternative-fuel` (1)
- `gtl` (2)
- `batteries` (2)
- `electric` (1)
- `solar` (1)
- `fuel-cell` (1)
- `sustainable-fuel` (0)
- `carbon-reduction` (0)
- `net-zero-co2-fuel` (0)

**Rationale**: Tags related to environmental sustainability, clean energy, alternative fuels, and emissions reduction.

---

### 4. Crafting
**Payload Category**: `crafting`

**CraftCMS Tags** (Usage count in parentheses):
- `craftsmanship` (1)
- `quality` (1)
- `dna` (2)
- `composite` (1)
- `aluminium` (1)
- `teak` (1)
- `wood` (1)
- `paint` (1)
- `alternative-decking` (1)

**Rationale**: Tags focused on materials, construction techniques, craftsmanship, and build quality.

---

### 5. Perspectives
**Payload Category**: `perspectives`

**CraftCMS Tags** (Usage count in parentheses):
- `public-opinion` (1)
- `trends` (1)
- `super-yacht-trends` (1)
- `luxury` (1)
- `uniquity` (1)
- `comfort` (1)
- `performance` (1)

**Rationale**: Tags representing opinions, trends, luxury lifestyle perspectives, and industry insights.

---

### 6. Events
**Payload Category**: `events`

**CraftCMS Tags** (Usage count in parentheses):
- `events` (113)
- `boat-shows` (1)
- `flibs` (78)
- `flibs23` (8)
- `mys` (79)
- `mys22` (8)
- `mys23` (8)
- `monaco-yacht-show` (8)
- `yacht-show` (8)
- `hiswa` (1)
- `fort-lauderdale` (73)
- `monaco` (100)
- `miami` (41)
- `singapore` (40)
- `dubai` (40)
- `palm-beach` (33)
- `venice` (8)
- `port-hercule` (8)

**Rationale**: Tags related to yacht shows, exhibitions, locations of events, and industry gatherings.

---

### 7. Milestones
**Payload Category**: `milestones`

**CraftCMS Tags** (Usage count in parentheses):
- `launch` (300)
- `first` (1)
- `heritage` (12)
- `anniversary` (12)
- `70-years` (73)
- `heritage-fleet` (12)
- `feadship` (10)
- `unveils` (402)
- `transport` (11)
- `laucnh` (1) *[typo for launch]*
- `launh` (1) *[typo for launch]*
- `outofshed` (11)
- `seatr` (11) *[sea trials]*
- `seatrial` (11)
- `sea-trials` (18)

**Rationale**: Tags marking significant company achievements, launches, anniversaries, and historical milestones.

---

## Unmapped Tags

The following tags are significant but don't clearly fit into the above categories. These should be preserved as additional metadata but not mapped to primary taxonomy categories:

### Yacht-Specific Tags (Project names, hull numbers)
- `project-710`, `project-824`, `project-825`, `project822`, etc.
- Individual yacht names: `faith`, `joy`, `symphony`, `avatar`, `venus`, etc.
- Hull numbers: `3073`, `685`, `704`, `705`, `710`, `816`, `817`, `822`, `824`, `825`

### Yacht Types & Features
- `refit` (182)
- `rebuild` (0)
- `newbuild` (11)
- `new-build` (1)
- `semi-custom` (1)
- `tender` (10)
- `sportfisher` (0)
- `exploration` (1)

### Technical Features
- `motion` (102)
- `motions` (1)
- `poolslosh` (102)
- `bow` (1)
- `pool` (1)
- `speed` (1)
- `contrawave` (1)

### Locations (Non-event)
- `makkum` (76)
- `aalsmeer` (74)
- `amsterdam` (75)
- `kaag` (44)
- `florida` (8)
- `usa` (38)
- `netherlands` (11)
- `china` (73)

### Company References
- `de-voogt` (1)
- `van-lent` (0)
- `royal-van-lent-shipyard` (0)
- `feadship-academy` (20)
- `tenderworks` (10)

### Regulations & Classification
- `regulations` (1)
- `rules` (1)
- `flag` (1)
- `class` (1)
- `gt` (1)
- `cbe` (19)

### Awards & Recognition
- `awards` (302)
- `superyacht-award` (40)
- `world-superyacht-awards` (8)
- `wsa` (16)

### Media & Content Types
- `feadship-tv` (45)
- `podcast` (11)
- `webinar` (1)
- `shoot` (27)
- `stories` (49)
- `social` (3)

### Industry Terms
- `superyachts` (102)
- `yachting-industry` (1)
- `yacht` (1)
- `superyacht` (8)
- `brokers` (20)
- `charter` (33)
- `captains-summit` (19)
- `crew` (implied by context)

### Other
- `marketing` (1)
- `recap` (69)
- `recap-2019` (72)
- `overview` (301)
- Year tags: `2016`, `2017`, `2018`, `2019`, `2020`, `2022`, `2023`, `2024`

---

## Implementation Notes

### Multi-Tag Articles
Many articles have multiple tags. The mapping logic should:
1. Check each tag against the mapping rules above
2. Assign the article to ALL matching taxonomy categories
3. Preserve all original tags in a separate field for reference

### Priority Rules
When an article has tags from multiple categories:
1. All matching categories should be applied (taxonomies are not mutually exclusive)
2. The primary category should be determined by:
   - Explicit priority if defined by editors
   - First matching category in this order: milestones → innovation → sustainability → design → crafting → perspectives → events

### Tag Typos
The following typos should be normalized during import:
- `laucnh` → `launch`
- `launh` → `launch`
- `seatr` → `sea-trials`
- `project822` → `project-822`

### Synonym Handling
Some tags are synonyms and should be treated identically:
- `fuel-cell` = `fuel-cells`
- `seatrial` = `sea-trials`
- `mys` = `monaco-yacht-show` (MYS is the abbreviation)
- `flibs` = Fort Lauderdale International Boat Show

---

## Statistics

- **Total unique tags**: 293
- **Tags with usage**: 275
- **Unused tags**: 18
- **Top tag**: `design` (798 articles)
- **Taxonomy-mapped tags**: ~80-90 tags
- **Unmapped but preserved tags**: ~200+ tags

---

## Migration Strategy

1. **Extract all tags**: Create `unique-tags.jsonl` with all CraftCMS tags ✅
2. **Map to taxonomies**: During article import, map tags to Payload taxonomy categories using this document
3. **Preserve originals**: Store all original CraftCMS tags in a separate field for reference
4. **Create taxonomy terms**: Auto-create taxonomy documents in Payload for each unique mapped category
5. **Link articles**: Create relationships between articles and their taxonomy categories

---

## Usage in Code

```typescript
// Example mapping function
const TAG_TO_TAXONOMY_MAP = {
  'design': 'design',
  'glass': 'design',
  'studio-de-voogt': 'design',
  'innovation': 'innovation',
  'future-concepts': 'innovation',
  'ai': 'innovation',
  'sustainability': 'sustainability',
  'energy': 'sustainability',
  'fuel': 'sustainability',
  // ... etc
};

function mapTagsToTaxonomies(tags: string[]): string[] {
  const taxonomies = new Set<string>();

  for (const tag of tags) {
    const taxonomy = TAG_TO_TAXONOMY_MAP[tag];
    if (taxonomy) {
      taxonomies.add(taxonomy);
    }
  }

  return Array.from(taxonomies);
}
```

---

_Generated: 2025-12-31_
_Based on CraftCMS database export analysis_
_Reference: `features/payload/features/taxonomies/taxonomies.ts` line 72_
