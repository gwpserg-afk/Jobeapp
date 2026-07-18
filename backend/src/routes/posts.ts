import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { Variables } from "../types";
import { containsProfanity, getProfanityError, moderateAI } from "../utils/profanityFilter";

const router = new Hono<{ Variables: Variables }>();

async function enrichPost(post: { id: string; [key: string]: unknown }, userId: string) {
  const [likeCount, commentCount, repostCount, userLike, userRepost] = await Promise.all([
    prisma.postLike.count({ where: { postId: post.id } }),
    prisma.postComment.count({ where: { postId: post.id } }),
    prisma.postRepost.count({ where: { postId: post.id } }),
    prisma.postLike.findUnique({ where: { userId_postId: { userId, postId: post.id } } }),
    prisma.postRepost.findUnique({ where: { userId_postId: { userId, postId: post.id } } }),
  ]);
  return {
    ...post,
    likeCount,
    commentCount,
    repostCount,
    isLikedByMe: !!userLike,
    isRepostedByMe: !!userRepost,
  };
}

// GET /api/posts/feed - Get all users' posts (public feed, paginated)
router.get("/feed", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const pageStr = c.req.query("page") ?? "1";
  const limitStr = c.req.query("limit") ?? "20";
  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const limit = Math.min(50, parseInt(limitStr, 10) || 20);

  // Hide posts from users I've blocked (and who blocked me).
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
    select: { blockerId: true, blockedId: true },
  });
  const excludeIds = new Set<string>();
  blocks.forEach((b) => { excludeIds.add(b.blockerId === user.id ? b.blockedId : b.blockerId); });

  const posts = await prisma.post.findMany({
    where: { isHidden: false, userId: { notIn: Array.from(excludeIds) } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * limit,
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          accountType: true,
          isVerified: true,
          isGoldVerified: true,
          isPremium: true,
        },
      },
    },
  });

  const enriched = await Promise.all(posts.map((post) => enrichPost(post, user.id)));

  return c.json({ data: { posts: enriched } });
});

// GET /api/posts/reposts - Get posts the current user has reposted
router.get("/reposts", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const reposts = await prisma.postRepost.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      post: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              accountType: true,
              isVerified: true,
              isGoldVerified: true,
              isPremium: true,
            },
          },
        },
      },
    },
  });

  const enriched = await Promise.all(
    reposts.map(async (r) => {
      const post = r.post;
      const enrichedPost = await enrichPost(post, user.id);
      return enrichedPost;
    })
  );

  return c.json({ data: enriched });
});

// GET /api/posts - Get current user's own posts
router.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  const enriched = await Promise.all(posts.map((post) => enrichPost(post, user.id)));

  return c.json({ data: enriched });
});

// GET /api/posts/user/:userId - Get any user's posts by userId
router.get("/user/:userId", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const targetUserId = c.req.param("userId");

  const posts = await prisma.post.findMany({
    where: { userId: targetUserId, isHidden: false },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  const enriched = await Promise.all(posts.map((post) => enrichPost(post, user.id)));

  return c.json({ data: enriched });
});

// POST /api/posts - Create a post
router.post(
  "/",
  zValidator(
    "json",
    z.object({
      content: z.string().min(1),
      imageUrl: z.string().nullable().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }

    const data = c.req.valid("json");

    if (containsProfanity(data.content)) {
      return c.json({ error: { message: getProfanityError(), code: "PROFANITY" } }, 422);
    }
    // AI moderation for text + image (no-op unless OPENAI_API_KEY is set on host)
    if (await moderateAI({ text: data.content, imageUrl: data.imageUrl ?? undefined })) {
      return c.json({ error: { message: getProfanityError(), code: "MODERATION" } }, 422);
    }

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        content: data.content,
        imageUrl: data.imageUrl ?? null,
      },
    });

    return c.json({ data: post }, 201);
  }
);

// GET /api/posts/my-comments - Get distinct posts the current user has commented on
router.get("/my-comments", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  // Find all distinct postIds this user has commented on
  const commentedPostIds = await prisma.postComment.findMany({
    where: { userId: user.id },
    select: { postId: true },
    distinct: ["postId"],
    orderBy: { createdAt: "desc" },
  });

  const postIds = commentedPostIds.map((c) => c.postId);

  if (postIds.length === 0) {
    return c.json({ data: [] });
  }

  const posts = await prisma.post.findMany({
    where: { id: { in: postIds }, isHidden: false },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          accountType: true,
          isVerified: true,
          isGoldVerified: true,
          isPremium: true,
        },
      },
    },
  });

  // Preserve the ordering by most-recent-comment first
  const postMap = new Map(posts.map((p) => [p.id, p]));
  const ordered = postIds.map((id) => postMap.get(id)).filter(Boolean) as typeof posts;

  const enriched = await Promise.all(ordered.map((post) => enrichPost(post, user.id)));

  return c.json({ data: enriched });
});

// GET /api/posts/:id - Get a single post by id, enriched, with comments
router.get("/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const postId = c.req.param("id");

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          accountType: true,
          isVerified: true,
          isGoldVerified: true,
          isPremium: true,
        },
      },
    },
  });

  if (!post) {
    return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
  }

  const [enriched, rawComments] = await Promise.all([
    enrichPost(post, user.id),
    prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true, username: true, image: true, accountType: true, isVerified: true, isGoldVerified: true, isPremium: true },
        },
      },
    }),
  ]);

  const comments = rawComments.map(({ user: author, ...rest }) => ({ ...rest, author }));

  return c.json({ data: { ...enriched, comments } });
});

// PATCH /api/posts/:id/pin - Toggle isPinned on a post
router.patch("/:id/pin", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const postId = c.req.param("id");

  const existing = await prisma.post.findUnique({ where: { id: postId } });
  if (!existing) {
    return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
  }

  if (existing.userId !== user.id) {
    return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
  }

  const post = await prisma.post.update({
    where: { id: postId },
    data: { isPinned: !existing.isPinned },
  });

  return c.json({ data: post });
});

// POST /api/posts/:id/like - Toggle like on a post
router.post("/:id/like", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const postId = c.req.param("id");

  const existing = await prisma.postLike.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });

  if (existing) {
    await prisma.postLike.delete({ where: { userId_postId: { userId: user.id, postId } } });
  } else {
    await prisma.postLike.create({ data: { userId: user.id, postId } });
  }

  const likeCount = await prisma.postLike.count({ where: { postId } });

  return c.json({ data: { isLiked: !existing, likeCount } });
});

// POST /api/posts/:id/repost - Toggle repost on a post
router.post("/:id/repost", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const postId = c.req.param("id");

  const existing = await prisma.postRepost.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });

  if (existing) {
    await prisma.postRepost.delete({ where: { userId_postId: { userId: user.id, postId } } });
  } else {
    await prisma.postRepost.create({ data: { userId: user.id, postId } });
  }

  const repostCount = await prisma.postRepost.count({ where: { postId } });

  return c.json({ data: { isReposted: !existing, repostCount } });
});

// GET /api/posts/:id/comments - Get all comments for a post
router.get("/:id/comments", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const postId = c.req.param("id");

  const comments = await prisma.postComment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, image: true, accountType: true, isVerified: true, isGoldVerified: true, isPremium: true } },
    },
  });

  const shaped = comments.map(({ user: author, ...rest }) => ({ ...rest, author }));

  return c.json({ data: shaped });
});

// POST /api/posts/:id/comments - Create a comment on a post
router.post(
  "/:id/comments",
  zValidator("json", z.object({ content: z.string().min(1) })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }

    const postId = c.req.param("id");
    const { content } = c.req.valid("json");

    if (containsProfanity(content)) {
      return c.json({ error: { message: getProfanityError(), code: "PROFANITY" } }, 422);
    }

    const comment = await prisma.postComment.create({
      data: { userId: user.id, postId, content },
      include: {
        user: { select: { id: true, name: true, image: true, accountType: true, isVerified: true, isGoldVerified: true, isPremium: true } },
      },
    });

    const { user: author, ...rest } = comment;

    return c.json({ data: { ...rest, author } }, 201);
  }
);

// DELETE /api/posts/comments/:commentId - Delete a comment
router.delete("/comments/:commentId", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const commentId = c.req.param("commentId");

  const existing = await prisma.postComment.findUnique({ where: { id: commentId } });
  if (!existing) {
    return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
  }

  if (existing.userId !== user.id) {
    return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
  }

  await prisma.postComment.delete({ where: { id: commentId } });

  return new Response(null, { status: 204 });
});

// DELETE /api/posts/:id - Delete a post
router.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const postId = c.req.param("id");

  const existing = await prisma.post.findUnique({ where: { id: postId } });
  if (!existing) {
    return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
  }

  if (existing.userId !== user.id) {
    return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
  }

  await prisma.post.delete({ where: { id: postId } });

  return new Response(null, { status: 204 });
});

export { router as postsRouter };
