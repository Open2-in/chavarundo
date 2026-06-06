import {
  WasteReportProp,
  CreateWasteReportInputProp,
  UpdateWasteReportInputProp,
  WasteReportStatusProp,
  WasteReportSeverityProp,
} from "@/types";

export type {
  WasteReportProp,
  CreateWasteReportInputProp,
  UpdateWasteReportInputProp,
  WasteReportStatusProp,
  WasteReportSeverityProp,
};

export interface WasteReportStoreProp {
  reports: WasteReportProp[];
  loading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isVoting: boolean;
  error: string | null;
  addRecord: (payload: CreateWasteReportInputProp) => Promise<string>;
  deleteRecord: (id: string) => Promise<void>;
  getRecord: (id: string) => Promise<WasteReportProp | null>;
  editRecord: (id: string, updates: UpdateWasteReportInputProp) => Promise<void>;
  voteRecord: (
    id: string,
    type: 'up' | 'down',
    userId: string
  ) => Promise<void>;
  draft: Partial<WasteReportProp>;
  updateDraft: (updates: Partial<WasteReportProp>) => void;
  clearDraft: () => void;
  initialize: () => () => void;
}


