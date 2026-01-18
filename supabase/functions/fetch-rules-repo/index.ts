import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchRequest {
  repoUrl: string;
  jsonPath: string;
  action?: string;
  campaignId?: string;
}

interface GitHubRulesJSON {
  name?: string;
  version?: string;
  groups?: GitHubRulesGroup[];
  tables?: GitHubRulesTableDef[];
  datasets?: GitHubRulesDatasetDef[];
}

interface GitHubRulesGroup {
  name: string;
  description?: string;
  sections?: GitHubRulesSection[];
}

interface GitHubRulesSection {
  title: string;
  text?: string;
  subsections?: GitHubRulesSection[];
  tables?: GitHubRulesTableDef[];
  datasets?: GitHubRulesDatasetDef[];
}

interface GitHubRulesTableDef {
  name: string;
  diceType?: string;
  columns?: string[];
  rows?: Array<string[] | Record<string, unknown>>;
}

interface GitHubRulesDatasetDef {
  name: string;
  type?: string;
  fields?: string[];
  rows?: Record<string, unknown>[];
}

function parseGitHubUrl(repoUrl: string): { owner: string; repo: string; branch: string } | null {
  const patterns = [
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/tree\/([^/]+))?$/,
    /github\.com\/([^/]+)\/([^/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = repoUrl.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ""),
        branch: match[3] || "main",
      };
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as FetchRequest;
    const { repoUrl, jsonPath, action, campaignId } = body;

    // Handle legacy "discover" and "sync" actions
    if (action === "discover" || action === "sync") {
      return handleLegacyAction(req, body);
    }

    if (!repoUrl) {
      throw new Error("Repository URL is required");
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      throw new Error("Invalid GitHub repository URL format");
    }

    const { owner, repo, branch } = parsed;
    const path = jsonPath?.replace(/^\//, "") || "rules.json";

    console.log(`Fetching ${owner}/${repo}/${path} (branch: ${branch})`);

    let rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    let response = await fetch(rawUrl);

    if (!response.ok && branch === "main") {
      rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${path}`;
      response = await fetch(rawUrl);
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: ${path} in ${owner}/${repo}`);
      }
      throw new Error(`GitHub fetch failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();

    let json: GitHubRulesJSON;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("File is not valid JSON");
    }

    if (!json || typeof json !== "object") {
      throw new Error("JSON must be an object");
    }

    let sha: string | undefined;
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`;
      const commitRes = await fetch(apiUrl, {
        headers: { "Accept": "application/vnd.github.v3+json" },
      });
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        sha = commitData.sha?.substring(0, 7);
      }
    } catch (e) {
      console.log("Could not fetch commit SHA:", e);
    }

    console.log(`Successfully fetched JSON with ${json.groups?.length || 0} groups`);

    return new Response(JSON.stringify({
      success: true,
      data: json,
      meta: {
        owner,
        repo,
        branch,
        path,
        sha,
        fetchedAt: new Date().toISOString(),
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Fetch rules repo error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Handle legacy discover/sync actions for backward compatibility
async function handleLegacyAction(req: Request, body: FetchRequest): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: "Legacy action - use new indexing flow",
      categories: [] 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}