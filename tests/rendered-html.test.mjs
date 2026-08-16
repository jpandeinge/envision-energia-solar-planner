import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Envision Energia planning journey", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Envision Energia — Solar planning for Namibia/i);
  assert.match(html, /Build a solar plan around your property\./i);
  assert.match(html, /Residential solar planner/i);
  assert.match(html, /Where will the panels go\?/i);
  assert.match(html, /Planning estimate/i);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/i);
});

test("keeps supplier evidence and product metadata in the app", async () => {
  const [planner, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/solar-planner.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(planner, /Pupkewitz Megabuild/);
  assert.match(planner, /Electro Dynamics/);
  assert.match(planner, /Pupkewitz Megatech ReEnSol/);
  assert.match(planner, /Verified/);
  assert.match(planner, /NEXT_PUBLIC_GOOGLE_MAPS_API_KEY/);
  assert.match(planner, /MapTypeId\.HYBRID/);
  assert.match(planner, /`N\$\$\{nadNumber\.format\(value\)\}`/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /\/og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("../public/og.png", import.meta.url));
});
