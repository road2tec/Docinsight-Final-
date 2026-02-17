import "dotenv/config";
import { db } from "../server/db";
import { storage } from "../server/storage";

async function fixStuckDocuments() {
    console.log("Checking for stuck documents...");
    try {
        const documents = await db.collection("documents").find({ status: "processing" }).toArray();

        if (documents.length === 0) {
            console.log("No stuck documents found.");
            return;
        }

        console.log(`Found ${documents.length} stuck documents. Resetting them to 'error' state.`);

        for (const doc of documents) {
            await storage.updateDocument(doc._id.toString(), {
                status: "error",
                statusMessage: "Processing interrupted. Please retry or delete.",
                processingProgress: 0
            });
            console.log(`Reset document ${doc._id} (${doc.originalName})`);
        }

        console.log("Done.");
    } catch (error) {
        console.error("Error fixing documents:", error);
    } finally {
        process.exit(0);
    }
}

fixStuckDocuments();
