// USER ROLES
export type UserRole = "farmer" | "buyer" | "officer" | "admin";

// VERIFICATION
export type VerificationStatus = "pending" | "verified" | "rejected" | "expired";

// GIW VALUE CHAINS
export type ListingCategory = 
  | "horticulture" 
  | "livestock" 
  | "poultry" 
  | "edible_oils" 
  | "indigenous_crops";

// LISTINGS
export type ListingStatus = "draft" | "active" | "sold" | "hidden" | "removed";
export type AiGrade = "A" | "B" | "C" | null;

// REVIEWS & MODERATION
export type ReviewModerationState = "auto_published" | "held" | "approved" | "removed";
export type ReviewHoldReason = 
  | "flagged_keyword" 
  | "new_buyer" 
  | "low_star_short" 
  | "rate_limit" 
  | null;

// TRANSACTIONS
export type TransactionStatus = "initiated" | "farmer_confirmed" | "buyer_confirmed" | "completed" | "disputed";

// FIRESTORE DOCUMENT INTERFACES
export interface UserDocument {
  id: string;
  role: UserRole;
  phone: string;
  fullName: string;
  county: string;
  ward: string;
  termsAcceptedAt: Date;
  termsVersion: string;
  status: "active" | "suspended" | "banned";
  createdAt: Date;
}

export interface FarmerDocument {
  userId: string;
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  ratingAvg: number;
  ratingCount: number;
  reviewCountPending: number;
}

export interface ListingDocument {
  id: string;
  farmerId: string;
  category: ListingCategory;
  title: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  county: string;
  ward: string;
  photoUrls: string[];
  aiGrade: AiGrade;
  aiGradeConfidence?: number;
  aiGradeReason?: string;
  status: ListingStatus;
  createdAt: Date;
}