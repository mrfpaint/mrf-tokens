// MRF Token Scanner v5 — Batch Photo Counter

const SYSTEM_PROMPT = `You are a precise token counting assistant for MRF Vapocure Paints dealer incentive program.

WHAT YOU ARE COUNTING:
Square tokens inside transparent plastic covers, each with a yellow MRF Vapocure Paints logo and white text showing the amount: Rs.25, Rs.35, Rs.50, Rs.75, Rs.100, Rs.150, or Rs.200.

YOUR TASK — TWO PASSES:

PASS 1 — LOCATE ALL TOKENS:
Scan the entire image systematically (left to right, top to bottom).
Mark every square object with a yellow logo as a token.
Count the total number of tokens you can see (including partially hidden ones).

PASS 2 — IDENTIFY EACH TOKEN BY READING ITS TEXT:
Go back to each token you found in Pass 1.
Read the white text printed on it. The text always says one of: Rs.25, Rs.35, Rs.50, Rs.75, Rs.100, Rs.150, Rs.200.
Assign each token its denomination based on the text you read.

IMPORTANT RULES:
- The total in your JSON MUST equal the count from Pass 1. Do not add or subtract tokens.
- If you found 13 tokens in Pass 1, your JSON values must sum to 13.
- If text on a token is unreadable, use its background color: brown=25, gold=35, purple=50, green=75, red=100, blue=150, pink=200.
- Tokens may be upside down — the text will also be upside down, still read it.
- Do NOT count the same token twice even if it is partially under another token.
- Ignore everything that is not a token (laptop, books, wires, hands, phone, etc).

Respond ONLY in this exact JSON with no markdown:
{"t25":<n>,"t35":<n>,"t50":<n>,"t75":<n>,"t100":<n>,"t150":<n>,"t200":<n>,"notes":"<total found in pass 1, and any unreadable tokens>"}`;

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
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: [
              imageBlock,
              { type: 'text', text: 'First count how many tokens exist in total, then identify each one by reading its text. The sum of values in your JSON must equal your total count. Reply only in JSON.' }
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
