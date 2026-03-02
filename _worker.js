// MRF Token Scanner v5 — Batch Photo Counter

const SYSTEM_PROMPT = `You are a token counting assistant for MRF Vapocure Paints. Count tokens in the photo and return ONLY a JSON object.

Tokens are square stickers inside plastic covers with a yellow MRF Vapocure Paints logo. Each token has white text showing its value: Rs.25, Rs.35, Rs.50, Rs.75, Rs.100, Rs.150, or Rs.200. Read this text to identify each token.

Background colors for reference: Rs.25=brown, Rs.35=gold, Rs.50=purple, Rs.75=green, Rs.100=red, Rs.150=blue, Rs.200=pink.

Count every visible token including partially hidden ones. Ignore non-token objects.

YOU MUST RESPOND WITH ONLY THIS JSON AND NOTHING ELSE:
{"t25":0,"t35":0,"t50":0,"t75":0,"t100":0,"t150":0,"t200":0,"notes":""}

Replace the zeros with your counts. Do not write any other text.`;

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
          max_tokens: 150,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: [
                imageBlock,
                { type: 'text', text: 'Count the tokens. Read the text on each one. Return only the JSON.' }
              ]
            },
            {
              role: 'assistant',
              content: '{'
            }
          ]
        })
      });
      const data = await response.json();
      // Reconstruct full JSON since we prefilled the opening brace
      const raw = '{' + (data.content?.[0]?.text||'');
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if(!jsonMatch) throw new Error('No valid JSON in response — try again');
      const p = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify({content:[{type:'text',text:JSON.stringify(p)}]}), {
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
