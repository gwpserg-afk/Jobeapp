import { prisma } from "../prisma";

// Notification types the app knows how to render (client localizes the text).
export type NotifType = "follow" | "like" | "comment" | "message" | "welcome";

/**
 * Create a notification for `userId` about an action by `actor`.
 * We store a localizable `type` + the actor's display data in dataJson, plus a
 * plain FR title/body as a fallback. Never throws (notifications are best-effort).
 */
export async function notify(opts: {
  userId: string;
  actorId?: string;
  type: NotifType;
  title: string;
  body: string;
  postId?: string;
}) {
  try {
    if (opts.actorId && opts.actorId === opts.userId) return; // don't notify yourself

    let actor: { id: string; name: string; username: string | null; image: string | null } | null = null;
    if (opts.actorId) {
      actor = await prisma.user.findUnique({
        where: { id: opts.actorId },
        select: { id: true, name: true, username: true, image: true },
      });
    }

    await prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        dataJson: JSON.stringify({
          actorId: actor?.id ?? opts.actorId ?? null,
          actorName: actor?.name ?? null,
          actorUsername: actor?.username ?? null,
          actorImage: actor?.image ?? null,
          postId: opts.postId ?? null,
        }),
      },
    });
  } catch (e) {
    console.error("[notify] failed:", e);
  }
}
