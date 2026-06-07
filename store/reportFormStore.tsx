import { create } from "zustand";
import { useShallow } from "zustand/shallow";
import { useWasteReports } from "./firebase";

import { ActiveReportFormType } from "@/types";

interface ReportFormStoreProp {
  activeReportForm: ActiveReportFormType;
  setActiveReportForm: (form: ActiveReportFormType) => void;
  reportImage: string | null;
  setReportImage: (image: string | null) => void;
  originalExifCoords: { lat: number; lng: number } | null;
  adjustedCoords: { lat: number; lng: number } | null;
  setAdjustedCoords: (coords: { lat: number; lng: number } | null) => void;
  isAIReviewing: boolean;
  setIsAIReviewing: (val: boolean) => void;
  reviewPhase: 'road' | 'ai';
  aiReviewResult: { success: boolean; verified: boolean; reasoning: string; phase?: 'road' | 'ai' } | null;
  setAiReviewResult: (result: { success: boolean; verified: boolean; reasoning: string; phase?: 'road' | 'ai' } | null) => void;
  exifError: string | null;
  setExifError: (error: string | null) => void;
  pendingReportPayload: any | null;
  cancelReporting: () => void;
  resetReviewState: () => void;
  setCoords: (coords: { lat: number; lng: number } | null) => void;
  startAIReview: (payload: any) => void;
}

export const useReportForm = create<ReportFormStoreProp>((set) => ({
  activeReportForm: null,
  setActiveReportForm: (form) => set({ activeReportForm: form }),
  reportImage: null,
  setReportImage: (image) => set({ reportImage: image }),
  originalExifCoords: null,
  adjustedCoords: null,
  setAdjustedCoords: (coords) => set({ adjustedCoords: coords }),
  isAIReviewing: false,
  setIsAIReviewing: (val) => set({ isAIReviewing: val }),
  reviewPhase: 'road',
  aiReviewResult: null,
  setAiReviewResult: (result) => set({ aiReviewResult: result }),
  exifError: null,
  setExifError: (error) => set({ exifError: error }),
  pendingReportPayload: null,
  cancelReporting: () => {
    set({
      activeReportForm: null,
      reportImage: null,
      originalExifCoords: null,
      adjustedCoords: null,
      isAIReviewing: false,
      reviewPhase: 'road',
      aiReviewResult: null,
      exifError: null,
      pendingReportPayload: null,
    });
    useWasteReports.getState().clearDraft();
  },
  resetReviewState: () => set({
    aiReviewResult: null,
    isAIReviewing: false,
    reportImage: null,
    originalExifCoords: null,
    adjustedCoords: null,
    pendingReportPayload: null,
  }),
  setCoords: (coords) => set({
    originalExifCoords: coords,
    adjustedCoords: coords,
  }),
  startAIReview: (payload) => set({
    pendingReportPayload: payload,
    isAIReviewing: true,
    activeReportForm: 'aiReview',
    reviewPhase: 'ai',
  }),
}));

export function useAIReview() {
  return useReportForm(
    useShallow((s) => ({
      image: s.reportImage,
      isReviewing: s.isAIReviewing,
      reviewPhase: s.reviewPhase,
      result: s.aiReviewResult,
      pendingReportPayload: s.pendingReportPayload,
      adjustedCoords: s.adjustedCoords,
      setActiveReportForm: s.setActiveReportForm,
      resetReviewState: s.resetReviewState,
      cancelReporting: s.cancelReporting,
    }))
  );
}

export function useReportWizard() {
  return useReportForm(
    useShallow((s) => ({
      activeReportForm: s.activeReportForm,
      setActiveReportForm: s.setActiveReportForm,
      reportImage: s.reportImage,
      setReportImage: s.setReportImage,
      originalExifCoords: s.originalExifCoords,
      adjustedCoords: s.adjustedCoords,
      setAdjustedCoords: s.setAdjustedCoords,
      isAIReviewing: s.isAIReviewing,
      setIsAIReviewing: s.setIsAIReviewing,
      reviewPhase: s.reviewPhase,
      aiReviewResult: s.aiReviewResult,
      setAiReviewResult: s.setAiReviewResult,
      exifError: s.exifError,
      setExifError: s.setExifError,
      pendingReportPayload: s.pendingReportPayload,
      cancelReporting: s.cancelReporting,
      resetReviewState: s.resetReviewState,
      setCoords: s.setCoords,
      startAIReview: s.startAIReview,
    }))
  );
}
