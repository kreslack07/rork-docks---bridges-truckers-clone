import * as z from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";
import { isSupabaseConfigured } from "../../lib/supabase";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: number;
}

interface Session {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

const g = globalThis as any;
if (!g.__AUTH_USERS__) g.__AUTH_USERS__ = new Map<string, StoredUser>();
if (!g.__AUTH_SESSIONS__) g.__AUTH_SESSIONS__ = new Map<string, Session>();
if (!g.__AUTH_EMAIL_INDEX__) g.__AUTH_EMAIL_INDEX__ = new Map<string, string>();

const users: Map<string, StoredUser> = g.__AUTH_USERS__;
const sessions: Map<string, Session> = g.__AUTH_SESSIONS__;
const emailIndex: Map<string, string> = g.__AUTH_EMAIL_INDEX__;

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${timestamp}${random}`;
}

function generateToken(): string {
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    parts.push(Math.random().toString(36).slice(2));
  }
  return parts.join("");
}

async function hashPassword(password: string): Promise<string> {
  const salt = "truckdock_server_salt_v3_sha256";
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return "sha$" + hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data[i]) | 0;
  }
  let hash2 = 5381;
  for (let i = 0; i < data.length; i++) {
    hash2 = ((hash2 << 5) + hash2 + data[i]) | 0;
  }
  return `fbk$${Math.abs(hash).toString(36)}$${Math.abs(hash2).toString(36)}`;
}

async function supabaseFetch(path: string, options: RequestInit = {}): Promise<Response | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: Object.assign({
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Prefer": "return=representation",
      }, options.headers ?? {}),
    });
  } catch (e) {
    console.log("[Auth Backend] Supabase fetch error:", e);
    return null;
  }
}

async function persistUserToSupabase(user: StoredUser): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const resp = await supabaseFetch("auth_users", {
      method: "POST",
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        display_name: user.displayName,
        password_hash: user.passwordHash,
        created_at: new Date(user.createdAt).toISOString(),
      }),
      headers: { "Prefer": "return=representation,resolution=merge-duplicates" },
    });
    if (resp && resp.ok) {
      console.log("[Auth Backend] User persisted to Supabase:", user.email);
    } else {
      console.log("[Auth Backend] Supabase user persist failed:", resp?.status);
    }
  } catch (e) {
    console.log("[Auth Backend] Supabase persist error:", e);
  }
}

async function loadUserFromSupabase(email: string): Promise<StoredUser | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const resp = await supabaseFetch(`auth_users?email=eq.${encodeURIComponent(email)}&limit=1`);
    if (!resp || !resp.ok) return null;
    const rows = await resp.json() as Array<{
      id: string;
      email: string;
      display_name: string;
      password_hash: string;
      created_at: string;
    }>;
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      passwordHash: row.password_hash,
      createdAt: new Date(row.created_at).getTime(),
    };
  } catch (e) {
    console.log("[Auth Backend] Supabase load user error:", e);
    return null;
  }
}

async function deleteUserFromSupabase(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabaseFetch(`auth_users?id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" });
    console.log("[Auth Backend] User deleted from Supabase:", userId);
  } catch (e) {
    console.log("[Auth Backend] Supabase delete error:", e);
  }
}

async function updateUserInSupabase(user: StoredUser): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabaseFetch(`auth_users?id=eq.${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ display_name: user.displayName }),
    });
  } catch (e) {
    console.log("[Auth Backend] Supabase update error:", e);
  }
}

function createSession(userId: string): Session {
  const token = generateToken();
  const now = Date.now();
  const session: Session = {
    token,
    userId,
    createdAt: now,
    expiresAt: now + SESSION_DURATION,
  };
  sessions.set(token, session);
  console.log("[Auth Backend] Session created for user:", userId);
  return session;
}

function cleanExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }
}

if (!g.__AUTH_CLEANUP_TIMER__) {
  g.__AUTH_CLEANUP_TIMER__ = setInterval(cleanExpiredSessions, 60 * 60 * 1000);
}

export const authRouter = createTRPCRouter({
  signUp: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        displayName: z.string().min(1, "Display name is required"),
      })
    )
    .mutation(async ({ input }) => {
      const normalizedEmail = input.email.toLowerCase().trim();

      if (emailIndex.has(normalizedEmail)) {
        throw new Error("An account with this email already exists.");
      }

      const existingSupaUser = await loadUserFromSupabase(normalizedEmail);
      if (existingSupaUser) {
        users.set(existingSupaUser.id, existingSupaUser);
        emailIndex.set(normalizedEmail, existingSupaUser.id);
        throw new Error("An account with this email already exists.");
      }

      const passwordHash = await hashPassword(input.password);
      const userId = generateId("usr");
      const now = Date.now();

      const user: StoredUser = {
        id: userId,
        email: normalizedEmail,
        displayName: input.displayName.trim(),
        passwordHash,
        createdAt: now,
      };

      users.set(userId, user);
      emailIndex.set(normalizedEmail, userId);

      void persistUserToSupabase(user);

      const session = createSession(userId);

      console.log("[Auth Backend] User signed up:", normalizedEmail);

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          createdAt: user.createdAt,
        },
        token: session.token,
        expiresAt: session.expiresAt,
      };
    }),

  signIn: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      })
    )
    .mutation(async ({ input }) => {
      const normalizedEmail = input.email.toLowerCase().trim();
      let userId = emailIndex.get(normalizedEmail);
      let user = userId ? users.get(userId) : undefined;

      if (!user) {
        const supaUser = await loadUserFromSupabase(normalizedEmail);
        if (supaUser) {
          users.set(supaUser.id, supaUser);
          emailIndex.set(normalizedEmail, supaUser.id);
          user = supaUser;
          userId = supaUser.id;
        }
      }

      if (!userId || !user) {
        throw new Error("No account found with this email.");
      }

      const passwordHash = await hashPassword(input.password);
      if (user.passwordHash !== passwordHash) {
        throw new Error("Incorrect password.");
      }

      const session = createSession(userId);

      console.log("[Auth Backend] User signed in:", normalizedEmail);

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          createdAt: user.createdAt,
        },
        token: session.token,
        expiresAt: session.expiresAt,
      };
    }),

  getMe: protectedProcedure.query(({ ctx }) => {
    const userId = ctx.userId;
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    console.log("[Auth Backend] getMe for:", user.email);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    };
  }),

  signOut: protectedProcedure.mutation(({ ctx }) => {
    if (ctx.sessionToken) {
      sessions.delete(ctx.sessionToken);
      console.log("[Auth Backend] Session invalidated");
    }
    return { success: true };
  }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.userId;
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    emailIndex.delete(user.email);
    users.delete(userId);

    for (const [token, session] of sessions) {
      if (session.userId === userId) {
        sessions.delete(token);
      }
    }

    void deleteUserFromSupabase(userId);

    console.log("[Auth Backend] Account deleted:", user.email);
    return { success: true };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      if (!userId) {
        throw new Error("Not authenticated");
      }

      const user = users.get(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (input.displayName) {
        user.displayName = input.displayName.trim();
      }

      users.set(userId, user);
      void updateUserInSupabase(user);
      console.log("[Auth Backend] Profile updated for:", user.email);

      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      };
    }),
});

export function resolveSession(token: string | null): { userId: string | null; sessionToken: string | null } {
  if (!token) return { userId: null, sessionToken: null };

  const session = sessions.get(token);
  if (!session) return { userId: null, sessionToken: null };

  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return { userId: null, sessionToken: null };
  }

  return { userId: session.userId, sessionToken: token };
}
