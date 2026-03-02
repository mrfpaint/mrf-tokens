// MRF Token Scanner v5 — Batch Photo Counter

const SYSTEM_PROMPT = `You are an expert token counting assistant for MRF Vapocure Paints dealer incentive program. Count ALL tokens visible in a photo with maximum accuracy.

ALL tokens share: square shape, yellow MRF Vapocure Paints paint-splash logo, white denomination text, transparent plastic outer cover (cream/white border).

IDENTIFY BY BACKGROUND COLOR:
- Rs.25  = DARK BROWN / CHOCOLATE BROWN
- Rs.35  = GOLD / YELLOW-ORANGE / MUSTARD (warm golden color)
- Rs.50  = PURPLE / VIOLET / DARK PURPLE (can vary from light purple to dark)
- Rs.75  = DARK GREEN / FOREST GREEN
- Rs.100 = BRIGHT RED / ORANGE-RED
- Rs.150 = ROYAL BLUE / NAVY BLUE
- Rs.200 = BRIGHT PINK / MAGENTA / FUCHSIA

CONFUSION PAIRS — CHECK THE TEXT WHEN UNSURE:
- Rs.25 (warm brown) vs Rs.35 (gold/yellow) — very different, brown vs gold
- Rs.35 (gold/mustard) vs Rs.75 (green) — gold is warm yellow, green is cool
- Rs.50 (purple/violet) — note: this is PURPLE not blue or pink
- Rs.100 (orange-red) vs Rs.200 (hot pink/magenta) — red vs pink
- Rs.150 (navy blue) vs Rs.50 (purple) — blue vs purple

CRITICAL COUNTING RULES FOR OVERLAPPING TOKENS:
- When tokens overlap, count BOTH the top token AND the partially hidden one underneath
- Look for exposed corners, edges, or partial borders of tokens underneath others
- A token corner peeking out from under another token = count it
- Scan in a grid pattern: top-left to top-right, then move down row by row
- Count the transparent plastic border/cover as part of the token — helps spot hidden ones
- If you can see even 25% of a token, count it
- Ignore non-token objects (phone, wires, table, hands, bags, chairs)
- Tokens may be upside down or rotated — still count them

Respond ONLY in this exact JSON, no markdown:
{"t25":<n>,"t35":<n>,"t50":<n>,"t75":<n>,"t100":<n>,"t150":<n>,"t200":<n>,"notes":"<observations including any overlapping tokens found>"}`;

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
              { type: 'text', text: 'Count ALL tokens including any partially hidden under others. Reply only in JSON.' }
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
