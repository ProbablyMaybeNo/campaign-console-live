import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
