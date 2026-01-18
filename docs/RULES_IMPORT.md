# Rules Import System Documentation

This document describes how to import, index, and generate components from rules sources in the Campaign Console.

## Overview

The Rules Library allows Game Masters (GMs) to import rules from multiple source types, index them into a canonical format, and then use AI to generate dashboard components that stay linked to the original source data for provenance and refreshability.

## Source Types

### 1. PDF Upload

Upload PDF rulebooks directly to the campaign.

**How to use:**
1. Open the Rules Library from the campaign dashboard
2. Click "Add Source"
3. Select the "PDF" tab
4. Enter a title for the source
5. Select your PDF file
6. Click "Add PDF Source"

**What happens:**
- PDF is uploaded to storage
- Text is extracted client-side using pdf.js
- Pages are cleaned of headers/footers
- Source is ready for indexing

### 2. Copy/Paste Text

Paste rules text directly from any source.

**How to use:**
1. Open the Rules Library
2. Click "Add Source"
3. Select the "Paste" tab
4. Enter a title
5. Paste your rules text
6. Optionally set pseudo-page size (default: 6000 chars)
7. Click "Add Text Source"

**What happens:**
- Text is normalized and split into pseudo-pages for provenance
- Source is ready for indexing

### 3. GitHub JSON Import

Import structured rules from a GitHub repository containing JSON files.

**How to use:**
1. Open the Rules Library
2. Click "Add Source"
3. Select the "GitHub" tab
4. Enter a title
5. Provide the GitHub repository URL (e.g., `https://github.com/user/repo`)
6. Specify the JSON path (e.g., `data/rules.json`)
7. Click "Import from GitHub"

**Expected JSON Structure:**
```json
{
  "name": "Game System Name",
  "version": "1.0",
  "groups": [
    {
      "name": "Core Rules",
      "sections": [
        {
          "title": "Combat",
          "text": "Combat rules text here..."
        }
      ],
      "tables": [
        {
          "name": "Injury Table",
          "rows": [
            { "roll": "1-2", "result": "Minor Wound" },
            { "roll": "3-4", "result": "Serious Injury" }
          ]
        }
      ],
      "datasets": [
        {
          "name": "Equipment",
          "type": "equipment",
          "items": [
            { "name": "Sword", "cost": 10 }
          ]
        }
      ]
    }
  ]
}
```

## Indexing

After adding a source, you must index it to make the rules searchable and available for AI component generation.

**How to index:**
1. In the Rules Library, find your source
2. Click the refresh/sync icon button
3. Wait for indexing to complete

**Indexing creates:**
- **Pages**: Raw text with page numbers for provenance
- **Sections**: Hierarchical groupings with titles
- **Chunks**: ~1800 character retrieval units with 200 char overlap
- **Tables**: Detected tables with confidence scores
- **Datasets**: Structured lists (equipment, skills, etc.)

## AI Component Builder

Generate dashboard components from your indexed rules using natural language.

**How to use:**
1. Open the Dashboard
2. Click "Add Component" or use the AI Component Builder
3. Describe what you want: "Create an injury table" or "Show all equipment"
4. The AI will auto-pick the best matching rules data
5. Review and click "Create" to add to your dashboard

**Auto-Pick Scoring:**
The AI prioritizes sources in this order:
1. **Datasets** (highest confidence, structured data)
2. **Tables** (detected tables ranked by confidence)
3. **Chunks** (text chunks for general content)

**Provenance:**
Components store references to the original source data:
- `sourceId`: The rules source
- `tableId`: Specific table (if applicable)
- `datasetId`: Specific dataset (if applicable)
- `chunkIds`: Text chunks used (for unstructured content)

This allows components to be refreshed when source data is updated.

## Permissions

- **GMs** can add, edit, delete sources and manage indexing
- **Players** can view the sources list but cannot modify

## Troubleshooting

### Indexing Failed

If indexing fails, click "View Diagnostics" to see the error details:
- **Scanned PDF**: The PDF contains images, not text
- **Invalid JSON**: GitHub JSON doesn't match expected structure
- **Auth Error**: Repository is private or inaccessible

### Missing Content

The system preserves ALL text from sources:
- PDF: All pages are stored
- Paste: All text is normalized into pseudo-pages
- GitHub: All groups/sections/tables are mapped

### Empty Tables

If tables aren't detected:
- Check that tables use consistent formatting
- Consider adding as paste source with clearer structure
- Use GitHub JSON for guaranteed table detection

## Testing

Run tests with:
```bash
npm run test
```

Test coverage includes:
- Rules UI form validation
- Indexing status updates
- AI component builder flow
- Permission enforcement
