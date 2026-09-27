import test from "node:test";
import assert from "node:assert/strict";
import { createResendDelivery } from "../lib/email/transport.ts";
const message = { to: "owner@example.com", subject: "Contact", text: "Hello", replyTo: "visitor@example.com" };
const settings = { from: "Site <site@example.com>", replyTo: "support@example.com" };

test("Resend retries throttling with the same key and correct sender/reply address", async () => {
  const calls = [];
  const pauses = [];
  const delivery = createResendDelivery({ emails: { send: async (...args) => {
    calls.push(args);
    return calls.length === 1 ? { error: { statusCode: 429 }, data: null } : { data: { id: "sent-1" }, error: null };
  } } }, settings, async ms => { pauses.push(ms); });
  assert.equal(await delivery(message, "stable-key"), "sent-1");
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0][0].from, settings.from);
  assert.equal(calls[0][0].replyTo, message.replyTo);
  assert.deepEqual(pauses, [1000]);
});

test("permanent provider errors fail once without leaking details", async () => {
  let calls = 0;
  const delivery = createResendDelivery({ emails: { send: async () => {
    calls++;
    return { data: null, error: { statusCode: 403, message: "private address" } };
  } } }, settings, async () => assert.fail("no retry"));
  await assert.rejects(delivery(message, "key"), { message: "Email provider rejected delivery." });
  assert.equal(calls, 1);
});

test("temporary outages have bounded retries and auth emails use the default reply address", async () => {
  let calls = 0;
  const delivery = createResendDelivery({ emails: { send: async payload => {
    calls++;
    assert.equal(payload.replyTo, settings.replyTo);
    return { data: null, error: { statusCode: 503 } };
  } } }, settings, async () => {});
  const authMessage = { to: message.to, subject: message.subject, text: message.text };
  await assert.rejects(delivery(authMessage, "key"));
  assert.equal(calls, 3);
});
