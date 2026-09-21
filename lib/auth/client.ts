"use client";
import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

// No refetch on tab focus: the header would otherwise hit get-session on every focus.
export const authClient = createAuthClient({ plugins: [twoFactorClient()], sessionOptions: { refetchOnWindowFocus: false } });
