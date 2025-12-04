import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// Initialize OpenAI only if API key is available
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function generateChatResponse(
  documentContent: string,
  userQuestion: string,
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  if (!openai) {
    throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
  }

  const systemPrompt = `You are an intelligent document assistant. You help users understand and extract information from documents.

The user has uploaded a document with the following content:

---
${documentContent.slice(0, 15000)}
${documentContent.length > 15000 ? "\n[Content truncated...]" : ""}
---

Answer the user's questions based on the document content above. Be accurate, helpful, and cite specific parts of the document when relevant.
If the answer cannot be found in the document, say so clearly.
Keep responses concise but informative.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...chatHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user", content: userQuestion },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages,
    max_completion_tokens: 2048,
  });

  return response.choices[0].message.content || "I couldn't generate a response. Please try again.";
}

export async function generateDocumentSummary(text: string): Promise<string> {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = `Summarize the following document in 2-3 concise paragraphs. Focus on the main points, key information, and important takeaways:

${text.slice(0, 12000)}
${text.length > 12000 ? "\n[Content truncated...]" : ""}

Provide a clear, informative summary in JSON format: { "summary": "your summary here" }`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 1024,
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.summary || "Unable to generate summary.";
  } catch {
    return "Unable to generate summary.";
  }
}

export async function extractKeywords(text: string): Promise<string[]> {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = `Extract 8-12 important keywords or key phrases from this document. Return only the most significant terms that capture the main topics.

${text.slice(0, 8000)}

Return in JSON format: { "keywords": ["keyword1", "keyword2", ...] }`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 256,
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.keywords || [];
  } catch {
    return [];
  }
}

export function isOpenAIConfigured(): boolean {
  return !!openai;
}
