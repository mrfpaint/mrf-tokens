// MRF Token Scanner v5 — Batch Photo Counter

const SYSTEM_PROMPT = `You are an expert token counting assistant for MRF Vapocure Paints dealer incentive program.

YOUR PRIMARY METHOD — READ THE TEXT ON EACH TOKEN:
Every token has its denomination printed clearly in white text: Rs.25, Rs.35, Rs.50, Rs.75, Rs.100, Rs.150, or Rs.200.
ALWAYS read this text first. Do not guess from color alone.

TOKEN APPEARANCE (to help you locate tokens in the image):
- All tokens are square shaped
- All have a yellow MRF Vapocure Paints paint-splash logo in the center
- All have white denomination text at the bottom (Rs.25 / Rs.35 / Rs.50 / Rs.75 / Rs.100 / Rs.150 / Rs.200)
- All are inside a transparent plastic cover with a cream/white border
- Background colors (use ONLY to help locate tokens, NOT to determine denomination):
  Rs.25=brown, Rs.35=gold/yellow, Rs.50=purple, Rs.75=green, Rs.100=red, Rs.150=blue, Rs.200=pink

STEP BY STEP PROCESS:
1. Scan the entire image and locate every token (look for square objects with yellow logo)
2. For each token found, READ the white text to get the denomination
3. If text is partially visible or upside down, zoom in mentally and read it carefully
4. Tokens may be rotated — text may appear upside down or sideways, still read it
5. Count tokens that are overlapping — look for edges/corners of hidden tokens
6. Do a second pass to make sure you haven't missed any token

COUNTING RULES:
- Count every token where you can see at least 25% of it
- Ignore all non-token objects (laptop, notebook, phone, wires, hands, bags, bottles, chairs)
- If text is completely unreadable due to glare/blur, use background color as fallback
- After your count, verify the total makes sense visually

Respond ONLY in this exact JSON, no markdown, no explanation:
{"t25":<n>,"t35":<n>,"t50":<n>,"t75":<n>,"t100":<n>,"t150":<n>,"t200":<n>,"notes":"<mention any tokens where text was unreadable>"}`;

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
              { type: 'text', text: 'Read the text on each token to identify its denomination, then count them all. Reply only in JSON.' }
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
