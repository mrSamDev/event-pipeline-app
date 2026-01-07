import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { getAuth } from "./src/auth";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
	console.error("MONGODB_URI environment variable not set");
	process.exit(1);
}

// Connect to MongoDB first
console.log("Connecting to MongoDB...");
await mongoose.connect(mongoUri);
console.log("MongoDB connected");

// Now we can use Better Auth
const auth = getAuth();

// Example: Sign up a new user
console.log("\nCreating test user...");
try {
	const signUpResponse = await auth.api.signUpEmail({
		body: {
			email: "test@example.com",
			password: "password123",
			name: "Test User",
		},
	});
	console.log("User created:", signUpResponse);
} catch (error: unknown) {
	const errorMessage = error instanceof Error ? error.message : String(error);
	console.log("Sign up error (user might already exist):", errorMessage);
}

// Example: Sign in
console.log("\nSigning in...");
try {
	const signInResponse = await auth.api.signInEmail({
		body: {
			email: "test@example.com",
			password: "password123",
		},
	});
	console.log("Sign in successful:", signInResponse);
} catch (error: unknown) {
	const errorMessage = error instanceof Error ? error.message : String(error);
	console.error("Sign in error:", errorMessage);
}

// Close connection
await mongoose.connection.close();
console.log("\nMongoDB connection closed");
