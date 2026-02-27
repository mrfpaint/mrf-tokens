// MRF Token Scanner v4 — Cloudflare Worker

const SYSTEM_PROMPT = `You are an expert token identification assistant for MRF Vapocure Paints dealer incentive program.

A single token is being shown to the camera. Identify it by its background color:
1. Rs.25  — DARK BROWN / CHOCOLATE BROWN background
2. Rs.50  — DARK PURPLE / MAROON / DARK TEAL background (multiple color variants)
3. Rs.75  — DARK GREEN / FOREST GREEN background
4. Rs.100 — BRIGHT RED / ORANGE-RED background
5. Rs.150 — ROYAL BLUE / NAVY BLUE background
6. Rs.200 — BRIGHT PINK / MAGENTA / FUCHSIA background

All tokens have: yellow MRF Vapocure Paints paint-splash logo, white denomination text, transparent plastic cover.

CONFUSION WARNINGS:
- Rs.25 (warm brown) vs Rs.50 (cool purple/maroon) — look at the text
- Rs.100 (orange-red) vs Rs.200 (hot pink/magenta) — look at the text
- Rs.50 teal variant is still Rs.50, not Rs.75 green

If you can clearly identify a token, respond with its value.
If no token is visible, or the image is too blurry/dark, respond with value 0.
If you are unsure, respond with value 0.

Respond ONLY in this JSON format:
{"value": <25|50|75|100|150|200|0>, "confidence": <"high"|"medium"|"low">, "color": "<color you see>"}`;

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
          max_tokens: 100,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: [
              imageBlock,
              { type: 'text', text: 'What token is this? Reply only in JSON.' }
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
