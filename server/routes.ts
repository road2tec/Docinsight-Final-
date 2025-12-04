import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { createRequire } from "module";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  generateDocumentSummary,
  extractKeywords,
  isGeminiConfigured,
  generateChatResponse,
} from "./gemini";
import {
  extractEntities,
  extractTablesFromText,
  getTextStatistics,
  extractKeywordsFromText,
} from "./nlp";
import type { DocumentAnalysis } from "@shared/schema";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  app.get("/api/auth/user", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get(
    "/api/dashboard/stats",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = req.user.claims.sub;
        const stats = await storage.getDashboardStats(userId);
        res.json(stats);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ message: "Failed to fetch dashboard stats" });
      }
    }
  );

  app.get("/api/documents", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const query = req.query.q as string | undefined;

      const docs =
        query ?
          await storage.searchDocuments(userId, query) :
          await storage.getDocuments(userId);

      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get(
    "/api/documents/:id",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const doc = await storage.getDocumentWithExtractions(req.params.id);
        if (!doc) {
          return res.status(404).json({ message: "Document not found" });
        }

        if (doc.userId !== req.user.claims.sub) {
          return res.status(403).json({ message: "Access denied" });
        }

        res.json(doc);
      } catch (error) {
        console.error("Error fetching document:", error);
        res.status(500).json({ message: "Failed to fetch document" });
      }
    }
  );

  app.post(
    "/api/documents/upload",
    isAuthenticated,
    upload.single("file"),
    async (req: any, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const userId = req.user.claims.sub;
        const file = req.file;

        const doc = await storage.createDocument({
          userId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          status: "processing",
        });

        processDocument(doc.id, file.path).catch((error) => {
          console.error(`Error processing document ${doc.id}:`, error);
          storage.updateDocument(doc.id, { status: "error" });
        });

        res.json(doc);
      } catch (error) {
        console.error("Error uploading document:", error);
        res.status(500).json({ message: "Failed to upload document" });
      }
    }
  );

  app.delete(
    "/api/documents/:id",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const doc = await storage.getDocument(req.params.id);
        if (!doc) {
          return res.status(404).json({ message: "Document not found" });
        }

        if (doc.userId !== req.user.claims.sub) {
          return res.status(403).json({ message: "Access denied" });
        }

        const filePath = path.join(uploadDir, doc.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        await storage.deleteDocument(req.params.id);
        res.json({ message: "Document deleted" });
      } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({ message: "Failed to delete document" });
      }
    }
  );

  app.get(
    "/api/chat/:documentId",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const doc = await storage.getDocument(req.params.documentId);
        if (!doc) {
          return res.status(404).json({ message: "Document not found" });
        }

        if (doc.userId !== req.user.claims.sub) {
          return res.status(403).json({ message: "Access denied" });
        }

        const messages = await storage.getChatMessages(req.params.documentId);
        res.json(messages);
      } catch (error) {
        console.error("Error fetching chat messages:", error);
        res.status(500).json({ message: "Failed to fetch chat messages" });
      }
    }
  );

  app.post("/api/chat", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { documentId, content } = req.body;
      const userId = req.user.claims.sub;

      if (!documentId || !content) {
        return res.status(400).json({ message: "Missing documentId or content" });
      }

      const doc = await storage.getDocumentWithExtractions(documentId);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (doc.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.createChatMessage({
        documentId,
        userId,
        role: "user",
        content,
      });

      const chatHistory = await storage.getChatMessages(documentId);
      const historyForAI = chatHistory.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      let aiResponse: string;
      try {
        aiResponse = await generateChatResponse(
          doc.extractedText || "No text extracted from document.",
          content,
          historyForAI
        );
      } catch (aiError) {
        console.error("AI error:", aiError);
        aiResponse =
          "I'm sorry, I couldn't process your question. Please try again.";
      }

      const assistantMessage = await storage.createChatMessage({
        documentId,
        userId,
        role: "assistant",
        content: aiResponse,
      });

      res.json(assistantMessage);
    } catch (error) {
      console.error("Error sending chat message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/reports", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const reports = await storage.getReportsData(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  (async () => {
    try {
      console.log("Checking for documents stuck in 'processing' state...");
      const stuckDocuments = await storage.getStuckDocuments();

      if (stuckDocuments.length > 0) {
        console.log(
          `Found ${stuckDocuments.length} stuck document(s). Restarting processing...`
        );

        for (const doc of stuckDocuments) {
          try {
            const docId = (doc as any)._id
              ? (doc as any)._id.toString()
              : doc.id;

            if (!docId) {
              console.error(
                `- Reprocessing failed: Document with original name '${doc.originalName}' has no ID.`
              );
              continue;
            }

            const filePath = path.join(uploadDir, doc.filename);
            if (fs.existsSync(filePath)) {
              console.log(`- Reprocessing: ${doc.originalName} (ID: ${docId})`);
              await processDocument(docId, filePath);
            } else {
              console.warn(
                `- File not found for document ${docId}. Marking as error.`
              );
              await storage.updateDocument(docId, { status: "error" });
            }
          } catch (error) {
            console.error(
              `Error reprocessing document ${(doc as any).id}:`,error
            );
          }
        }

        console.log("Finished reprocessing stuck documents.");
      } else {
        console.log("No stuck documents found. System is clean.");
      }
    } catch (error) {
      console.error(
        "Error during startup reprocessing of stuck documents:",
        error
      );
    }
  })();

  const httpServer = createServer(app);
  return httpServer;
}

async function processDocument(
  documentId: string,
  filePath: string
): Promise<void> {
  console.log(`Starting to process document ${documentId} at path ${filePath}`);
  try {
    await storage.updateDocument(documentId, {
      status: "processing",
      processingProgress: 10,
    });
    console.log(`[${documentId}] Parsing PDF...`);
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    await storage.updateDocument(documentId, { processingProgress: 25 });
    console.log(`[${documentId}] PDF parsed successfully.`);

    const text = pdfData.text || "";
    const pageCount = pdfData.numpages || 1;

    console.log(`[${documentId}] Saving extracted text...`);
    await storage.createPage({
      documentId,
      pageNumber: 1,
      extractedText: text,
      ocrConfidence: 1.0,
    });
    await storage.updateDocument(documentId, { processingProgress: 40 });
    console.log(`[${documentId}] Extracted text saved.`);

    console.log(`[${documentId}] Running NLP tasks...`);
    const [entities, nlpKeywords, tables, stats] = await Promise.all([
      Promise.resolve(extractEntities(text)).catch((e) => {
        console.error(`[${documentId}] Error in extractEntities`, e);
        return [];
      }),
      Promise.resolve(extractKeywordsFromText(text)).catch((e) => {
        console.error(`[${documentId}] Error in extractKeywordsFromText`, e);
        return [];
      }),
      Promise.resolve(extractTablesFromText(text)).catch((e) => {
        console.error(`[${documentId}] Error in extractTablesFromText`, e);
        return [];
      }),
      Promise.resolve(getTextStatistics(text)).catch((e) => {
        console.error(`[${documentId}] Error in getTextStatistics`, e);
        return { wordCount: 0, characterCount: 0 };
      }),
    ]);
    await storage.updateDocument(documentId, { processingProgress: 60 });
    console.log(`[${documentId}] NLP tasks completed.`);

    const sentences = text
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 20)
      .slice(0, 3);
    const summary =
      sentences.join(". ") + (sentences.length > 0 ? "." : "No summary available.");

    const analysis: DocumentAnalysis = {
      summary,
      keywords: nlpKeywords.slice(0, 15),
      entities,
      tables,
      wordCount: stats.wordCount,
      characterCount: stats.characterCount,
    };

    console.log(`[${documentId}] Saving analysis...`);
    await storage.createExtraction({
      documentId,
      extractionType: "analysis",
      data: analysis,
    });
    await storage.updateDocument(documentId, { processingProgress: 80 });
    console.log(`[${documentId}] Analysis saved.`);

    if (isGeminiConfigured()) {
      console.log(`[${documentId}] Enhancing with AI...`);
      await enhanceAnalysisWithAI(documentId, text);
      await storage.updateDocument(documentId, { processingProgress: 90 });
      console.log(`[${documentId}] AI enhancement completed.`);
    }

    await storage.updateDocument(documentId, {
      status: "completed",
      processedAt: new Date(),
      pageCount,
      processingProgress: 100,
    });
    console.log(`[${documentId}] Processing complete.`);
  } catch (error) {
    console.error(`[${documentId}] Error processing document:`, error);
    await storage.updateDocument(documentId, {
      status: "error",
      processingProgress: -1,
    });
    throw error;
  }
}

async function enhanceAnalysisWithAI(
  documentId: string,
  text: string
): Promise<void> {
  try {
    const [summary, aiKeywords] = await Promise.all([
      generateDocumentSummary(text),
      extractKeywords(text),
    ]);

    const existingExtraction = await storage.getExtraction(
      documentId,
      "analysis"
    );
    if (existingExtraction) {
      const analysis = existingExtraction.data as DocumentAnalysis;
      analysis.summary = summary;
      analysis.keywords = [
        ...new Set([...aiKeywords, ...analysis.keywords]),
      ].slice(0, 15);
      await storage.updateExtraction(existingExtraction.id, analysis);
    }
  } catch (error) {
    console.error(`[${documentId}] AI enhancement failed:`, error);
  }
}
