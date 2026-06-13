export interface UserMe {
  id: string;
  name: string;
  email: string;
  image: string | null;
  accountType: string;
  phone: string | null;
  isVerified: boolean;
  isGoldVerified?: boolean;
  isPremium: boolean;
  languagePreference: string;
  isActive: boolean;
  hasProfile: boolean;
  credits?: number;
}

export interface CandidateProfile {
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
  profileVisibility: string;
  profileCompletePct: number;
  skills: CandidateSkill[];
  experiences: CandidateExperience[];
  education: CandidateEducation[];
  languages: CandidateLanguage[];
  portfolio: PortfolioItem[];
  recommendations: Recommendation[];
  cvUrl: string | null;
  cvFileId: string | null;
  isVerified?: boolean;
  isGoldVerified?: boolean;
  isPremium?: boolean;
}

export interface CandidateSkill {
  id: string;
  skillName: string;
  skillLevel: string;
  endorsementCount: number;
  isVerified: boolean;
}

export interface CandidateExperience {
  id: string;
  companyName: string;
  roleTitle: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  isInformal: boolean;
  description: string | null;
}

export interface CandidateEducation {
  id: string;
  institutionName: string;
  degreeLevel: string;
  fieldOfStudy: string | null;
  startYear: string | null;
  endYear: string | null;
  isCurrent: boolean;
}

export interface CandidateLanguage {
  id: string;
  language: string;
  level: string;
}

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  caption: string | null;
}

export interface Recommendation {
  id: string;
  recommenderName: string;
  recommenderCompany: string | null;
  recommenderRelationship: string | null;
  testimonialText: string;
  isApproved: boolean;
}

export interface Company {
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
}

export interface JobListing {
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
  isBoosted: boolean;
  isUrgent: boolean;
  isActive: boolean;
  viewCount: number;
  requiredSkills: JobRequiredSkill[];
  company: {
    id: string;
    companyName: string;
    logoUrl: string | null;
    sector: string | null;
    isVerified: boolean;
  };
  createdAt: string;
  _count?: { applications: number };
}

export interface JobRequiredSkill {
  id: string;
  skillName: string;
  isRequired: boolean;
}

export interface Application {
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
    contractType?: string;
    locationCity?: string;
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

export interface Conversation {
  userId: string;
  userName: string;
  userImage: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  sentAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  dataJson: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface SavedJob {
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

export type Promotion = {
  id: string;
  userId: string;
  businessName: string;
  title: string;
  content: string;
  imageUrl: string | null;
  websiteUrl: string | null;
  durationDays: number;
  creditCost: number;
  expiresAt: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
    isVerified?: boolean;
    isGoldVerified?: boolean;
    isPremium?: boolean;
  };
};
