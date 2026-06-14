import { Timestamp, FieldValue } from "firebase/firestore";

export type WasteReportStatusProp = "reported" | "confirmed" | "fixed" | "pending" | "verified" | "completed";
export type WasteReportSeverityProp = "low" | "medium" | "high";
export type SeverityType = "low" | "medium" | "high";

export interface WasteReportProp {
  id: string; // Document ID in Firestore
  userId: string; // UID of reporting user
  userName?: string; // Name of reporting user
  encodedPath: string; // Google Maps encoded polyline string
  createdAt: Timestamp; // Firestore timestamp when created
  status: WasteReportStatusProp;
  severity: WasteReportSeverityProp;

  // Optional and Location-based enrichment fields
  address?: string;
  district?: string;
  pincode?: string;
  acName?: string;
  acNo?: number;
  pcName?: string;
  lsgd?: string;
  lsgdType?: string;
  lsgdLabel?: string;
  lsgCode?: string;
  wardNo?: string | number;
  wardName?: string;
  secLsgCode?: string;
  highwayTag?: string;
  roadAuthority?: string;
  distanceM?: number;

  // User Profile
  userPhotoURL?: string;

  // Additional details
  notes?: string;
  imageUrl?: string; // Base64 or URL
  afterImageUrl?: string; // Base64 or URL for cleaned verification
  cleanedAt?: Timestamp | Date;

  // Votes
  upvoterIds?: string[];
  downvoterIds?: string[];

  // Single point coordinate (optional coordinates)
  latitude?: number;
  longitude?: number;
}

// Input payload type for creating a report (createdAt can be FieldValue)
export type CreateWasteReportInputProp = Omit<WasteReportProp, "id" | "createdAt"> & {
  createdAt: FieldValue;
};

// Input type for updating a report (where optional fields can also be deleted using deleteField() which is a FieldValue)
export type UpdateWasteReportInputProp = Partial<Omit<WasteReportProp, "id" | "createdAt">> & {
  createdAt?: Timestamp | FieldValue;
  imageUrl?: string | FieldValue;
  notes?: string | FieldValue;
};
