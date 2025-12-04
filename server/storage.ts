import {
  users,
  documents,
  pages,
  extractions,
  chatMessages,
  type User,
  type UpsertUser,
  type Document,
  type InsertDocument,
  type Page,
  type InsertPage,
  type Extraction,
  type InsertExtraction,
  type ChatMessage,
  type InsertChatMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Document operations
  getDocuments(userId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentWithExtractions(id: string): Promise<(Document & { extractions: Extraction[]; extractedText?: string }) | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<void>;
  searchDocuments(userId: string, query: string): Promise<Document[]>;

  // Page operations
  createPage(page: InsertPage): Promise<Page>;
  getPages(documentId: string): Promise<Page[]>;

  // Extraction operations
  createExtraction(extraction: InsertExtraction): Promise<Extraction>;
  getExtractions(documentId: string): Promise<Extraction[]>;

  // Chat operations
  getChatMessages(documentId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Dashboard stats
  getDashboardStats(userId: string): Promise<{
    totalDocuments: number;
    processingCount: number;
    completedCount: number;
    errorCount: number;
    recentDocuments: Document[];
  }>;

  // Reports data
  getReportsData(userId: string): Promise<{
    totalDocuments: number;
    totalPages: number;
    totalWords: number;
    documentsOverTime: { date: string; count: number }[];
    entityDistribution: { name: string; value: number }[];
    topKeywords: { keyword: string; count: number }[];
    statusDistribution: { status: string; count: number }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Document operations
  async getDocuments(userId: string): Promise<Document[]> {
    return db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.uploadDate));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async getDocumentWithExtractions(id: string): Promise<(Document & { extractions: Extraction[]; extractedText?: string }) | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    if (!doc) return undefined;

    const docExtractions = await db
      .select()
      .from(extractions)
      .where(eq(extractions.documentId, id));

    const docPages = await db
      .select()
      .from(pages)
      .where(eq(pages.documentId, id))
      .orderBy(pages.pageNumber);

    const extractedText = docPages
      .map((p) => p.extractedText)
      .filter(Boolean)
      .join("\n\n");

    return {
      ...doc,
      extractions: docExtractions,
      extractedText: extractedText || undefined,
    };
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(doc).returning();
    return document;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async searchDocuments(userId: string, query: string): Promise<Document[]> {
    return db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.userId, userId),
          ilike(documents.originalName, `%${query}%`)
        )
      )
      .orderBy(desc(documents.uploadDate));
  }

  // Page operations
  async createPage(page: InsertPage): Promise<Page> {
    const [newPage] = await db.insert(pages).values(page).returning();
    return newPage;
  }

  async getPages(documentId: string): Promise<Page[]> {
    return db
      .select()
      .from(pages)
      .where(eq(pages.documentId, documentId))
      .orderBy(pages.pageNumber);
  }

  // Extraction operations
  async createExtraction(extraction: InsertExtraction): Promise<Extraction> {
    const [newExtraction] = await db.insert(extractions).values(extraction).returning();
    return newExtraction;
  }

  async getExtractions(documentId: string): Promise<Extraction[]> {
    return db.select().from(extractions).where(eq(extractions.documentId, documentId));
  }

  // Chat operations
  async getChatMessages(documentId: string): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.documentId, documentId))
      .orderBy(chatMessages.createdAt);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  // Dashboard stats
  async getDashboardStats(userId: string): Promise<{
    totalDocuments: number;
    processingCount: number;
    completedCount: number;
    errorCount: number;
    recentDocuments: Document[];
  }> {
    const allDocs = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId));

    const recentDocs = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.uploadDate))
      .limit(5);

    return {
      totalDocuments: allDocs.length,
      processingCount: allDocs.filter((d) => d.status === "processing").length,
      completedCount: allDocs.filter((d) => d.status === "completed").length,
      errorCount: allDocs.filter((d) => d.status === "error").length,
      recentDocuments: recentDocs,
    };
  }

  // Reports data
  async getReportsData(userId: string): Promise<{
    totalDocuments: number;
    totalPages: number;
    totalWords: number;
    documentsOverTime: { date: string; count: number }[];
    entityDistribution: { name: string; value: number }[];
    topKeywords: { keyword: string; count: number }[];
    statusDistribution: { status: string; count: number }[];
  }> {
    const allDocs = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId));

    // Get all pages for this user's documents
    const docIds = allDocs.map((d) => d.id);
    let totalPages = 0;
    let totalWords = 0;

    if (docIds.length > 0) {
      const allPages = await db.select().from(pages);
      const userPages = allPages.filter((p) => docIds.includes(p.documentId));
      totalPages = userPages.length;

      // Count words from extracted text
      userPages.forEach((p) => {
        if (p.extractedText) {
          totalWords += p.extractedText.split(/\s+/).filter(Boolean).length;
        }
      });
    }

    // Documents over time (last 7 days)
    const now = new Date();
    const documentsOverTime: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const count = allDocs.filter((d) => {
        const docDate = d.uploadDate ? new Date(d.uploadDate).toISOString().split("T")[0] : null;
        return docDate === dateStr;
      }).length;
      documentsOverTime.push({ date: dateStr.slice(5), count });
    }

    // Entity distribution (aggregate from all extractions)
    const entityCounts: Record<string, number> = {
      person: 0,
      organization: 0,
      location: 0,
      date: 0,
      money: 0,
    };

    const keywordCounts: Record<string, number> = {};

    if (docIds.length > 0) {
      const allExtractions = await db.select().from(extractions);
      const userExtractions = allExtractions.filter((e) => docIds.includes(e.documentId));

      userExtractions.forEach((ext) => {
        if (ext.extractionType === "analysis" && ext.data) {
          const data = ext.data as any;
          if (data.entities) {
            data.entities.forEach((entity: any) => {
              if (entity.type in entityCounts) {
                entityCounts[entity.type]++;
              }
            });
          }
          if (data.keywords) {
            data.keywords.forEach((keyword: string) => {
              keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
            });
          }
        }
      });
    }

    const entityDistribution = Object.entries(entityCounts)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));

    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));

    // Status distribution
    const statusCounts: Record<string, number> = {};
    allDocs.forEach((d) => {
      statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    return {
      totalDocuments: allDocs.length,
      totalPages,
      totalWords,
      documentsOverTime,
      entityDistribution,
      topKeywords,
      statusDistribution,
    };
  }
}

export const storage = new DatabaseStorage();
