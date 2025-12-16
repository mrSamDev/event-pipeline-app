import { betterAuth } from "better-auth";
import { type MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";

/**
 * Better Auth configuration with MongoDB adapter
 *
 * This configuration uses the existing mongoose connection to create a MongoDB client
 * for Better Auth. The adapter handles user authentication, session management, and
 * user data storage.
 *
 * Features:
 * - Email/Password authentication
 * - Session management with cookies
 * - MongoDB storage via mongoose connection
 * - Database joins enabled for better performance (experimental)
 */

/**
 * Get MongoDB client from mongoose connection
 * This reuses the existing mongoose connection instead of creating a new one
 */
function getMongoClient(): MongoClient {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Mongoose must be connected before initializing Better Auth. Call mongoose.connect() first.");
  }

  // Get the native MongoDB client from mongoose
  const client = mongoose.connection.getClient() as MongoClient;
  if (!client) {
    throw new Error("Failed to get MongoDB client from mongoose connection");
  }
  return client;
}

/**
 * Get MongoDB database instance from mongoose
 */
function getMongoDb() {
  const client = getMongoClient();
  const dbName = mongoose.connection.db?.databaseName;

  if (!dbName) {
    throw new Error("Failed to get database name from mongoose connection");
  }

  return client.db(dbName);
}

/**
 * Initialize Better Auth
 * Must be called after mongoose.connect() has completed
 */
export function initAuth() {
  const db = getMongoDb();

  const trustedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()) || [
    "http://localhost:3000",
    "http://localhost:5173",
  ];

  console.log("[Auth] Initializing Better Auth with config:");
  console.log(`  - baseURL: ${process.env.BETTER_AUTH_URL || "http://localhost:3000"}`);
  console.log(`  - trustedOrigins:`, trustedOrigins);
  console.log(`  - useSecureCookies: ${process.env.NODE_ENV === "production"}`);

  return betterAuth({
    database: mongodbAdapter(db, {
      // Don't provide client to disable transactions
      // Transactions require MongoDB replica set, which most dev environments don't have
      // client: client,
    }),

    // Email and password authentication
    emailAndPassword: {
      enabled: true,
      // Require email verification before login (set to false for development)
      requireEmailVerification: false,
    },

    // Session configuration
    session: {
      // Session expires after 7 days of inactivity
      expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
      // Update session expiry on each request
      updateAge: 60 * 60 * 24, // 1 day in seconds
    },

    // Security settings
    secret: process.env.BETTER_AUTH_SECRET || "please-change-this-secret-in-production",

    // Base URL for the application
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

    // Trusted origins for CORS
    trustedOrigins,

    // Enable experimental features
    experimental: {
      // Database joins for better performance (2-3x improvement)
      joins: true,
    },

    // Advanced options
    advanced: {
      // Use secure cookies in production
      useSecureCookies: process.env.NODE_ENV === "production",
      // Cross-site cookie settings
      crossSubDomainCookies: {
        enabled: false,
      },
      // Cookie options
      cookieOptions: {
        sameSite: "none", // Required for cross-origin cookies
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        path: "/",
      },
    },
  });
}

/**
 * Auth instance - will be initialized after database connection
 * Export as a function to ensure it's called after mongoose connects
 */
let authInstance: ReturnType<typeof betterAuth> | null = null;

export function getAuth() {
  if (!authInstance) {
    authInstance = initAuth();
  }
  return authInstance;
}

// Export the type for use in other files
export type Auth = ReturnType<typeof betterAuth>;
