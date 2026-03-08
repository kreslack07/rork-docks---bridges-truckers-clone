import * as z from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";

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

const users: Map<string, StoredUser> = new Map();
const sessions: Map<string, Session> = new Map();
const emailIndex: Map<string, string> = new Map();

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
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "truckdock_server_salt_v2_secure");
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash + data[i]) | 0;
  }
  const h1 = Math.abs(hash).toString(36);

  let hash2 = 0;
  for (let i = 0; i < data.length; i++) {
    hash2 = data[i] + ((hash2 << 6) + (hash2 << 16) - hash2);
  }
  const h2 = Math.abs(hash2).toString(36);

  return `svr$${h1}$${h2}`;
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

setInterval(cleanExpiredSessions, 60 * 60 * 1000);

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
      const userId = emailIndex.get(normalizedEmail);

      if (!userId) {
        throw new Error("No account found with this email.");
      }

      const user = users.get(userId);
      if (!user) {
        throw new Error("Account data not found.");
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

  deleteAccount: protectedProcedure.mutation(({ ctx }) => {
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

    console.log("[Auth Backend] Account deleted:", user.email);
    return { success: true };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1).optional(),
      })
    )
    .mutation(({ ctx, input }) => {
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
