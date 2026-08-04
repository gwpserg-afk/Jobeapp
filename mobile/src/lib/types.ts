// Shared API types. Mirrors the enriched shapes returned by backend/src/routes/*.

export interface PostUser {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  accountType: string | null;
  isVerified: boolean;
  isGoldVerified: boolean;
  isPremium: boolean;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  imageUrl: string | null;
  isPinned: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  user: PostUser;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  isLikedByMe: boolean;
  isRepostedByMe: boolean;
}

// GET /api/posts/feed unwraps (via api client) to { posts: Post[] }
export interface FeedResponse {
  posts: Post[];
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    accountType: string | null;
    isVerified: boolean;
    isGoldVerified: boolean;
  };
}

export interface PostDetail extends Post {
  comments: Comment[];
}

export interface FollowInfo {
  followers: number;
  following: number;
  isFollowing: boolean;
}

// GET /api/messages
export interface Conversation {
  userId: string;
  userName: string;
  userImage: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

// GET /api/messages/:userId  and  POST /api/messages
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachmentUrl: string | null;
  isRead: boolean;
  sentAt: string;
}
