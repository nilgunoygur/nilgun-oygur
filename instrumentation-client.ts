import { initBotId } from "botid/client/core";

// Invisible bot check (Vercel BotID, Basic mode) on the account endpoints that send email or accept passwords,
// and on "Siparişimi ekle", which queries Shopier. The server side calls checkBotId() for the same requests.
initBotId({
  protect: [
    { path: "/api/auth/sign-up/email", method: "POST" },
    { path: "/api/auth/sign-in/email", method: "POST" },
    { path: "/api/auth/request-password-reset", method: "POST" },
    { path: "/api/auth/send-verification-email", method: "POST" },
    { path: "/akademi/hesabim", method: "POST" },
  ],
});
