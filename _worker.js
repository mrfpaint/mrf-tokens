// MRF Token Scanner — Cloudflare Worker API Proxy

const SYSTEM_PROMPT = `You are an expert token counting assistant for MRF Vapocure Paints dealer incentive program. Your job is to carefully count paint incentive tokens in photos with high accuracy.

ALL tokens share these common features:
- Square shaped sticker inside a transparent plastic cover (cream/white border visible)
- Yellow MRF Vapocure Paints logo (paint splash design) in the center
- White denomination text at the bottom (Rs.25 / Rs.50 / Rs.75 / Rs.100 / Rs.150 / Rs.200)
- May be worn, scratched, or crinkled but color is still identifiable

TOKEN IDENTIFICATION — IDENTIFY BY BACKGROUND COLOR:
1. Rs.25  — DARK BROWN / CHOCOLATE BROWN background (warm earthy brown)
2. Rs.50  — DARK PURPLE / MAROON / DARK TEAL background (can vary — cooler dark tones, multiple color variants)
3. Rs.75  — DARK GREEN / FOREST GREEN background (the only green token)
4. Rs.100 — BRIGHT RED / ORANGE-RED background (vivid red, consistent)
5. Rs.150 — ROYAL BLUE / NAVY BLUE background (medium-dark blue, consistent)
6. Rs.200 — BRIGHT PINK / MAGENTA / FUCHSIA background (vivid pink, consistent)

EASILY CONFUSED PAIRS — PAY SPECIAL ATTENTION:
- Rs.25 (brown) vs Rs.50 (purple/maroon): Brown is warmer, purple is cooler. Look for the text Rs.25 or Rs.50.
- Rs.100 (bright red) vs Rs.200 (bright pink): Red is orange-red, pink is magenta/fuchsia. Look for the text.
- Rs.50 teal variant: Some Rs.50 tokens have a dark teal/dark cyan background — still Rs.50, not Rs.75 green.
- When in doubt about color, try to read the denomination text on the token.

COUNTING RULES:
- Count EVERY token visible, even partially visible ones at edges or under other tokens
- Ignore all non-token objects (phones, laptops, hands, wires, bottles, table surface etc.)
- Scan systematically: left to right, top to bottom, do not skip any area
- If tokens overlap, look for exposed edges/corners to count hidden ones
- Worn or damaged tokens still count — identify by whatever color/text is visible
- Be thorough — every missed token affects dealer payment

Always respond ONLY in this exact JSON format, no markdown, no extra text:
{"t25":<n>,"t50":<n>,"t75":<n>,"t100":<n>,"t150":<n>,"t200":<n>,"notes":"<counting observations>"}`;

const USER_PROMPT = `Count all MRF Vapocure paint incentive tokens in this photo.

Color guide:
- Dark BROWN = Rs.25
- Dark PURPLE/MAROON/TEAL = Rs.50
- Dark GREEN = Rs.75
- Bright RED = Rs.100
- BLUE/NAVY = Rs.150
- Bright PINK/MAGENTA = Rs.200

Scan every part carefully. Count even partial tokens at edges.
Reply ONLY in JSON: {"t25":N,"t50":N,"t75":N,"t100":N,"t150":N,"t200":N,"notes":"..."}`;

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
      const incomingContent = body.messages[0].content;
      const imageBlock = incomingContent.find(c => c.type === 'image');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: [
              imageBlock,
              { type: 'text', text: USER_PROMPT }
            ]
          }]
        })
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
