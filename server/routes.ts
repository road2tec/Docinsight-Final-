import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateChatResponse, generateDocumentSummary, extractKeywords, isOpenAIConfigured } from "./openai";
import { extractEntities, extractTablesFromText, getTextStatistics, extractKeywordsFromText } from "./nlp";
import type { DocumentAnalysis } from "@shared/schema";

// Configure multer for file uploads
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
    fileSize: 50 * 1024 * 1024, // 50MB limit
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
  // Set up authentication
  await setupAuth(app);

  // Auth routes
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

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Document routes
  app.get("/api/documents", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const query = req.query.q as string | undefined;
      
      const docs = query 
        ? await storage.searchDocuments(userId, query)
        : await storage.getDocuments(userId);
      
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const doc = await storage.getDocumentWithExtractions(req.params.id);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check ownership
      if (doc.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(doc);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // File upload
  app.post("/api/documents/upload", isAuthenticated, upload.single("file"), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.claims.sub;
      const file = req.file;

      // Create document record
      const doc = await storage.createDocument({
        userId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        status: "processing",
      });

      // Process the PDF asynchronously
      processDocument(doc.id, file.path).catch((error) => {
        console.error("Error processing document:", error);
        storage.updateDocument(doc.id, { status: "error" });
      });

      res.json(doc);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (doc.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Delete file from disk
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
  });

  // Chat routes
  app.get("/api/chat/:documentId", isAuthenticated, async (req: any, res: Response) => {
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
  });

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

      // Save user message
      await storage.createChatMessage({
        documentId,
        userId,
        role: "user",
        content,
      });

      // Get chat history
      const chatHistory = await storage.getChatMessages(documentId);
      const historyForAI = chatHistory.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Generate AI response
      let aiResponse: string;
      try {
        aiResponse = await generateChatResponse(
          doc.extractedText || "No text extracted from document.",
          content,
          historyForAI
        );
      } catch (aiError) {
        console.error("AI error:", aiError);
        aiResponse = "I'm sorry, I couldn't process your question. Please try again.";
      }

      // Save AI response
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

  // Reports
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

  const httpServer = createServer(app);
  return httpServer;
}

// Process document in background
async function processDocument(documentId: string, filePath: string): Promise<void> {
  try {
    // Read and parse PDF
    const dataBuffer = fs.readFileSync(filePath);
    // Use dynamic import for pdf-parse (CommonJS module)
    const pdfParse = (await import("pdf-parse")).default;
    const pdfData = await pdfParse(dataBuffer);

    const text = pdfData.text || "";
    const pageCount = pdfData.numpages || 1;

    // Create page record
    await storage.createPage({
      documentId,
      pageNumber: 1,
      extractedText: text,
      ocrConfidence: 1.0,
    });

    // Extract entities using NLP
    const entities = extractEntities(text);
    
    // Extract keywords using NLP
    const nlpKeywords = extractKeywordsFromText(text);
    
    // Extract tables
    const tables = extractTablesFromText(text);
    
    // Get text statistics
    const stats = getTextStatistics(text);

    // Generate AI-powered summary and keywords if OpenAI is available
    let summary = "";
    let aiKeywords: string[] = [];
    
    if (isOpenAIConfigured()) {
      try {
        [summary, aiKeywords] = await Promise.all([
          generateDocumentSummary(text),
          extractKeywords(text),
        ]);
      } catch (aiError) {
        console.error("AI processing error:", aiError);
        // Use NLP-based summary as fallback
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 3);
        summary = sentences.join(". ") + (sentences.length > 0 ? "." : "No summary available.");
      }
    } else {
      // Use basic NLP summary
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 3);
      summary = sentences.join(". ") + (sentences.length > 0 ? "." : "No summary available.");
    }

    // Combine keywords
    const keywords = [...new Set([...aiKeywords, ...nlpKeywords])].slice(0, 15);

    // Create analysis extraction
    const analysis: DocumentAnalysis = {
      summary,
      keywords,
      entities,
      tables,
      wordCount: stats.wordCount,
      characterCount: stats.characterCount,
    };

    await storage.createExtraction({
      documentId,
      extractionType: "analysis",
      data: analysis,
    });

    // Update document status
    await storage.updateDocument(documentId, {
      status: "completed",
      processedAt: new Date(),
      pageCount,
    });
  } catch (error) {
    console.error("Error processing document:", error);
    await storage.updateDocument(documentId, { status: "error" });
    throw error;
  }
}
