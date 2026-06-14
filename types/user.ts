export interface UserStats {
  totalReports: number;
  totalUpvotes: number;
  totalDownvotes: number;
  netVotes: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  rank: number;
  totalContributors: number;
  firstReportDate: Date | null;
  latestReportDate: Date | null;
  topLocation: string;
  openReports?: number;
  completedReports?: number;
}

/** A user whose profile is being viewed (used when it isn't the logged-in user). */
export interface ProfileSubject {
  uid: string;
  name: string;
  photoURL?: string;
}

export type PanelView = "profile" | "contributions";
