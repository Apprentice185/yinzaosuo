import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const origin = "https://yinzaosuo.com";

function request(body, headers = {}) {
  return new Request("https://worker.example/translate", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("rejects requests from untrusted origins", async () => {
  const response = await worker.fetch(new Request("https://worker.example/translate", {
    method: "POST",
    headers: { Origin: "https://attacker.example", "Content-Type": "application/json" },
    body: JSON.stringify({ text: "测试" }),
  }), {});
  assert.equal(response.status, 403);
});

test("rejects empty and oversized text before provider access", async () => {
  const empty = await worker.fetch(request({ text: "  " }), {});
  assert.equal(empty.status, 400);
  const oversized = await worker.fetch(request({ text: "中".repeat(6001) }), {});
  assert.equal(oversized.status, 413);
});

test("rejects oversized bodies even without a content-length header", async () => {
  const body = JSON.stringify({ text: "短文本", extra: "x".repeat(51000) });
  const response = await worker.fetch(new Request("https://worker.example/translate", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body,
  }), {});
  assert.equal(response.status, 413);
});

test("validates batch size and combined text length", async () => {
  const tooMany = await worker.fetch(request({ texts: Array(31).fill("测试") }), {});
  assert.equal(tooMany.status, 400);
  const tooLong = await worker.fetch(request({ texts: ["中".repeat(6001)] }), {});
  assert.equal(tooLong.status, 413);
  const tooMuchCombined = await worker.fetch(request({ texts: ["中".repeat(5000), "文".repeat(5000), "字".repeat(5000)] }), {});
  assert.equal(tooMuchCombined.status, 413);
  const invalidItem = await worker.fetch(request({ texts: ["中文", 42] }), {});
  assert.equal(invalidItem.status, 400);
});

test("rejects non-object JSON payloads", async () => {
  const response = await worker.fetch(new Request("https://worker.example/translate", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: "null",
  }), {});
  assert.equal(response.status, 400);
});

test("requires server-side secrets before calling providers", async () => {
  const response = await worker.fetch(request({ text: "印刷产品" }), {});
  assert.equal(response.status, 503);
});

test("translates a batch after one Turnstile verification", async () => {
  const originalFetch = globalThis.fetch;
  let turnstileCalls = 0;
  let providerCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (url === "https://challenges.cloudflare.com/turnstile/v0/siteverify") {
      turnstileCalls += 1;
      return Response.json({ success: true, hostname: "yinzaosuo.com" });
    }
    if (url === "https://api.siliconflow.cn/v1/chat/completions") {
      providerCalls += 1;
      const body = JSON.parse(options.body);
      assert.match(body.messages[0].content, /产品名称/);
      return Response.json({
        choices: [{ message: { content: JSON.stringify({ translations: ["Product name", "Special paper"] }) } }],
      });
    }
    throw new Error("Unexpected upstream URL");
  };

  try {
    const response = await worker.fetch(
      request({ texts: ["产品名称", "特种纸"] }, { "X-Turnstile-Token": "valid-token" }),
      { SILICONFLOW_API_KEY: "test-key", TURNSTILE_SECRET: "test-secret" },
    );
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).translatedTexts, ["Product name", "Special paper"]);
    assert.equal(turnstileCalls, 1);
    assert.equal(providerCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("answers preflight without requiring secrets", async () => {
  const response = await worker.fetch(new Request("https://worker.example/translate", {
    method: "OPTIONS",
    headers: { Origin: origin },
  }), {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
});

test("rejects unsupported paths and methods", async () => {
  const wrongPath = await worker.fetch(new Request("https://worker.example/other", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: "{}",
  }), {});
  assert.equal(wrongPath.status, 404);
  const wrongMethod = await worker.fetch(new Request("https://worker.example/translate", {
    method: "GET",
    headers: { Origin: origin },
  }), {});
  assert.equal(wrongMethod.status, 405);
});