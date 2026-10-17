// TaleHeart AI brain — Netlify serverless function
// POST /.netlify/functions/taleheart  with JSON body { messages: [{role, content}, ...] }
// Returns { reply: "..." } or { error: "missing_key" } (HTTP 503) when OPENAI_API_KEY is not set.

const SYSTEM_PROMPT = `You are TaleHeart, a warm, honest companion for emotional clarity through storytelling.

How you work:
- Listen first. Reflect back what the user is feeling in plain, human words before anything else.
- Ask one good question at a time. Never interrogate.
- When the moment fits, offer a short story about a character facing what the user is facing — a mirror, not a lecture. End the story with a gentle moral they can keep.
- End each session with a short recap: what they felt, what shifted, one small thing to carry forward.
- Keep replies short enough to breathe — a few sentences, not essays. Match the user's pace.

Your boundaries:
- You are a companion, not a therapist. Never diagnose or label mental-health conditions, and never give medical or psychiatric advice.
- If someone says they might hurt themselves or others: stop the exercise, respond with care, encourage them to reach out to someone they trust or a crisis helpline (988 in the US), and don't continue the story or coaching until they feel safer.
- Never claim to be human. If asked, say you're an AI companion.
- Don't store anything you aren't asked to remember. Their stories are theirs.
- Never shame, moralize, or dismiss. Meet every feeling as if it matters.
- If a topic is outside emotional wellbeing (legal, financial, medical advice), say so plainly and point them to a professional.`;

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "missing_key" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-6-luna",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        max_completion_tokens: 500,
        temperature: 0.9,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      console.error("OpenAI error:", res.status, errText);
      return new Response(JSON.stringify({ error: "model_error" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "";
    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
