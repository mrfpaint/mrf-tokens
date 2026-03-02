// MRF Token Scanner v5 — Batch Photo Counter

const SYSTEM_PROMPT = `You count MRF Vapocure Paints tokens in photos. You always respond with ONLY a JSON object and nothing else - no explanation, no markdown, no text before or after the JSON.

Token denominations (read the white text on each token to identify):
Rs.25=brown background, Rs.35=gold background, Rs.50=purple background, Rs.75=green background, Rs.100=red background, Rs.150=blue background, Rs.200=pink background.

Your response must be exactly this format:
{"t25":0,"t35":0,"t50":0,"t75":0,"t100":0,"t150":0,"t200":0,"notes":""}`;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }
    if (request.method !== 'POST' || !request.url.includes('/analyze')) {
      return env.ASSETS.fetch(request);
    }
    try {
      const body = await request.json();
      const imageBlock = body.messages[0].content.find(c => c.type === 'image');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: [
              imageBlock,
              { type: 'text', text: 'Count all tokens. Read the text on each token. Output only JSON.' }
            ]
          }]
        })
      });

      const data = await response.json();

      // Log raw response to help debug
      const rawText = data.content?.[0]?.text || '';
      
      // Try multiple JSON extraction strategies
      let parsed = null;
      
      // Strategy 1: direct parse
      try { parsed = JSON.parse(rawText.trim()); } catch(e) {}
      
      // Strategy 2: extract {...} block
      if (!parsed) {
        const m = rawText.match(/\{[\s\S]*\}/);
        if (m) { try { parsed = JSON.parse(m[0]); } catch(e) {} }
      }

      // Strategy 3: if API returned error instead
      if (!parsed && data.error) {
        throw new Error(data.error.message || 'API error');
      }

      if (!parsed) {
        // Return the raw text so frontend can show it for debugging
        throw new Error('Could not parse response: ' + rawText.substring(0, 100));
      }

      return new Response(JSON.stringify({
        content: [{ type: 'text', text: JSON.stringify(parsed) }]
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
