import { initBotId } from "botid/client/core";

// Vercel BotID (Basic mode); the matching server handlers call checkBotId().
initBotId({
  protect: [
    { path: "/iletisim", method: "POST" },
    { path: "/api/newsletter", method: "POST" },
    { path: "/api/auth/sign-up/email", method: "POST" },
    { path: "/api/auth/sign-in/email", method: "POST" },
    { path: "/api/auth/request-password-reset", method: "POST" },
    { path: "/api/auth/send-verification-email", method: "POST" },
    { path: "/akademi/hesabim", method: "POST" },
  ],
});
