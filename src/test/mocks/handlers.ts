import { http, HttpResponse } from 'msw';

// Mock rules sources data
export const mockRulesSources = [
  {
    id: 'source-pdf-1',
    campaign_id: 'campaign-1',
    type: 'pdf',
    title: 'Core Rulebook',
    tags: ['core', 'v2'],
    storage_path: 'campaign-1/rulebook.pdf',
    github_repo_url: null,
    github_json_path: null,
    github_imported_at: null,
    index_status: 'indexed',
    index_stats: { pages: 50, sections: 12, chunks: 150, tablesHigh: 8, tablesLow: 3, datasets: 2 },
    index_error: null,
    last_indexed_at: '2024-01-15T10:00:00Z',
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'source-paste-1',
    campaign_id: 'campaign-1',
    type: 'paste',
    title: 'House Rules',
    tags: ['custom'],
    storage_path: null,
    github_repo_url: null,
    github_json_path: null,
    github_imported_at: null,
    index_status: 'not_indexed',
    index_stats: null,
    index_error: null,
    last_indexed_at: null,
    created_at: '2024-01-12T10:00:00Z',
    updated_at: '2024-01-12T10:00:00Z',
  },
  {
    id: 'source-github-1',
    campaign_id: 'campaign-1',
    type: 'github_json',
    title: 'Community Pack',
    tags: ['community'],
    storage_path: null,
    github_repo_url: 'https://github.com/example/rules',
    github_json_path: 'data/rules.json',
    github_imported_at: null,
    index_status: 'failed',
    index_stats: null,
    index_error: { stage: 'github', message: 'Repository not found' },
    last_indexed_at: null,
    created_at: '2024-01-13T10:00:00Z',
    updated_at: '2024-01-13T10:00:00Z',
  },
];

export const mockRulesChunks = [
  {
    id: 'chunk-1',
    source_id: 'source-pdf-1',
    section_id: 'section-1',
    text: 'Roll a D6 to determine the outcome of combat...',
    page_start: 15,
    page_end: 15,
    section_path: ['Combat', 'Melee'],
    order_index: 0,
    keywords: ['combat', 'melee', 'd6'],
    score_hints: { hasRollRanges: true, hasTablePattern: false },
    created_at: '2024-01-15T10:00:00Z',
  },
];

export const mockRulesTables = [
  {
    id: 'table-1',
    source_id: 'source-pdf-1',
    section_id: 'section-1',
    title_guess: 'Injury Table',
    header_context: 'Post-Battle Sequence',
    page_number: 42,
    raw_text: '| D6 | Result |\n|1-2| Minor Wound |\n|3-4| Serious Injury |',
    parsed_rows: [
      { roll: '1-2', result: 'Minor Wound' },
      { roll: '3-4', result: 'Serious Injury' },
    ],
    confidence: 'high',
    keywords: ['injury', 'd6', 'wound'],
    created_at: '2024-01-15T10:00:00Z',
  },
];

export const mockRulesDatasets = [
  {
    id: 'dataset-1',
    source_id: 'source-pdf-1',
    name: 'Weapons List',
    dataset_type: 'equipment',
    fields: ['name', 'range', 'strength', 'cost'],
    confidence: 'high',
    created_at: '2024-01-15T10:00:00Z',
  },
];

// MSW handlers for Supabase REST API
const SUPABASE_URL = 'https://test.supabase.co';

export const handlers = [
  // Rules sources
  http.get(`${SUPABASE_URL}/rest/v1/rules_sources`, () => {
    return HttpResponse.json(mockRulesSources);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/rules_sources`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: 'new-source-id',
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),

  // Rules chunks
  http.get(`${SUPABASE_URL}/rest/v1/rules_chunks`, () => {
    return HttpResponse.json(mockRulesChunks);
  }),

  // Rules tables
  http.get(`${SUPABASE_URL}/rest/v1/rules_tables`, () => {
    return HttpResponse.json(mockRulesTables);
  }),

  // Rules datasets
  http.get(`${SUPABASE_URL}/rest/v1/rules_datasets`, () => {
    return HttpResponse.json(mockRulesDatasets);
  }),

  // Edge function: index-rules-source
  http.post(`${SUPABASE_URL}/functions/v1/index-rules-source`, async ({ request }) => {
    const body = await request.json() as { sourceId: string };
    return HttpResponse.json({
      success: true,
      message: `Indexed source ${body.sourceId}`,
    });
  }),

  // Edge function: ai-component-builder
  http.post(`${SUPABASE_URL}/functions/v1/ai-component-builder`, async () => {
    return HttpResponse.json({
      message: 'Found 3 tables in the post-battle sequence',
      components: [
        {
          type: 'table',
          data: {
            title: 'Injury Table',
            columns: ['Roll', 'Result'],
            rows: [{ Roll: '1-2', Result: 'Minor Wound' }],
          },
          dataSource: 'rules',
        },
      ],
    });
  }),
];
