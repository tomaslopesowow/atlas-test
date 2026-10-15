import { describe, expect, it } from 'vitest';
import {
    extractPeopleAlsoAskQuestions,
    type SerpOrganicResult,
} from '../../src/dataforseo/people-also-ask';

/** Mirrors an organic result containing one People Also Ask block. */
const fixture: SerpOrganicResult[] = [
    {
        items: [
            { type: 'organic' },
            {
                type: 'people_also_ask',
                items: [
                    {
                        type: 'people_also_ask_element',
                        title: 'What is the meaning of order-to-cash?',
                    },
                    {
                        type: 'people_also_ask_element',
                        title: 'What is O2C and P2P?',
                    },
                    {
                        type: 'people_also_ask_element',
                        title: '  What is O2C and P2P?  ',
                    },
                    { type: 'people_also_ask_element', title: '' },
                    { type: 'people_also_ask_element', title: null },
                ],
            },
            { type: 'organic' },
        ],
    },
];

describe('extractPeopleAlsoAskQuestions', () => {
    it('extracts trimmed, deduplicated People Also Ask questions', () => {
        expect(extractPeopleAlsoAskQuestions(fixture)).toEqual([
            'What is the meaning of order-to-cash?',
            'What is O2C and P2P?',
        ]);
    });

    it('ignores unrelated result items', () => {
        const organicOnly: SerpOrganicResult[] = [
            { items: [{ type: 'organic' }, { type: 'local_pack' }] },
        ];
        expect(extractPeopleAlsoAskQuestions(organicOnly)).toEqual([]);
    });

    it('returns [] when the result has no questions or items are missing', () => {
        expect(extractPeopleAlsoAskQuestions([])).toEqual([]);
        expect(extractPeopleAlsoAskQuestions([{}])).toEqual([]);
        expect(extractPeopleAlsoAskQuestions([{ items: null }])).toEqual([]);
        expect(
            extractPeopleAlsoAskQuestions([
                { items: [{ type: 'people_also_ask', items: null }] },
            ]),
        ).toEqual([]);
    });
});
