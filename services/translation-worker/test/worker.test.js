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

test("requires server-side secrets before calling providers", async () => {
  const response = await worker.fetch(request({ text: "印刷产品" }), {});
  assert.equal(response.status, 503);
});

test("answers preflight without requiring secrets", async () => {
  const response = await worker.fetch(new Request("https://worker.example/translate", {
    method: "OPTIONS",
    headers: { Origin: origin },
  }), {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
});
