import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
/**
 * Clear MongoDB Script
 *
 * This script connects to MongoDB and clears all collections.
 * Use with caution - this will delete all data!
 */
async function clearMongoDB() {
	const mongoUri = process.env.MONGODB_URI;
	console.log("mongoUri: ", mongoUri);

	if (!mongoUri) {
		console.error("❌ Error: MONGODB_URI environment variable not set");
		console.error("Please set MONGODB_URI in your .env file");
		process.exit(1);
	}

	try {
		// Connect to MongoDB
		console.log("🔌 Connecting to MongoDB...");
		await mongoose.connect(mongoUri);
		console.log("✅ Connected to MongoDB");
		console.log(`📦 Database: ${mongoose.connection.name}`);
		console.log(
			`🖥️  Host: ${mongoose.connection.host}:${mongoose.connection.port}`,
		);
		if (!mongoose.connection.db) {
			throw new Error("MongoDB not connected");
		}
		// Get all collections
		const collections = await mongoose?.connection?.db.collections();
		console.log(`\n📋 Found ${collections.length} collection(s):\n`);

		if (collections.length === 0) {
			console.log("ℹ️  No collections to clear");
		} else {
			// List all collections
			collections.forEach((collection, index) => {
				console.log(`   ${index + 1}. ${collection.collectionName}`);
			});

			// Clear each collection
			console.log("\n🗑️  Clearing collections...\n");

			for (const collection of collections) {
				const count = await collection.countDocuments();
				await collection.deleteMany({});
				console.log(
					`   ✓ Cleared "${collection.collectionName}" (${count} document${count !== 1 ? "s" : ""})`,
				);
			}

			console.log("\n✅ All collections cleared successfully");
		}

		// Disconnect
		await mongoose.disconnect();
		console.log("👋 Disconnected from MongoDB\n");
	} catch (error: any) {
		console.error("\n❌ Error clearing MongoDB:", error.message);
		if (error.stack) {
			console.error("\nStack trace:", error.stack);
		}
		process.exit(1);
	}
}

// Run the script
clearMongoDB();
