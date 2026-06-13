import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import OpenAI from "openai";
import { env } from "../env";

const chatRouter = new Hono();

// System prompt for Jobé Assistant
const SYSTEM_PROMPT = `You are Jobé Assistant, a helpful support bot for the Jobé job marketplace app serving Senegal and francophone West Africa. Answer user questions about how to use the app — creating profiles, applying to jobs, posting listings, managing applications, messaging, settings, and account issues. Be concise, friendly, and bilingual — respond in the same language the user writes in (French or English). If you don't know the answer, direct them to support@jobe.sn.`;

// Message schema for conversation history
const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

// Chat request schema
const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1),
});

// Response type for type safety
type ChatResponse = {
  data: {
    message: string;
  };
};

type ChatErrorResponse = {
  error: {
    message: string;
    code: string;
  };
};

chatRouter.post(
  "/",
  zValidator("json", chatRequestSchema),
  async (c) => {
    const { messages } = c.req.valid("json");

    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      return c.json<ChatErrorResponse>(
        { error: { message: "OpenAI API key not configured", code: "API_KEY_MISSING" } },
        500
      );
    }

    try {
      const openai = new OpenAI({ apiKey });

      // Build messages array with system prompt
      const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: chatMessages,
      });

      const assistantMessage = response.choices[0]?.message?.content ?? "";

      return c.json<ChatResponse>({
        data: {
          message: assistantMessage,
        },
      });
    } catch (err) {
      console.error("Chat API error:", err);

      if (err instanceof OpenAI.APIError) {
        return c.json<ChatErrorResponse>(
          { error: { message: err.message, code: "OPENAI_ERROR" } },
          500
        );
      }

      const errorMessage = err instanceof Error ? err.message : "Failed to get AI response";
      return c.json<ChatErrorResponse>(
        { error: { message: errorMessage, code: "CHAT_ERROR" } },
        500
      );
    }
  }
);

export { chatRouter };
