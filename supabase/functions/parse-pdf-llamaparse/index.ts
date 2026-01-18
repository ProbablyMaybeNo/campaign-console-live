import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LlamaParseResult {
  success: boolean;
  markdown?: string;
  pages?: { pageNumber: number; text: string; charCount: number }[];
  error?: string;
}

type LlamaParseUploadResponse = { id: string };
type LlamaParseJobStatus = { status: string; error?: string };
type LlamaParseResultResponse = { markdown?: string; text?: string };
type LlamaParseRequest = { storagePath?: string; sourceId?: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestStart = performance.now();
    const timeMsByStage: Record<string, number> = {};
    const LLAMAPARSE_API_KEY = Deno.env.get('LLAMAPARSE_API_KEY');
    if (!LLAMAPARSE_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'LlamaParse API key not configured' 
      }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { storagePath, sourceId } = (await req.json()) as LlamaParseRequest;
    
    if (!storagePath) {
      return new Response(JSON.stringify({ error: 'storagePath required' }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(JSON.stringify({ scope: 'parse-pdf-llamaparse', message: 'download_start', storagePath }));
    const downloadStart = performance.now();

    // Download PDF from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('campaign-documents')
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return new Response(JSON.stringify({ 
        error: `Failed to download PDF: ${downloadError?.message}` 
      }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    timeMsByStage.downloadPdf = Math.round(performance.now() - downloadStart);
    console.log(JSON.stringify({ scope: 'parse-pdf-llamaparse', message: 'download_complete', size: fileData.size, timeMsByStage }));

    // Upload to LlamaParse
    const formData = new FormData();
    formData.append('file', fileData, 'document.pdf');

    console.log(JSON.stringify({ scope: 'parse-pdf-llamaparse', message: 'upload_start' }));
    const uploadStart = performance.now();

    const uploadResponse = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LLAMAPARSE_API_KEY}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('LlamaParse upload error:', uploadResponse.status, errorText);
      
      if (uploadResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.' 
        }), {
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (uploadResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'LlamaParse credits exhausted. Please add credits.' 
        }), {
          status: 402, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        error: `LlamaParse upload failed: ${errorText}` 
      }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const uploadResult = (await uploadResponse.json()) as LlamaParseUploadResponse;
    timeMsByStage.uploadPdf = Math.round(performance.now() - uploadStart);
    const jobId = uploadResult.id;

    console.log(JSON.stringify({ scope: 'parse-pdf-llamaparse', message: 'job_created', jobId, timeMsByStage }));

    // Poll for job completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    let jobResult: LlamaParseJobStatus | null = null;

    const pollStart = performance.now();
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      const statusResponse = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${LLAMAPARSE_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        console.error('Status check failed:', statusResponse.status);
        continue;
      }

      jobResult = (await statusResponse.json()) as LlamaParseJobStatus;
      console.log(JSON.stringify({ scope: 'parse-pdf-llamaparse', message: 'job_status', attempt: attempts, status: jobResult.status }));

      if (jobResult.status === 'SUCCESS') {
        break;
      } else if (jobResult.status === 'ERROR') {
        return new Response(JSON.stringify({ 
          error: `LlamaParse parsing failed: ${jobResult.error || 'Unknown error'}` 
        }), {
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (!jobResult || jobResult.status !== 'SUCCESS') {
      return new Response(JSON.stringify({ 
        error: 'LlamaParse job timed out' 
      }), {
        status: 504, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    timeMsByStage.pollParse = Math.round(performance.now() - pollStart);

    // Get the result in markdown format
    console.log(JSON.stringify({ scope: 'parse-pdf-llamaparse', message: 'fetch_markdown' }));
    const resultStart = performance.now();

    const resultResponse = await fetch(
      `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`,
      {
        headers: {
          'Authorization': `Bearer ${LLAMAPARSE_API_KEY}`,
        },
      }
    );

    if (!resultResponse.ok) {
      const errorText = await resultResponse.text();
      console.error('Result fetch error:', resultResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: `Failed to fetch result: ${errorText}` 
      }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const resultData = (await resultResponse.json()) as LlamaParseResultResponse;
    const markdown = resultData.markdown || resultData.text || '';

    timeMsByStage.fetchResult = Math.round(performance.now() - resultStart);
    console.log(JSON.stringify({ scope: 'parse-pdf-llamaparse', message: 'markdown_received', length: markdown.length, timeMsByStage }));

    // Convert markdown to pages (split by page markers or by ~3000 chars)
    const convertStart = performance.now();
    const pages = convertMarkdownToPages(markdown);
    timeMsByStage.splitPages = Math.round(performance.now() - convertStart);

    // If sourceId provided, save pages to database
    if (sourceId) {
      console.log(JSON.stringify({ scope: 'parse-pdf-llamaparse', message: 'save_pages', count: pages.length }));
      const saveStart = performance.now();
      
      // Delete existing pages
      await supabase.from('rules_pages').delete().eq('source_id', sourceId);
      
      // Insert new pages
      const pagesToInsert = pages.map(p => ({
        source_id: sourceId,
        page_number: p.pageNumber,
        text: p.text,
        char_count: p.charCount,
      }));

      const { error: insertError } = await supabase.from('rules_pages').insert(pagesToInsert);
      if (insertError) {
        console.error('Page insert error:', insertError);
      }
      timeMsByStage.savePages = Math.round(performance.now() - saveStart);
    }

    timeMsByStage.total = Math.round(performance.now() - requestStart);
    console.log(JSON.stringify({ scope: 'parse-pdf-llamaparse', message: 'parse_complete', timeMsByStage }));

    const result: LlamaParseResult = {
      success: true,
      markdown,
      pages,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('LlamaParse error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Convert markdown to page-like structure
 */
function convertMarkdownToPages(markdown: string): { pageNumber: number; text: string; charCount: number }[] {
  const pages: { pageNumber: number; text: string; charCount: number }[] = [];
  
  // Check for page markers (LlamaParse sometimes adds these)
  const pageMarkerPattern = /(?:^|\n)(?:---\s*Page\s+(\d+)\s*---|<!-- Page (\d+) -->|\[Page (\d+)\])/gi;
  const matches = [...markdown.matchAll(pageMarkerPattern)];
  
  if (matches.length > 1) {
    // Split by page markers
    let lastIndex = 0;
    let pageNum = 1;
    
    for (const match of matches) {
      if (match.index !== undefined && match.index > lastIndex) {
        const text = markdown.slice(lastIndex, match.index).trim();
        if (text.length > 0) {
          pages.push({
            pageNumber: pageNum,
            text,
            charCount: text.length,
          });
          pageNum++;
        }
      }
      lastIndex = (match.index || 0) + match[0].length;
    }
    
    // Don't forget the last section
    const remaining = markdown.slice(lastIndex).trim();
    if (remaining.length > 0) {
      pages.push({
        pageNumber: pageNum,
        text: remaining,
        charCount: remaining.length,
      });
    }
  } else {
    // No page markers, split by approximate page size (~3000 chars)
    const PAGE_SIZE = 3000;
    const lines = markdown.split('\n');
    let currentPage = '';
    let pageNum = 1;
    
    for (const line of lines) {
      if (currentPage.length + line.length > PAGE_SIZE && currentPage.length > 500) {
        pages.push({
          pageNumber: pageNum,
          text: currentPage.trim(),
          charCount: currentPage.trim().length,
        });
        pageNum++;
        currentPage = line + '\n';
      } else {
        currentPage += line + '\n';
      }
    }
    
    // Don't forget the last page
    if (currentPage.trim().length > 0) {
      pages.push({
        pageNumber: pageNum,
        text: currentPage.trim(),
        charCount: currentPage.trim().length,
      });
    }
  }
  
  return pages;
}
