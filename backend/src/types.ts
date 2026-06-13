import type { auth } from "./auth";

/** Session user type from Better Auth */
export type AuthUser = typeof auth.$Infer.Session.user;

/** Session type from Better Auth */
export type AuthSession = typeof auth.$Infer.Session.session;

/** Hono context variables for authenticated routes */
export type Variables = {
  user: AuthUser | null;
  session: AuthSession | null;
};

// --- API Response Types ---

export interface CandidateProfileResponse {
  id: string;
  userId: string;
  fullName: string;
  profilePhotoUrl: string | null;
  dateOfBirth: string | null;
  city: string;
  neighborhood: string | null;
  headline: string | null;
  bio: string | null;
  availabilityStatus: string;
  availabilityDate: string | null;
  introVideoUrl: string | null;
  profileVisibility: string;
  profileCompletePct: number;
  isVerified: boolean;
  isGoldVerified: boolean;
  isPremium: boolean;
  skills: CandidateSkillResponse[];
  experiences: CandidateExperienceResponse[];
  education: CandidateEducationResponse[];
  languages: CandidateLanguageResponse[];
  portfolio: PortfolioItemResponse[];
  recommendations: RecommendationResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CandidateSkillResponse {
  id: string;
  skillName: string;
  skillLevel: string;
  endorsementCount: number;
  isVerified: boolean;
}

export interface CandidateExperienceResponse {
  id: string;
  companyName: string;
  roleTitle: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  isInformal: boolean;
  description: string | null;
}

export interface CandidateEducationResponse {
  id: string;
  institutionName: string;
  degreeLevel: string;
  fieldOfStudy: string | null;
  startYear: string | null;
  endYear: string | null;
  isCurrent: boolean;
}

export interface CandidateLanguageResponse {
  id: string;
  language: string;
  level: string;
}

export interface PortfolioItemResponse {
  id: string;
  imageUrl: string;
  caption: string | null;
}

export interface RecommendationResponse {
  id: string;
  recommenderName: string;
  recommenderCompany: string | null;
  recommenderRelationship: string | null;
  testimonialText: string;
  isApproved: boolean;
}

export interface CompanyResponse {
  id: string;
  userId: string;
  companyName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  sector: string | null;
  sizeRange: string | null;
  description: string | null;
  website: string | null;
  isVerified: boolean;
  contactName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyTeamMemberResponse {
  id: string;
  name: string;
  role: string | null;
  photoUrl: string | null;
  order: number;
  isPinned: boolean;
  linkedUserId: string | null;
}

export interface CompanyProfileResponse {
  id: string;
  userId: string;
  companyName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  sector: string | null;
  sizeRange: string | null;
  description: string | null;
  website: string | null;
  location: string | null;
  isVerified: boolean;
  contactName: string | null;
  teamMembers: CompanyTeamMemberResponse[];
  jobListings: Array<{
    id: string;
    title: string;
    contractType: string;
    locationCity: string | null;
    isUrgent: boolean;
  }>;
  _count: {
    jobListings: number;
  };
}

export interface JobListingResponse {
  id: string;
  companyId: string;
  title: string;
  category: string | null;
  contractType: string;
  locationCity: string;
  locationNeighborhood: string | null;
  workMode: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable: boolean;
  description: string;
  requiredExperience: string | null;
  requiredEducation: string | null;
  deadline: string | null;
  maxApplicants: number | null;
  isBoosted: boolean;
  isUrgent: boolean;
  isActive: boolean;
  viewCount: number;
  applicantCount: number | null;
  requiredSkills: JobRequiredSkillResponse[];
  company: {
    id: string;
    companyName: string;
    logoUrl: string | null;
    sector: string | null;
    isVerified: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface JobRequiredSkillResponse {
  id: string;
  skillName: string;
  isRequired: boolean;
}

export interface ApplicationResponse {
  id: string;
  jobId: string;
  candidateId: string;
  coverMessage: string | null;
  status: string;
  recruiterNotes: string | null;
  appliedAt: string;
  updatedAt: string;
  job?: {
    id: string;
    title: string;
    company: {
      companyName: string;
      logoUrl: string | null;
    };
  };
  candidate?: {
    id: string;
    fullName: string;
    profilePhotoUrl: string | null;
    headline: string | null;
  };
}

export interface MessageResponse {
  id: string;
  senderId: string;
  receiverId: string;
  jobId: string | null;
  content: string;
  attachmentUrl: string | null;
  isRead: boolean;
  sentAt: string;
}

export interface ConversationResponse {
  userId: string;
  userName: string;
  userImage: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  body: string;
  dataJson: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface SavedJobResponse {
  id: string;
  jobId: string;
  savedAt: string;
  job: {
    id: string;
    title: string;
    contractType: string;
    locationCity: string;
    company: {
      companyName: string;
      logoUrl: string | null;
    };
  };
}

export interface UserMeResponse {
  id: string;
  name: string;
  email: string;
  image: string | null;
  accountType: string;
  phone: string | null;
  isVerified: boolean;
  isGoldVerified: boolean;
  isPremium: boolean;
  languagePreference: string;
  isActive: boolean;
  hasProfile: boolean;
  profilePhotoUrl: string | null;
  credits: number;
  unreadNotifications?: number;
  unreadMessages?: number;
}

export interface CreditBalanceResponse {
  credits: number;
}

// --- Chat API Types ---

export type ChatLanguage = "fr" | "en";

export interface ChatRequest {
  message: string;
  language: ChatLanguage;
}

export interface ChatResponse {
  response: string;
}

export interface SubscriptionStatusResponse {
  isPremium: boolean;
  premiumExpiresAt: string | null;
}

export interface RechargeResponse {
  credits: number;
}
