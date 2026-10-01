import test from "node:test";
import assert from "node:assert/strict";
import { describeAsset, newAssetSettings } from "../lib/video/library.ts";

const asset = (overrides = {}) => ({ id: "asset1", status: "ready", created_at: "1790000000", duration: 61.2, aspect_ratio: "16:9", playback_ids: [{ id: "pub1", policy: "public" }], tracks: [{ id: "v1", type: "video" }, { id: "a1", type: "audio", status: "ready" }], ...overrides });

test("a dashboard upload is seen as public, uncaptioned, and needing a signed playback ID", () => {
  const info = describeAsset(asset());
  assert.equal(info.signedPlaybackId, undefined);
  assert.deepEqual(info.publicPlaybackIds, ["pub1"]);
  assert.equal(info.audioTrackId, "a1");
  assert.equal(info.captions, "none");
  assert.equal(info.durationSeconds, 62);
  assert.equal(info.title, undefined);
  assert.match(info.label, /^Video · \d{1,2}\.\d{1,2}\.\d{4}$/);
});

test("caption state follows the generated text tracks", () => {
  const withText = status => describeAsset(asset({ tracks: [{ id: "t1", type: "text", status }] })).captions;
  assert.equal(withText("preparing"), "preparing");
  assert.equal(withText("ready"), "ready");
  assert.equal(withText("errored"), "failed");
});

test("the Mux title and signed playback ID are used when present", () => {
  const info = describeAsset(asset({ meta: { title: "  Giriş  " }, playback_ids: [{ id: "sig1", policy: "signed" }] }));
  assert.equal(info.title, "Giriş");
  assert.equal(info.label, "Giriş");
  assert.equal(info.signedPlaybackId, "sig1");
  assert.deepEqual(info.publicPlaybackIds, []);
});

test("lesson uploads are signed-only with Turkish auto-captions and the lesson as Mux metadata", () => {
  const settings = newAssetSettings({ id: "lesson-1", title: "1. video dersi", kind: "video" });
  assert.deepEqual(settings.playback_policies, ["signed"]);
  assert.deepEqual(settings.inputs, [{ generated_subtitles: [{ language_code: "tr", name: "Türkçe (otomatik)" }] }]);
  assert.deepEqual(settings.meta, { title: "1. video dersi", external_id: "lesson-1" });
  assert.equal(settings.passthrough, "lesson-1");
});

test("a recording is uploaded signed-only without captions, and an asset without a picture is a recording", () => {
  const settings = newAssetSettings({ id: "lesson-2", title: "1. ses dersi", kind: "audio" });
  assert.deepEqual([settings.playback_policies, settings.passthrough, "inputs" in settings], [["signed"], "lesson-2", false]);
  assert.equal(describeAsset(asset()).audioOnly, false);
  const recording = describeAsset(asset({ aspect_ratio: undefined, tracks: [{ id: "a1", type: "audio", status: "ready" }] }));
  assert.equal(recording.audioOnly, true);
  assert.match(recording.label, /^Ses kaydı · /);
  assert.equal(describeAsset(asset({ status: "preparing", tracks: undefined })).audioOnly, false, "unknown until Mux has read the file");
});
