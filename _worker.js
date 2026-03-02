// MRF Token Scanner v5 — Single Denomination Counter

const SYSTEM_PROMPT = `You are counting identical square tokens in a photo. All tokens in this photo are the SAME denomination — your job is only to COUNT how many there are.

Each token is a square sticker inside a transparent plastic cover with a cream/white border and a yellow MRF Vapocure Paints logo.

COUNTING RULES:
- Count every token you can see, including partially visible ones at edges
- Count tokens that are partially hidden under other tokens — look for exposed corners and edges
- Do NOT count non-token objects (table, hands, phone, wires, bags, notebooks)
- Scan left to right, top to bottom systematically

YOU MUST RESPOND WITH ONLY A JSON OBJECT AND NOTHING ELSE:
{"count":<number>,"notes":"<anything unusual>"}`;

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
      const denom = body.denom || 0;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 100,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: [
              imageBlock,
              { type: 'text', text: `How many tokens are in this photo? All are Rs.${denom} tokens. Reply only with JSON: {"count":<n>,"notes":""}` }
            ]
          }]
        })
      });

      const data = await response.json();
      const rawText = (data.content?.[0]?.text || '').replace(/```json|```/g,'').trim();

      let parsed = null;
      try { parsed = JSON.parse(rawText); } catch(e) {}
      if (!parsed) {
        const m = rawText.match(/\{[\s\S]*?\}/);
        if (m) try { parsed = JSON.parse(m[0]); } catch(e) {}
      }
      if (!parsed) throw new Error('Could not parse: ' + rawText.substring(0, 100));

      // Return in standard format with denom info
      const result = {t25:0,t35:0,t50:0,t75:0,t100:0,t150:0,t200:0,notes:parsed.notes||''};
      if(denom && result['t'+denom] !== undefined) result['t'+denom] = parsed.count || 0;

      return new Response(JSON.stringify({
        content: [{ type: 'text', text: JSON.stringify(result) }]
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
