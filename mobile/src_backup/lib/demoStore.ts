import { create } from "zustand";
import {
  DEMO_JOBS,
  DEMO_CANDIDATES,
  DEMO_APPLICATIONS,
  DEMO_NOTIFICATIONS,
  DEMO_RECRUITER_NOTIFICATIONS,
  DEMO_MESSAGES,
  DEMO_POSTS,
  DEMO_CONNECTIONS,
  type DemoJob,
  type DemoApplication,
  type DemoNotification,
  type DemoConversation,
  type DemoPost,
} from "./demoData";

export type DemoUserMode = "candidate" | "recruiter" | "admin";

interface DemoStore {
  // Demo login state (for demo signup/login flows that bypass real auth)
  isDemoLoggedIn: boolean;
  demoAccountType: "candidate" | "recruiter";
  demoUserName: string;
  demoHeadline: string;
  demoCity: string;
  demoNeighborhood: string;
  demoPhotoUri: string | null;
  demoEmail: string;
  demoCompanyName: string;
  demoCompanyInitials: string;
  demoCompanyColor: string;
  setDemoLoggedIn: (loggedIn: boolean, accountType?: "candidate" | "recruiter", userName?: string) => void;
  setDemoProfile: (data: { headline?: string; city?: string; neighborhood?: string; photoUri?: string; email?: string }) => void;
  setDemoRecruiterProfile: (data: { companyName?: string; companyInitials?: string; companyColor?: string; email?: string }) => void;

  // Mode
  mode: DemoUserMode;
  setMode: (mode: DemoUserMode) => void;

  // Jobs (candidate sees all jobs, recruiter sees their created jobs)
  jobs: typeof DEMO_JOBS;
  recruiterCreatedJobs: typeof DEMO_JOBS; // Jobs created by recruiter
  savedJobIds: Set<string>;
  toggleSaveJob: (jobId: string) => void;
  addJob: (title: string, contractType: string, locationCity: string, locationNeighborhood: string, description: string, requiredSkills: string[]) => void;

  // Applications
  applications: typeof DEMO_APPLICATIONS;
  addApplication: (jobId: string, coverMessage: string) => void;

  // Notifications
  notifications: DemoNotification[];
  recruiterNotifications: DemoNotification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadNotificationsCount: () => number;

  // Messages
  conversations: typeof DEMO_MESSAGES;
  sendMessage: (conversationId: string, text: string) => void;
  markConversationRead: (conversationId: string) => void;
  createOrGetConversation: (candidateId: string, candidateName: string, candidateInitials: string, candidateAvatarColor: string) => string;

  // Persisted sent messages for demo conversations (keyed by partner userId)
  demoSentMessages: Record<string, { id: string; content: string; sentAt: string }[]>;
  addDemoSentMessage: (partnerUserId: string, msg: { id: string; content: string; sentAt: string }) => void;

  // Posts / Feed
  posts: typeof DEMO_POSTS;
  toggleLike: (postId: string) => void;
  toggleRepost: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  addPost: (caption: string, skills: string[], images?: string[], author?: { fullName: string; headline: string; initials: string; id: string }) => void;

  // Connections
  connections: typeof DEMO_CONNECTIONS;
  acceptConnection: (connectionId: string) => void;
  declineConnection: (connectionId: string) => void;
  addConnection: (candidate: typeof DEMO_CANDIDATES[0]) => void;
  hasSentConnectionRequest: (candidateId: string) => boolean;

  // Profile edits (candidate)
  profileEdits: Partial<typeof DEMO_CANDIDATES[0]>;
  updateProfile: (updates: Partial<typeof DEMO_CANDIDATES[0]>) => void;

  // Video introduction
  videoIntroUri: string | null;
  setVideoIntroUri: (uri: string | null) => void;

  // Job video previews (jobId -> videoUri)
  jobVideoUris: Map<string, string>;
  setJobVideoUri: (jobId: string, uri: string | null) => void;
  getJobVideoUri: (jobId: string) => string | null;

  // Settings
  notificationSettings: {
    jobMatches: boolean;
    profileViews: boolean;
    applicationUpdates: boolean;
    connections: boolean;
    messages: boolean;
  };
  toggleNotificationSetting: (key: string) => void;
  visibilitySettings: "public" | "recruiters" | "private";
  setVisibility: (v: "public" | "recruiters" | "private") => void;

  // Reset
  resetDemo: () => void;
}

export const useDemoStore = create<DemoStore>((set, get) => ({
  isDemoLoggedIn: false,
  demoAccountType: "candidate",
  demoUserName: "",
  demoHeadline: "",
  demoCity: "",
  demoNeighborhood: "",
  demoPhotoUri: null,
  demoEmail: "",
  demoCompanyName: "Orange Sénégal",
  demoCompanyInitials: "OS",
  demoCompanyColor: "#FF6600",
  setDemoLoggedIn: (loggedIn, accountType = "candidate", userName = "") => {
    // When logging in, clear all account-specific data to prevent data leakage
    if (loggedIn) {
      // Determine if we're switching account types
      const previousAccountType = get().demoAccountType;
      const isSwitchingAccountType = previousAccountType !== accountType;

      // If switching account types, clear all account-specific data
      if (isSwitchingAccountType) {
        set({
          isDemoLoggedIn: loggedIn,
          demoAccountType: accountType,
          demoUserName: userName,
          // Clear candidate-specific data
          demoHeadline: "",
          demoCity: "",
          demoNeighborhood: "",
          demoPhotoUri: null,
          videoIntroUri: null,
          savedJobIds: new Set(),
          connections: [...DEMO_CONNECTIONS], // Reset to initial state
          profileEdits: {},
          // Clear recruiter-specific data
          demoCompanyName: "Orange Sénégal",
          demoCompanyInitials: "OS",
          demoCompanyColor: "#FF6600",
          recruiterCreatedJobs: [],
          // Reset notifications based on account type
          notifications: accountType === "candidate" ? [...DEMO_NOTIFICATIONS] : [],
          recruiterNotifications: accountType === "recruiter" ? [...DEMO_RECRUITER_NOTIFICATIONS] : [],
          // Clear shared data
          conversations: [...DEMO_MESSAGES],
          applications: [...DEMO_APPLICATIONS],
          posts: [...DEMO_POSTS],
          jobVideoUris: new Map(),
        });
      } else {
        // Same account type, just update login status and name
        set({
          isDemoLoggedIn: loggedIn,
          demoAccountType: accountType,
          demoUserName: userName,
        });
      }
    } else {
      // Logging out - reset everything
      set({
        isDemoLoggedIn: false,
        demoAccountType: "candidate",
        demoUserName: "",
        demoHeadline: "",
        demoCity: "",
        demoNeighborhood: "",
        demoPhotoUri: null,
        demoEmail: "",
        demoCompanyName: "Orange Sénégal",
        demoCompanyInitials: "OS",
        demoCompanyColor: "#FF6600",
        videoIntroUri: null,
        savedJobIds: new Set(),
        recruiterCreatedJobs: [],
        profileEdits: {},
        jobVideoUris: new Map(),
      });
    }
  },
  setDemoProfile: (data) =>
    set({
      ...(data.headline !== undefined ? { demoHeadline: data.headline } : {}),
      ...(data.city !== undefined ? { demoCity: data.city } : {}),
      ...(data.neighborhood !== undefined ? { demoNeighborhood: data.neighborhood } : {}),
      ...(data.photoUri !== undefined ? { demoPhotoUri: data.photoUri ?? null } : {}),
      ...(data.email !== undefined ? { demoEmail: data.email } : {}),
    }),
  setDemoRecruiterProfile: (data) =>
    set({
      ...(data.companyName !== undefined ? { demoCompanyName: data.companyName } : {}),
      ...(data.companyInitials !== undefined ? { demoCompanyInitials: data.companyInitials } : {}),
      ...(data.companyColor !== undefined ? { demoCompanyColor: data.companyColor } : {}),
      ...(data.email !== undefined ? { demoEmail: data.email } : {}),
    }),

  mode: "candidate",
  setMode: (mode) => set({ mode }),

  jobs: DEMO_JOBS,
  recruiterCreatedJobs: [],
  savedJobIds: new Set<string>(),
  toggleSaveJob: (jobId) => {
    const saved = new Set(get().savedJobIds);
    if (saved.has(jobId)) {
      saved.delete(jobId);
    } else {
      saved.add(jobId);
    }
    set({ savedJobIds: saved });
  },
  addJob: (title, contractType, locationCity, locationNeighborhood, description, requiredSkills) => {
    const demoCompanyName = get().demoCompanyName;
    const demoCompanyInitials = get().demoCompanyInitials;
    const demoCompanyColor = get().demoCompanyColor;

    const newJob: DemoJob = {
      id: `job-${Date.now()}`,
      title,
      contractType,
      workMode: "onsite",
      locationCity,
      locationNeighborhood: null,
      latitude: 14.6694,
      longitude: -17.4341,
      salaryMin: 150000,
      salaryMax: null,
      salaryNegotiable: false,
      isUrgent: false,
      isActive: true,
      skills: requiredSkills,
      requiredSkills,
      applicantsCount: 0,
      viewCount: 0,
      description,
      descriptionFr: description,
      descriptionEn: description,
      descriptionZh: description,
      companyId: "company-recruiter",
      company: {
        id: "company-recruiter",
        companyName: demoCompanyName,
        isVerified: false,
        logoInitials: demoCompanyInitials,
        logoColor: demoCompanyColor,
      },
      createdAt: new Date().toISOString(),
      _count: { applications: 0 },
    };
    // Add to recruiterCreatedJobs instead of main jobs list to keep recruiter data isolated
    set({ recruiterCreatedJobs: [newJob, ...get().recruiterCreatedJobs] });
  },

  applications: [...DEMO_APPLICATIONS],
  addApplication: (jobId, coverMessage) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) return;
    const newApp: typeof DEMO_APPLICATIONS[0] = {
      id: `app-${Date.now()}`,
      jobId,
      candidateId: "candidate-1",
      status: "pending",
      appliedAt: new Date().toISOString(),
      coverMessage,
      job,
      candidate: DEMO_CANDIDATES[0],
    };
    set({ applications: [newApp, ...get().applications] });
  },

  notifications: [...DEMO_NOTIFICATIONS],
  recruiterNotifications: [...DEMO_RECRUITER_NOTIFICATIONS],
  markNotificationRead: (id) => {
    set({
      notifications: get().notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    });
  },
  markAllNotificationsRead: () => {
    set({ notifications: get().notifications.map((n) => ({ ...n, isRead: true })) });
  },
  unreadNotificationsCount: () => get().notifications.filter((n) => !n.isRead).length,

  conversations: [...DEMO_MESSAGES],
  sendMessage: (conversationId, text) => {
    set({
      conversations: get().conversations.map((conv) => {
        if (conv.id !== conversationId) return conv;
        const newMsg = {
          id: `msg-${Date.now()}`,
          senderId: "me",
          text,
          time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          date: "Aujourd'hui",
        };
        return {
          ...conv,
          messages: [...conv.messages, newMsg],
          lastMessage: text,
          lastMessageTime: newMsg.time,
        };
      }),
    });
  },
  markConversationRead: (conversationId) => {
    set({
      conversations: get().conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ),
    });
  },
  createOrGetConversation: (candidateId, candidateName, candidateInitials, candidateAvatarColor) => {
    const existingConv = get().conversations.find((c) => c.participant.id === candidateId);
    if (existingConv) {
      return existingConv.id;
    }
    // Create a new conversation
    const newConvId = `conv-${Date.now()}`;
    const newConversation = {
      id: newConvId,
      participant: {
        id: candidateId,
        name: candidateName,
        initials: candidateInitials,
        avatarColor: candidateAvatarColor,
        isCompany: false,
      },
      messages: [],
      lastMessage: "Conversation started",
      lastMessageTime: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      unreadCount: 0,
    };
    set({ conversations: [newConversation, ...get().conversations] });
    return newConvId;
  },

  demoSentMessages: {},
  addDemoSentMessage: (partnerUserId, msg) => {
    const prev = get().demoSentMessages[partnerUserId] ?? [];
    set({ demoSentMessages: { ...get().demoSentMessages, [partnerUserId]: [...prev, msg] } });
  },

  posts: [...DEMO_POSTS],
  toggleLike: (postId) => {
    set({
      posts: get().posts.map((p) => {
        if (p.id !== postId) return p;
        return { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 };
      }),
    });
  },
  toggleRepost: (postId) => {
    set({
      posts: get().posts.map((p) => {
        if (p.id !== postId) return p;
        return { ...p, isReposted: !p.isReposted, reposts: p.isReposted ? p.reposts - 1 : p.reposts + 1 };
      }),
    });
  },
  addComment: (postId, text) => {
    set({
      posts: get().posts.map((p) => {
        if (p.id !== postId) return p;
        const newComment = {
          id: `c-${Date.now()}`,
          author: "Moussa Diallo",
          text,
          time: "À l'instant",
        };
        return { ...p, comments: p.comments + 1, commentsList: [...p.commentsList, newComment] };
      }),
    });
  },
  addPost: (_caption, _skills, _images = [], _author) => {
    // Use provided author or create a minimal valid author object
    const author = _author ? {
      id: _author.id,
      userId: _author.id,
      fullName: _author.fullName,
      headline: _author.headline,
      city: "Dakar",
      neighborhood: "Dakar",
      availabilityStatus: "available",
      initials: _author.initials,
      avatarColor: "#1B2F6E",
      skills: [],
      bio: "",
      phone: "",
      email: "",
    } : DEMO_CANDIDATES[0];

    const newPost = {
      id: `post-${Date.now()}`,
      author,
      caption: _caption,
      captionFr: _caption,
      captionEn: _caption,
      captionZh: _caption,
      images: _images as string[],
      likes: 0,
      comments: 0,
      isLiked: false,
      isReposted: false,
      reposts: 0,
      isPromo: false,
      isCompany: false,
      createdAt: new Date().toISOString(),
      commentsList: [] as Array<{ id: string; author: string; text: string; time: string }>,
    };
    set({ posts: [newPost as unknown as typeof DEMO_POSTS[0], ...get().posts] });
  },

  connections: [...DEMO_CONNECTIONS],
  acceptConnection: (connectionId) => {
    set({
      connections: get().connections.map((c) =>
        c.id === connectionId ? { ...c, status: "accepted" } : c
      ),
    });
  },
  declineConnection: (connectionId) => {
    set({ connections: get().connections.filter((c) => c.id !== connectionId) });
  },
  addConnection: (candidate) => {
    const newConnection = {
      id: `conn-${Date.now()}`,
      candidate,
      status: "pending_sent" as const,
    };
    set({ connections: [...get().connections, newConnection] });
  },
  hasSentConnectionRequest: (candidateId) => {
    return get().connections.some((c) => c.candidate.id === candidateId);
  },

  profileEdits: {},
  updateProfile: (updates) => {
    set({ profileEdits: { ...get().profileEdits, ...updates } });
  },

  videoIntroUri: null,
  setVideoIntroUri: (uri) => set({ videoIntroUri: uri }),

  jobVideoUris: new Map<string, string>(),
  setJobVideoUri: (jobId, uri) => {
    const newMap = new Map(get().jobVideoUris);
    if (uri) {
      newMap.set(jobId, uri);
    } else {
      newMap.delete(jobId);
    }
    set({ jobVideoUris: newMap });
  },
  getJobVideoUri: (jobId) => get().jobVideoUris.get(jobId) ?? null,

  notificationSettings: {
    jobMatches: true,
    profileViews: true,
    applicationUpdates: true,
    connections: true,
    messages: true,
  },
  toggleNotificationSetting: (key) => {
    const current = get().notificationSettings;
    set({ notificationSettings: { ...current, [key]: !current[key as keyof typeof current] } });
  },
  visibilitySettings: "public",
  setVisibility: (v) => set({ visibilitySettings: v }),

  resetDemo: () => {
    set({
      applications: [...DEMO_APPLICATIONS],
      notifications: [...DEMO_NOTIFICATIONS],
      recruiterNotifications: [...DEMO_RECRUITER_NOTIFICATIONS],
      conversations: [...DEMO_MESSAGES],
      posts: [...DEMO_POSTS],
      connections: [...DEMO_CONNECTIONS],
      savedJobIds: new Set(),
      recruiterCreatedJobs: [],
      profileEdits: {},
      mode: "candidate",
      isDemoLoggedIn: false,
      demoUserName: "",
      demoHeadline: "",
      demoCity: "",
      demoNeighborhood: "",
      demoPhotoUri: null,
      demoEmail: "",
      demoCompanyName: "Orange Sénégal",
      demoCompanyInitials: "OS",
      demoCompanyColor: "#FF6600",
      videoIntroUri: null,
      jobVideoUris: new Map(),
    });
  },
}));
