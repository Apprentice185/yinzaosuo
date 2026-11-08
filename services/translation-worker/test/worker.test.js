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
  const body = JSON.stringify({ text: "短文本", extra: "x".repeat(21000) });
  const response = await worker.fetch(new Request("https://worker.example/translate", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body,
  }), {});
  assert.equal(response.status, 413);
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