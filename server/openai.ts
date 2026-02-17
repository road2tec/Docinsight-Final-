import OpenAI from "openai";
import { type DocumentAnalysis } from "@shared/mongo-schema";

// Initialize OpenAI client
// The API key is automatically read from process.env.OPENAI_API_KEY
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy-key", // Prevent crash on startup if missing, handled at runtime
});

export function isOpenAIConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
}

export async function analyzeImage(imageBuffer: Buffer): Promise<string> {
    if (!isOpenAIConfigured()) {
        throw new Error("OpenAI API Key is not configured");
    }

    try {
        const base64Image = imageBuffer.toString("base64");

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Please analyze this document image. Extract all readable text content exactly as it appears. If it's a form, marksheet, or bill, try to preserve the structure in your text output (e.g. using tables or key-value pairs).",
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 4096,
        });

        return response.choices[0].message.content || "";
    } catch (error) {
        console.error("OpenAI Image Analysis Error:", error);
        throw new Error("Failed to analyze image with OpenAI");
    }
}

export async function generateChatResponse(
    documentText: string,
    userQuestion: string,
    chatHistory: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
    if (!isOpenAIConfigured()) {
        throw new Error("OpenAI API Key is not configured");
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are a helpful document assistant. Answer the user's question based ONLY on the provided document text. 
          
          Document Content:
          ${documentText.slice(0, 100000)} // logical limit
          
          If the answer is not in the document, say so. Provide citations or quote relevant parts if possible.`,
                },
                ...chatHistory,
                { role: "user", content: userQuestion },
            ],
        });

        return response.choices[0].message.content || "I couldn't generate a response.";
    } catch (error) {
        console.error("OpenAI Chat Error:", error);
        throw new Error("Failed to generate chat response with OpenAI");
    }
}

export async function analyzeStructuredData(text: string): Promise<any> {
    if (!isOpenAIConfigured()) {
        console.warn("OpenAI not configured, skipping structured data analysis");
        return null;
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `Analyze the provided text and identify if it is a specific type of document (e.g., Marksheet, Bill, Invoice, Report, Resume). 
          If it is, extract key structured data in JSON format.
          
          For a Marksheet/Transcript:
          - Extract Student Name, Roll Number, Exam Name.
          - Extract Subjects and Marks/Grades.
          - Identify "Weak Areas" (low marks) and "Strong Areas" (high marks).
          
          For a Bill/Invoice:
          - Extract Vendor Name, Date, Invoice Number.
          - Extract Line Items and Total Amount.
          
          For others:
          - Extract key key-value pairs.
          
          Return ONLY valid JSON.
          Format:
          {
            "documentType": "Marksheet" | "Invoice" | "Unknown",
            "summary": "Brief summary",
            "fields": { ...extracted data... },
            "insights": [ "insight 1", "insight 2" ]
          }`
                },
                {
                    role: "user",
                    content: text.slice(0, 50000) // Limit text length
                }
            ],
            response_format: { type: "json_object" }
        });

        return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
        console.error("OpenAI Structured Data Analysis Error:", error);
        return null;
    }
}
