import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://deno.land/x/xml@2.1.3/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RepoFile {
  name: string;
  path: string;
  type: string;
  download_url: string | null;
}

interface ParsedUnit {
  name: string;
  source_id: string;
  base_cost: number;
  stats: Record<string, string | number>;
  abilities: string[];
  equipment_options: Array<{ name: string; cost: number; category?: string }>;
  keywords: string[];
  constraints?: { min?: number; max?: number };
}

interface ParsedFaction {
  name: string;
  slug: string;
  source_file: string;
  units: ParsedUnit[];
  rules: Array<{ rule_key: string; title: string; content: string }>;
}

interface ParsedGameSystem {
  name: string;
  version: string;
  shared_rules: Array<{ rule_key: string; title: string; content: string }>;
}

// deno-lint-ignore no-explicit-any
type XmlNode = any;

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  return match ? { owner: match[1], repo: match[2].replace(/\.git$/, '') } : null;
}

async function fetchGitHubContents(owner: string, repo: string, path = ''): Promise<RepoFile[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Wargame-Tracker' },
  });
  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
  return await response.json();
}

async function fetchFileContent(downloadUrl: string): Promise<string> {
  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
  return await response.text();
}

function getAttr(node: XmlNode, attr: string): string {
  if (!node) return '';
  return node[`@${attr}`] || node[attr] || '';
}

function findNodes(node: XmlNode, ...path: string[]): XmlNode[] {
  if (!node) return [];
  let current = node;
  for (const key of path) {
    current = current?.[key];
    if (!current) return [];
  }
  return Array.isArray(current) ? current : [current];
}

function parseGameSystem(xml: string): ParsedGameSystem {
  const doc = parse(xml);
  const root = doc?.gameSystem || doc?.catalogue || Object.values(doc)[0];
  
  const name = getAttr(root, 'name') || 'Unknown';
  const version = getAttr(root, 'revision') || '1.0';
  const sharedRules: ParsedGameSystem['shared_rules'] = [];
  
  const rules = findNodes(root, 'sharedRules', 'rule');
  for (const rule of rules) {
    const ruleName = getAttr(rule, 'name');
    if (ruleName) {
      const description = rule?.description?.['#text'] || rule?.description || '';
      sharedRules.push({
        rule_key: getAttr(rule, 'id') || ruleName.toLowerCase().replace(/\s+/g, '_'),
        title: ruleName,
        content: typeof description === 'string' ? description : '',
      });
    }
  }
  
  console.log(`Parsed GST: ${name} v${version}, ${sharedRules.length} rules`);
  return { name, version, shared_rules: sharedRules };
}

function parseCatalogue(xml: string, sourceFile: string): ParsedFaction {
  const doc = parse(xml);
  const root = doc?.catalogue || doc?.gameSystem || Object.values(doc)[0];
  
  const name = getAttr(root, 'name') || sourceFile.replace('.cat', '');
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const units: ParsedUnit[] = [];
  const rules: ParsedFaction['rules'] = [];
  
  // Parse faction rules (limit to first 50 to save CPU)
  const ruleNodes = findNodes(root, 'rules', 'rule').slice(0, 50);
  for (const rule of ruleNodes) {
    const ruleName = getAttr(rule, 'name');
    if (ruleName) {
      const description = rule?.description?.['#text'] || rule?.description || '';
      rules.push({
        rule_key: getAttr(rule, 'id') || ruleName.toLowerCase().replace(/\s+/g, '_'),
        title: ruleName,
        content: typeof description === 'string' ? description : '',
      });
    }
  }
  
  // Parse selection entries (units) - limit to first 100 to save CPU
  const entries = findNodes(root, 'selectionEntries', 'selectionEntry').slice(0, 100);
  for (const entry of entries) {
    const entryType = getAttr(entry, 'type');
    if (entryType === 'model' || entryType === 'unit') {
      const unitName = getAttr(entry, 'name');
      if (!unitName) continue;
      
      let baseCost = 0;
      const costs = findNodes(entry, 'costs', 'cost');
      for (const cost of costs) {
        baseCost += parseFloat(getAttr(cost, 'value')) || 0;
      }
      
      const stats: Record<string, string | number> = {};
      const profiles = findNodes(entry, 'profiles', 'profile').slice(0, 5);
      for (const profile of profiles) {
        const chars = findNodes(profile, 'characteristics', 'characteristic');
        for (const char of chars) {
          const charName = getAttr(char, 'name');
          const charVal = char?.['#text'] || '';
          if (charName) {
            stats[charName] = isNaN(parseFloat(charVal)) ? charVal : parseFloat(charVal);
          }
        }
      }
      
      const abilities: string[] = [];
      const abilityNodes = findNodes(entry, 'rules', 'rule').slice(0, 20);
      for (const rule of abilityNodes) {
        const n = getAttr(rule, 'name');
        if (n) abilities.push(n);
      }
      
      const keywords: string[] = [];
      const links = findNodes(entry, 'categoryLinks', 'categoryLink').slice(0, 20);
      for (const link of links) {
        const n = getAttr(link, 'name');
        if (n && n !== 'Configuration') keywords.push(n);
      }
      
      units.push({
        name: unitName,
        source_id: getAttr(entry, 'id'),
        base_cost: baseCost,
        stats,
        abilities,
        equipment_options: [],
        keywords
      });
    }
  }
  
  console.log(`Parsed CAT: ${name}, ${units.length} units, ${rules.length} rules`);
  return { name, slug, source_file: sourceFile, units, rules };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { repoUrl, gameSystemId, action, batchIndex = 0, batchSize = 2 } = await req.json();
    
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) return new Response(JSON.stringify({ error: 'Invalid GitHub URL' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const contents = await fetchGitHubContents(parsed.owner, parsed.repo);
    const gstFiles = contents.filter(f => f.name.endsWith('.gst'));
    const catFiles = contents.filter(f => f.name.endsWith('.cat'));

    if (action === 'discover') {
      return new Response(JSON.stringify({
        success: true, repoType: 'battlescribe',
        gameSystem: gstFiles[0]?.name.replace('.gst', '') || 'Unknown',
        factions: catFiles.map(f => f.name.replace('.cat', '')),
        fileCount: { gst: gstFiles.length, cat: catFiles.length },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'sync' && gameSystemId) {
      let gameSystemData: ParsedGameSystem | null = null;
      
      // Only parse GST on first batch
      if (batchIndex === 0 && gstFiles[0]?.download_url) {
        gameSystemData = parseGameSystem(await fetchFileContent(gstFiles[0].download_url));
        await supabase.from('game_systems').update({ 
          name: gameSystemData.name, 
          version: gameSystemData.version, 
          last_synced_at: new Date().toISOString(), 
          status: 'active' 
        }).eq('id', gameSystemId);
        
        // Insert rules in smaller batches
        for (let i = 0; i < gameSystemData.shared_rules.length; i += 10) {
          const ruleBatch = gameSystemData.shared_rules.slice(i, i + 10);
          for (const rule of ruleBatch) {
            await supabase.from('master_rules').upsert({ 
              game_system_id: gameSystemId, 
              faction_id: null, 
              category: 'Core Rules', 
              rule_key: rule.rule_key, 
              title: rule.title, 
              content: { text: rule.content } 
            }, { onConflict: 'game_system_id,rule_key' });
          }
        }
      }

      // Process only a batch of catalogue files
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min(startIdx + batchSize, catFiles.length);
      const batchCatFiles = catFiles.slice(startIdx, endIdx);
      
      const factionsProcessed: string[] = [];
      let unitsInserted = 0;
      
      for (const catFile of batchCatFiles) {
        if (!catFile.download_url) continue;
        try {
          const faction = parseCatalogue(await fetchFileContent(catFile.download_url), catFile.name);
          const { data: fd } = await supabase.from('master_factions').upsert({ 
            game_system_id: gameSystemId, 
            name: faction.name, 
            slug: faction.slug, 
            source_file: faction.source_file 
          }, { onConflict: 'game_system_id,slug' }).select('id').single();
          
          if (!fd) continue;
          factionsProcessed.push(faction.name);
          
          // Insert units in smaller batches
          for (const unit of faction.units) {
            const { error } = await supabase.from('master_units').upsert({ 
              game_system_id: gameSystemId, 
              faction_id: fd.id, 
              name: unit.name, 
              source_id: unit.source_id, 
              base_cost: unit.base_cost, 
              stats: unit.stats, 
              abilities: unit.abilities, 
              equipment_options: unit.equipment_options, 
              keywords: unit.keywords, 
              constraints: unit.constraints || {} 
            }, { onConflict: 'game_system_id,faction_id,source_id' });
            if (!error) unitsInserted++;
          }
        } catch (e) { 
          console.error(`Error parsing ${catFile.name}:`, e); 
        }
      }

      const hasMore = endIdx < catFiles.length;
      const nextBatchIndex = hasMore ? batchIndex + 1 : null;

      return new Response(JSON.stringify({ 
        success: true, 
        gameSystem: gameSystemData?.name,
        factionsProcessed, 
        unitsInserted,
        hasMore,
        nextBatchIndex,
        totalFactions: catFiles.length,
        processedSoFar: endIdx,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
