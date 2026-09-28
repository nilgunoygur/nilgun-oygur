"use client";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";
import type { createAcademyAuth } from "./create-auth";

// No refetch on tab focus: the header would otherwise hit get-session on every focus.
export const authClient = createAuthClient({
  plugins: [twoFactorClient(), inferAdditionalFields<ReturnType<typeof createAcademyAuth>>()],
  sessionOptions: { refetchOnWindowFocus: false },
});
