const ALLOWED_ORIGIN = "https://yinzaosuo.com";
const MODEL = "tencent/Hunyuan-MT-7B";
const MAX_TEXT_LENGTH = 6000;
const MAX_BODY_BYTES = 20000;

function json(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "Content-Type, X-Turnstile-Token",
      "vary": "Origin",
    },
  });
}

async function readJsonLimited(request) {
  const reader = request.body && request.body.getReader();
  if (!reader) throw new Error("empty");
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("too_large");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function verifyTurnstile(token, secret, ip) {
  if (!token || !secret) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true && result.hostname === "yinzaosuo.com";
}

function makePrompt(text, sourceLanguage, targetLanguage) {
  return [
    "You are a professional commercial printing industry translator.",
    "Translate the supplied content faithfully from " + sourceLanguage + " to " + targetLanguage + ".",
    "Preserve product specifications, measurements, units, numbers, URLs, model names, proper nouns, Markdown, and HTML structure.",
    "Use natural, concise B2B website language. Do not add explanations, notes, quotation marks, or facts that are not in the source.",
    "Return only the translated content.",
    "",
    "SOURCE:",
    text,
  ].join("\n");
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (origin !== ALLOWED_ORIGIN) {
      return json({ error: "Origin not allowed." }, 403, ALLOWED_ORIGIN);
    }

    const pathname = new URL(request.url).pathname;
    if (pathname !== "/translate") return json({ error: "Not found." }, 404);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": ALLOWED_ORIGIN,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "Content-Type, X-Turnstile-Token",
          "access-control-max-age": "86400",
          "vary": "Origin",
        },
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) return json({ error: "Request too large." }, 413);

    let payload;
    try {
      payload = await readJsonLimited(request);
    } catch (error) {
      if (error && error.message === "too_large") return json({ error: "Request too large." }, 413);
      return json({ error: "Invalid JSON body." }, 400);
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return json({ error: "JSON body must be an object." }, 400);
    }

    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    const sourceLanguage = typeof payload.sourceLanguage === "string" ? payload.sourceLanguage : "Chinese";
    const targetLanguage = typeof payload.targetLanguage === "string" ? payload.targetLanguage : "English";

    if (!text) return json({ error: "Please enter text to translate." }, 400);
    if (text.length > MAX_TEXT_LENGTH) {
      return json({ error: "Text is too long. Maximum length is " + MAX_TEXT_LENGTH + " characters." }, 413);
    }
    if (!["Chinese", "English"].includes(sourceLanguage) || !["Chinese", "English"].includes(targetLanguage) || sourceLanguage === targetLanguage) {
      return json({ error: "Unsupported translation direction." }, 400);
    }
    if (!env.SILICONFLOW_API_KEY || !env.TURNSTILE_SECRET) {
      return json({ error: "Translation service is not configured yet." }, 503);
    }

    const token = request.headers.get("X-Turnstile-Token") || "";
    let verified = false;
    try {
      verified = await verifyTurnstile(token, env.TURNSTILE_SECRET, request.headers.get("CF-Connecting-IP"));
    } catch {
      return json({ error: "Security verification service is temporarily unavailable." }, 502);
    }
    if (!verified) return json({ error: "Security verification failed. Please retry." }, 403);

    let upstream;
    try {
      upstream = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          "authorization": "Bearer " + env.SILICONFLOW_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: makePrompt(text, sourceLanguage, targetLanguage) }],
          temperature: 0.1,
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      return json({ error: "Translation provider is temporarily unavailable." }, 502);
    }

    if (!upstream.ok) {
      return json({ error: "Translation provider returned an error.", providerStatus: upstream.status }, 502);
    }

    let result;
    try {
      result = await upstream.json();
    } catch {
      return json({ error: "Invalid response from translation provider." }, 502);
    }

    const translatedText = result && result.choices && result.choices[0] &&
      result.choices[0].message && result.choices[0].message.content;
    if (typeof translatedText !== "string" || !translatedText.trim()) {
      return json({ error: "Translation provider returned empty content." }, 502);
    }

    return json({ translatedText: translatedText.trim(), model: MODEL });
  },
};

export { makePrompt, readJsonLimited };