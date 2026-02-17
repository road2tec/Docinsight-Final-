
import "dotenv/config";
import { MongoClient } from "mongodb";

async function wipeAllDocuments() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI not set");
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        const dbName = process.env.MONGODB_DB_NAME || "intelligent-document-processing";
        const db = client.db(dbName);

        console.log(`Connected to ${dbName}. Wiping data...`);

        const collections = ["documents", "pages", "extractions", "chatMessages"];

        for (const col of collections) {
            const result = await db.collection(col).deleteMany({});
            console.log(`Deleted ${result.deletedCount} items from ${col}.`);
        }
        console.log("All documents and related data wiped.");
    } catch (error) {
        console.error("Error wiping data:", error);
    } finally {
        await client.close();
        process.exit(0);
    }
}

wipeAllDocuments();
