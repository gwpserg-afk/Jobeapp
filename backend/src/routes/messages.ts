import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const router = new Hono<{ Variables: Variables }>();

// POST /api/messages/translate - Translate a message using AI
router.post(
  "/translate",
  zValidator(
    "json",
    z.object({
      text: z.string().min(1).max(2000),
      targetLang: z.enum(["fr", "en", "zh"]),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }

    const { text, targetLang } = c.req.valid("json");

    const langNames: Record<string, string> = {
      fr: "French",
      en: "English",
      zh: "Chinese (Simplified)",
    };

    try {
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the given text to ${langNames[targetLang]}. Return ONLY the translated text, no explanations, no quotes.`,
          },
          { role: "user", content: text },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      });

      const translated = response.choices[0]?.message?.content?.trim() ?? text;
      return c.json({ data: { translated } });
    } catch {
      // Fallback if AI unavailable
      return c.json({ data: { translated: text } });
    }
  }
);

// GET /api/messages - Get conversations list
router.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  // Get all unique conversation partners
  const sentMessages = await prisma.message.findMany({
    where: { senderId: user.id },
    select: { receiverId: true },
    distinct: ["receiverId"],
  });

  const receivedMessages = await prisma.message.findMany({
    where: { receiverId: user.id },
    select: { senderId: true },
    distinct: ["senderId"],
  });

  const partnerIds = new Set<string>();
  for (const m of sentMessages) partnerIds.add(m.receiverId);
  for (const m of receivedMessages) partnerIds.add(m.senderId);

  const conversations = [];
  for (const partnerId of partnerIds) {
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, name: true, image: true },
    });
    if (!partner) continue;

    const lastMessage = await prisma.message.findFirst({
      where: {
        OR: [
          { senderId: user.id, receiverId: partnerId },
          { senderId: partnerId, receiverId: user.id },
        ],
      },
      orderBy: { sentAt: "desc" },
    });

    const unreadCount = await prisma.message.count({
      where: {
        senderId: partnerId,
        receiverId: user.id,
        isRead: false,
      },
    });

    if (lastMessage) {
      conversations.push({
        userId: partner.id,
        userName: partner.name,
        userImage: partner.image,
        lastMessage: lastMessage.content,
        lastMessageAt: lastMessage.sentAt.toISOString(),
        unreadCount,
      });
    }
  }

  // Sort by last message date
  conversations.sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() -
      new Date(a.lastMessageAt).getTime()
  );

  return c.json({ data: conversations });
});

// GET /api/messages/:userId - Get messages with a specific user
router.get("/:userId", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const partnerId = c.req.param("userId");
  const query = c.req.query();
  const limit = Math.min(100, Math.max(1, parseInt(query["limit"] ?? "50", 10)));
  const before = query["before"]; // cursor for pagination

  const where: Record<string, unknown> = {
    OR: [
      { senderId: user.id, receiverId: partnerId },
      { senderId: partnerId, receiverId: user.id },
    ],
  };

  if (before) {
    where["sentAt"] = { lt: new Date(before) };
  }

  const messages = await prisma.message.findMany({
    where,
    take: limit,
    orderBy: { sentAt: "desc" },
  });

  // Mark messages from partner as read
  await prisma.message.updateMany({
    where: {
      senderId: partnerId,
      receiverId: user.id,
      isRead: false,
    },
    data: { isRead: true },
  });

  return c.json({ data: messages.reverse() });
});

// POST /api/messages - Send a message
router.post(
  "/",
  zValidator(
    "json",
    z.object({
      receiverId: z.string().min(1),
      content: z.string().min(1),
      jobId: z.string().nullable().optional(),
      attachmentUrl: z.string().nullable().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json(
        { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        401
      );
    }

    const { receiverId, content, jobId, attachmentUrl } = c.req.valid("json");

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });
    if (!receiver) {
      return c.json(
        { error: { message: "Recipient not found", code: "NOT_FOUND" } },
        404
      );
    }

    const message = await prisma.message.create({
      data: {
        senderId: user.id,
        receiverId,
        content,
        jobId: jobId ?? null,
        attachmentUrl: attachmentUrl ?? null,
      },
    });

    // Create notification for receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: "message",
        title: "Nouveau message",
        body: `${user.name}: ${content.substring(0, 100)}`,
        dataJson: JSON.stringify({
          messageId: message.id,
          senderId: user.id,
        }),
      },
    });

    return c.json({ data: message }, 201);
  }
);

export { router as messagesRouter };
