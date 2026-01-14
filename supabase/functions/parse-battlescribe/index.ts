import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse as parseXML } from "https://deno.land/x/xml@5.4.16/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BSDATA_GALLERY_URL = 'https://github.com/BSData/gallery/releases/latest/download/bsdata.catpkg-gallery.json';

interface GalleryRepo {
  name: string;
  description: string;
  version: string;
  lastUpdated: string;
  repositoryUrl: string;
  repositoryGzipUrl: string;
  githubUrl: string;
  archived: boolean;
}

interface Gallery {
  repositories: GalleryRepo[];
}

interface CatpkgUnit {
  id?: string;
  name: string;
  costs?: Array<{ name: string; value: number }>;
  profiles?: Array<{ name: string; characteristics?: Record<string, string> }>;
  rules?: Array<{ name: string; description?: string }>;
  categories?: string[];
}

interface CatpkgCatalogue {
  id?: string;
  name: string;
  entryLinks?: Array<{ name: string; targetId?: string }>;
  selectionEntries?: CatpkgUnit[];
  sharedSelectionEntries?: CatpkgUnit[];
}

interface Catpkg {
  name: string;
  revision?: string;
  gameSystem?: {
    id: string;
    name: string;
    revision?: string;
    sharedRules?: Array<{ id: string; name: string; description?: string }>;
  };
  catalogues?: CatpkgCatalogue[];
}

// Type for parsed XML nodes
interface XmlNode {
  '@name'?: string;
  '@id'?: string;
  '@hidden'?: string;
  [key: string]: unknown;
}

// Helper to safely get attribute from XML node
function getAttr(node: XmlNode | undefined, name: string): string {
  if (!node) return '';
  const attrName = `@${name}`;
  return String(node[attrName] || '');
}

// Ensure array from XML parsed result - returns unknown[] for flexibility
function ensureArray(val: unknown): unknown[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

// Extract description from a selectionEntry's profiles
function extractDescription(entry: XmlNode): string {
  const profiles = ensureArray((entry as Record<string, unknown>).profiles);
  
  for (const profilesWrapper of profiles) {
    const pw = profilesWrapper as Record<string, unknown>;
    const profileList = ensureArray(pw?.profile);
    
    for (const profile of profileList) {
      const p = profile as Record<string, unknown>;
      const charWrapper = p?.characteristics as Record<string, unknown>;
      if (!charWrapper) continue;
      
      const characteristics = ensureArray(charWrapper?.characteristic);
      
      for (const char of characteristics) {
        const c = char as XmlNode;
        const charName = getAttr(c, 'name');
        if (charName === 'Description' || charName === 'Effect' || charName === 'Rules') {
          const text = (c as Record<string, unknown>)['#text'] || (c as Record<string, unknown>)['$text'] || '';
          return String(text).trim();
        }
      }
    }
  }
  
  return '';
}

// Parse selectionEntry to extract basic info
function parseSelectionEntry(entry: XmlNode): { name: string; id: string; description: string } | null {
  const name = getAttr(entry, 'name');
  const id = getAttr(entry, 'id');
  const hidden = getAttr(entry, 'hidden');
  
  if (!name || hidden === 'true') return null;
  
  const description = extractDescription(entry);
  
  return { name, id, description };
}

// Parse a selectionEntryGroup to extract category and its entries
function parseSelectionEntryGroup(group: XmlNode): { category: string; entries: Array<{ name: string; id: string; description: string }> } {
  const category = getAttr(group, 'name');
  const entries: Array<{ name: string; id: string; description: string }> = [];
  
  // Get direct child selectionEntries
  const g = group as Record<string, unknown>;
  const selectionsWrapper = g.selectionEntries as Record<string, unknown>;
  const selectionEntries = ensureArray(selectionsWrapper?.selectionEntry);
  
  for (const entry of selectionEntries) {
    const parsed = parseSelectionEntry(entry as XmlNode);
    if (parsed && parsed.name) {
      entries.push(parsed);
    }
  }
  
  // Check for nested selectionEntryGroups
  const nestedGroupsWrapper = g.selectionEntryGroups as Record<string, unknown>;
  const nestedGroups = ensureArray(nestedGroupsWrapper?.selectionEntryGroup);
  
  for (const nestedGroup of nestedGroups) {
    const ng = nestedGroup as XmlNode;
    const nestedCategory = getAttr(ng, 'name');
    const nestedSelectionsWrapper = (ng as Record<string, unknown>).selectionEntries as Record<string, unknown>;
    const nestedSelections = ensureArray(nestedSelectionsWrapper?.selectionEntry);
    
    for (const entry of nestedSelections) {
      const parsed = parseSelectionEntry(entry as XmlNode);
      if (parsed && parsed.name) {
        entries.push({
          ...parsed,
          name: nestedCategory ? `${nestedCategory}: ${parsed.name}` : parsed.name
        });
      }
    }
  }
  
  return { category, entries };
}

// Recursively find all selectionEntryGroups in a document
function findAllSelectionEntryGroups(obj: unknown, results: XmlNode[] = []): XmlNode[] {
  if (!obj || typeof obj !== 'object') return results;
  
  const node = obj as Record<string, unknown>;
  
  // Check if this node has selectionEntryGroups
  if (node.selectionEntryGroups) {
    const wrapper = node.selectionEntryGroups as Record<string, unknown>;
    const groups = ensureArray(wrapper?.selectionEntryGroup);
    for (const g of groups) {
      results.push(g as XmlNode);
    }
  }
  
  // Recurse into all properties
  for (const key of Object.keys(node)) {
    if (!key.startsWith('@') && !key.startsWith('#')) {
      const val = node[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          findAllSelectionEntryGroups(item, results);
        }
      } else if (typeof val === 'object') {
        findAllSelectionEntryGroups(val, results);
      }
    }
  }
  
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json();
    const { action } = body;

    // LIST: Fetch all available game systems from BSData gallery
    if (action === 'list_gallery') {
      console.log('Fetching BSData gallery...');
      const response = await fetch(BSDATA_GALLERY_URL, {
        headers: { 'User-Agent': 'Wargame-Tracker' },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch gallery: ${response.status}`);
      }
      
      const gallery: Gallery = await response.json();
      
      // Filter out archived repos and map to simpler format
      const gameSystems = gallery.repositories
        .filter(repo => !repo.archived)
        .map(repo => ({
          name: repo.name,
          description: repo.description,
          version: repo.version,
          lastUpdated: repo.lastUpdated,
          repositoryUrl: repo.repositoryUrl,
          githubUrl: repo.githubUrl,
        }))
        .sort((a, b) => a.description.localeCompare(b.description));

      console.log(`Found ${gameSystems.length} game systems`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        gameSystems,
        count: gameSystems.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // LIST FILES: List .cat files from a GitHub repo
    if (action === 'list_repo_files') {
      const { githubUrl } = body;
      
      if (!githubUrl) {
        return new Response(JSON.stringify({ error: 'Missing githubUrl' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Convert GitHub URL to API URL
      const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (!match) {
        return new Response(JSON.stringify({ error: 'Invalid GitHub URL' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const [, owner, repo] = match;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
      
      console.log(`Fetching repo contents from: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        headers: { 
          'User-Agent': 'Wargame-Tracker',
          'Accept': 'application/vnd.github.v3+json'
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch repo: ${response.status}`);
      }
      
      const contents = await response.json();
      
      // Filter to .cat and .gst files
      const catalogueFiles = contents
        .filter((file: { name: string; type: string }) => 
          file.type === 'file' && (file.name.endsWith('.cat') || file.name.endsWith('.gst'))
        )
        .map((file: { name: string; download_url: string; path: string }) => ({
          name: file.name.replace(/\.(cat|gst)$/, ''),
          fileName: file.name,
          downloadUrl: file.download_url,
          path: file.path,
          type: file.name.endsWith('.gst') ? 'gamesystem' : 'catalogue'
        }));

      console.log(`Found ${catalogueFiles.length} catalogue files`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        files: catalogueFiles,
        count: catalogueFiles.length,
        repoOwner: owner,
        repoName: repo
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // PARSE CATALOGUE: Parse a .cat file and extract campaign rules
    if (action === 'parse_catalogue') {
      const { downloadUrl, fileName, gameSystemId, categoryPrefix } = body;
      
      if (!downloadUrl || !gameSystemId) {
        return new Response(JSON.stringify({ error: 'Missing downloadUrl or gameSystemId' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      console.log(`Parsing catalogue: ${fileName || downloadUrl}`);
      
      // Fetch the raw XML file
      const response = await fetch(downloadUrl, {
        headers: { 'User-Agent': 'Wargame-Tracker' },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch catalogue: ${response.status}`);
      }
      
      const xmlText = await response.text();
      console.log(`Fetched ${xmlText.length} bytes of XML`);
      
      // Parse XML using deno xml library
      const doc = parseXML(xmlText) as Record<string, XmlNode>;
      
      if (!doc) {
        throw new Error('Failed to parse XML');
      }

      // Get catalogue name from root element
      const catalogue = doc.catalogue as XmlNode;
      const catalogueName = getAttr(catalogue, 'name') || fileName || 'Unknown';
      console.log(`Catalogue name: ${catalogueName}`);
      
      // Find all selectionEntryGroups recursively
      const allGroups = findAllSelectionEntryGroups(doc);
      console.log(`Found ${allGroups.length} selectionEntryGroups`);
      
      const rules: Array<{ category: string; entries: Array<{ name: string; id: string; description: string }> }> = [];
      
      for (const group of allGroups) {
        const parsed = parseSelectionEntryGroup(group);
        if (parsed.category && parsed.entries.length > 0) {
          // Check if this category is meaningful (has descriptions or enough entries)
          const hasDescriptions = parsed.entries.some(e => e.description.length > 20);
          if (hasDescriptions || parsed.entries.length >= 3) {
            rules.push(parsed);
          }
        }
      }

      console.log(`Found ${rules.length} rule categories with meaningful content`);
      
      // Save to master_rules
      let savedCount = 0;
      for (const ruleGroup of rules) {
        const category = categoryPrefix 
          ? `${categoryPrefix} - ${ruleGroup.category}`
          : `${catalogueName} - ${ruleGroup.category}`;
        
        for (const entry of ruleGroup.entries) {
          const ruleKey = entry.id || entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          
          const { error } = await supabase.from('master_rules').upsert({
            game_system_id: gameSystemId,
            faction_id: null,
            category: category,
            rule_key: ruleKey,
            title: entry.name,
            content: { 
              text: entry.description,
              source_file: fileName || 'unknown',
              source_category: ruleGroup.category
            },
            visibility: 'public'
          }, { onConflict: 'game_system_id,rule_key' });
          
          if (!error) {
            savedCount++;
          } else {
            console.error(`Failed to save rule ${entry.name}:`, error);
          }
        }
      }

      console.log(`Saved ${savedCount} rules from ${catalogueName}`);
      
      return new Response(JSON.stringify({
        success: true,
        catalogueName,
        categoriesFound: rules.length,
        categories: rules.map(r => ({ name: r.category, entryCount: r.entries.length })),
        rulesSaved: savedCount,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // IMPORT: Fetch and import a specific game system from its catpkg.json
    if (action === 'import_from_gallery') {
      const { repositoryUrl, name, description, version, githubUrl } = body;
      
      if (!repositoryUrl || !name) {
        return new Response(JSON.stringify({ error: 'Missing repositoryUrl or name' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      console.log(`Importing ${name} from ${repositoryUrl}...`);
      
      // Create or update game system record
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const { data: gameSystem, error: gsError } = await supabase
        .from('game_systems')
        .upsert({
          name: description || name,
          slug,
          description: `Imported from BSData: ${name}`,
          repo_url: githubUrl,
          repo_type: 'battlescribe',
          version: version || null,
          status: 'active',
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'slug' })
        .select('id')
        .single();

      if (gsError || !gameSystem) {
        console.error('Failed to create game system:', gsError);
        throw new Error('Failed to create game system record');
      }

      const gameSystemId = gameSystem.id;
      console.log(`Game system created/updated: ${gameSystemId}`);

      // Fetch the catpkg.json (pre-processed data from BSData)
      const catpkgResponse = await fetch(repositoryUrl, {
        headers: { 'User-Agent': 'Wargame-Tracker' },
      });
      
      if (!catpkgResponse.ok) {
        throw new Error(`Failed to fetch catpkg: ${catpkgResponse.status}`);
      }

      const catpkg: Catpkg = await catpkgResponse.json();
      console.log(`Fetched catpkg: ${catpkg.name}, ${catpkg.catalogues?.length || 0} catalogues`);

      // Process shared rules from game system
      let rulesCount = 0;
      if (catpkg.gameSystem?.sharedRules) {
        for (const rule of catpkg.gameSystem.sharedRules.slice(0, 50)) {
          await supabase.from('master_rules').upsert({
            game_system_id: gameSystemId,
            faction_id: null,
            category: 'Core Rules',
            rule_key: rule.id || rule.name.toLowerCase().replace(/\s+/g, '_'),
            title: rule.name,
            content: { text: rule.description?.slice(0, 1000) || '' },
          }, { onConflict: 'game_system_id,rule_key' });
          rulesCount++;
        }
      }

      // Process catalogues (factions)
      const factionNames: string[] = [];
      let unitsCount = 0;

      if (catpkg.catalogues) {
        for (const catalogue of catpkg.catalogues) {
          const factionName = catalogue.name;
          const factionSlug = factionName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          
          // Create faction
          const { data: faction } = await supabase
            .from('master_factions')
            .upsert({
              game_system_id: gameSystemId,
              name: factionName,
              slug: factionSlug,
              source_file: catalogue.id || factionSlug,
            }, { onConflict: 'game_system_id,slug' })
            .select('id')
            .single();

          if (!faction) continue;
          factionNames.push(factionName);

          // Process units from selectionEntries
          const entries = [
            ...(catalogue.selectionEntries || []),
            ...(catalogue.sharedSelectionEntries || []),
          ].slice(0, 100); // Limit to 100 units per faction

          for (const entry of entries) {
            if (!entry.name) continue;

            // Extract cost
            let baseCost = 0;
            if (entry.costs) {
              for (const cost of entry.costs) {
                baseCost += cost.value || 0;
              }
            }

            // Extract stats from profiles
            const stats: Record<string, string | number> = {};
            if (entry.profiles) {
              for (const profile of entry.profiles.slice(0, 3)) {
                if (profile.characteristics) {
                  Object.entries(profile.characteristics).forEach(([key, val]) => {
                    stats[key] = isNaN(parseFloat(val)) ? val : parseFloat(val);
                  });
                }
              }
            }

            // Extract abilities from rules
            const abilities: string[] = [];
            if (entry.rules) {
              for (const rule of entry.rules.slice(0, 20)) {
                if (rule.name) abilities.push(rule.name);
              }
            }

            // Extract keywords from categories
            const keywords: string[] = entry.categories?.slice(0, 20) || [];

            const { error } = await supabase.from('master_units').upsert({
              game_system_id: gameSystemId,
              faction_id: faction.id,
              name: entry.name,
              source_id: entry.id || entry.name.toLowerCase().replace(/\s+/g, '-'),
              base_cost: baseCost,
              stats,
              abilities,
              equipment_options: [],
              keywords,
              constraints: {},
            }, { onConflict: 'game_system_id,faction_id,source_id' });

            if (!error) unitsCount++;
          }
        }
      }

      console.log(`Import complete: ${factionNames.length} factions, ${unitsCount} units, ${rulesCount} rules`);

      return new Response(JSON.stringify({
        success: true,
        gameSystemId,
        gameSystemName: description || name,
        factions: factionNames,
        unitsCount,
        rulesCount,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal error' 
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
