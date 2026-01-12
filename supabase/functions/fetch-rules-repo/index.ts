import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface RuleCategory {
  category: string;
  rules: Array<{
    rule_key: string;
    title: string;
    content: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }>;
}

// Parse GitHub repo URL to extract owner and repo name
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    // Handle various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\.]+)/,  // https://github.com/owner/repo
      /github\.com:([^\/]+)\/([^\/\.]+)/,    // git@github.com:owner/repo
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Fetch directory contents from GitHub API
async function fetchGitHubContents(owner: string, repo: string, path = ''): Promise<RepoFile[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  console.log(`Fetching GitHub contents: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Wargame-Campaign-Tracker',
    },
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// Fetch file content from GitHub
async function fetchFileContent(downloadUrl: string): Promise<string> {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`);
  }
  return await response.text();
}

// Parse JSON or YAML-like content
function parseContent(content: string, filename: string): Record<string, unknown> | null {
  try {
    // Try JSON first
    if (filename.endsWith('.json')) {
      return JSON.parse(content);
    }
    // For other formats, try to parse as JSON anyway
    return JSON.parse(content);
  } catch {
    // Return as text content if not parseable
    return { raw_content: content };
  }
}

// Discover and categorize rules from repo structure
async function discoverRules(owner: string, repo: string): Promise<RuleCategory[]> {
  const categories: RuleCategory[] = [];
  
  try {
    // Fetch root contents
    const rootContents = await fetchGitHubContents(owner, repo);
    console.log(`Found ${rootContents.length} items in root`);
    
    // Look for common data directories
    const dataFolders = ['data', 'rules', 'catalogues', 'catalogs', 'assets', 'src/data'];
    
    for (const item of rootContents) {
      if (item.type === 'dir') {
        const folderName = item.name.toLowerCase();
        
        // Check if this looks like a data folder
        if (dataFolders.some(df => folderName.includes(df.split('/')[0])) || 
            folderName.includes('rule') || 
            folderName.includes('catalog') ||
            folderName.includes('data')) {
          
          console.log(`Exploring data folder: ${item.path}`);
          const folderContents = await fetchGitHubContents(owner, repo, item.path);
          
          const categoryRules: Array<{
            rule_key: string;
            title: string;
            content: Record<string, unknown>;
            metadata?: Record<string, unknown>;
          }> = [];
          
          for (const file of folderContents) {
            if (file.type === 'file' && file.download_url) {
              const ext = file.name.split('.').pop()?.toLowerCase();
              
              // Process JSON, XML, or text files
              if (['json', 'xml', 'txt', 'md', 'yaml', 'yml'].includes(ext || '')) {
                try {
                  const content = await fetchFileContent(file.download_url);
                  const parsed = parseContent(content, file.name);
                  
                  if (parsed) {
                    categoryRules.push({
                      rule_key: file.name.replace(/\.[^.]+$/, ''),
                      title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
                      content: parsed,
                      metadata: {
                        filename: file.name,
                        path: file.path,
                        file_type: ext,
                      },
                    });
                  }
                } catch (err) {
                  console.error(`Error processing file ${file.name}:`, err);
                }
              }
            }
          }
          
          if (categoryRules.length > 0) {
            categories.push({
              category: item.name,
              rules: categoryRules,
            });
          }
        }
      }
      
      // Also check for JSON/data files in root
      if (item.type === 'file' && item.download_url) {
        const ext = item.name.split('.').pop()?.toLowerCase();
        if (['json'].includes(ext || '') && 
            (item.name.toLowerCase().includes('rule') || 
             item.name.toLowerCase().includes('data') ||
             item.name.toLowerCase().includes('config'))) {
          try {
            const content = await fetchFileContent(item.download_url);
            const parsed = parseContent(content, item.name);
            
            if (parsed) {
              categories.push({
                category: 'root',
                rules: [{
                  rule_key: item.name.replace(/\.[^.]+$/, ''),
                  title: item.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
                  content: parsed,
                  metadata: {
                    filename: item.name,
                    path: item.path,
                    file_type: ext,
                  },
                }],
              });
            }
          } catch (err) {
            console.error(`Error processing root file ${item.name}:`, err);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error discovering rules:', error);
    throw error;
  }
  
  return categories;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { repoUrl, campaignId, action } = await req.json();
    console.log(`Processing request: action=${action}, repo=${repoUrl}, campaign=${campaignId}`);

    if (action === 'discover') {
      // Just discover categories without saving
      const parsed = parseGitHubUrl(repoUrl);
      if (!parsed) {
        return new Response(
          JSON.stringify({ error: 'Invalid GitHub URL format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const categories = await discoverRules(parsed.owner, parsed.repo);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          categories: categories.map(c => ({
            category: c.category,
            ruleCount: c.rules.length,
            rules: c.rules.map(r => ({ key: r.rule_key, title: r.title })),
          })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'sync') {
      if (!campaignId) {
        return new Response(
          JSON.stringify({ error: 'Campaign ID required for sync' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user owns/manages this campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, owner_id')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        return new Response(
          JSON.stringify({ error: 'Campaign not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (campaign.owner_id !== user.id) {
        // Check if user is a GM
        const { data: playerRole } = await supabase
          .from('campaign_players')
          .select('role')
          .eq('campaign_id', campaignId)
          .eq('user_id', user.id)
          .single();

        if (!playerRole || playerRole.role !== 'gm') {
          return new Response(
            JSON.stringify({ error: 'Not authorized to manage this campaign' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const parsed = parseGitHubUrl(repoUrl);
      if (!parsed) {
        return new Response(
          JSON.stringify({ error: 'Invalid GitHub URL format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const categories = await discoverRules(parsed.owner, parsed.repo);
      
      // Delete existing rules for this campaign
      await supabase
        .from('wargame_rules')
        .delete()
        .eq('campaign_id', campaignId);

      // Insert new rules
      let insertedCount = 0;
      for (const category of categories) {
        for (const rule of category.rules) {
          const { error: insertError } = await supabase
            .from('wargame_rules')
            .insert({
              campaign_id: campaignId,
              category: category.category,
              rule_key: rule.rule_key,
              title: rule.title,
              content: rule.content,
              metadata: rule.metadata || {},
            });

          if (!insertError) {
            insertedCount++;
          } else {
            console.error(`Failed to insert rule ${rule.rule_key}:`, insertError);
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Synced ${insertedCount} rules across ${categories.length} categories`,
          categories: categories.map(c => c.category),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "discover" or "sync"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
