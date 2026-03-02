// MRF Token Scanner v5 — Batch Photo Counter

const SYSTEM_PROMPT = `You are an expert token counting assistant for MRF Vapocure Paints dealer incentive program. Count ALL tokens visible in a photo.

ALL tokens share: square shape, yellow MRF Vapocure Paints paint-splash logo, white denomination text, transparent plastic outer cover.

IDENTIFY BY BACKGROUND COLOR:
- Rs.25  = DARK BROWN / CHOCOLATE BROWN
- Rs.50  = DARK PURPLE / MAROON / DARK TEAL (multiple variants)
- Rs.75  = DARK GREEN / FOREST GREEN
- Rs.100 = BRIGHT RED / ORANGE-RED
- Rs.150 = ROYAL BLUE / NAVY BLUE
- Rs.200 = BRIGHT PINK / MAGENTA / FUCHSIA

CONFUSION PAIRS:
- Rs.25 (warm brown) vs Rs.50 (cool purple) — check text if unclear
- Rs.100 (red) vs Rs.200 (pink/magenta) — check text if unclear
- Rs.50 teal variant is still Rs.50, not Rs.75

COUNTING RULES:
- Count every token visible including partial ones at edges
- Scan left-to-right, top-to-bottom systematically
- Ignore all non-token objects (hands, table, phone, wires, bags)
- Tokens may be overlapping — look for edges/corners
- When in doubt about denomination, note it in the notes field

Respond ONLY in this exact JSON, no markdown:
{"t25":<n>,"t50":<n>,"t75":<n>,"t100":<n>,"t150":<n>,"t200":<n>,"notes":"<observations>"}`;

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
              { type: 'text', text: 'Count all MRF Vapocure tokens in this photo. Reply only in JSON.' }
            ]
          }]
        })
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
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
