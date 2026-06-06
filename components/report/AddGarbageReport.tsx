import React from "react";
import { useReportWizard } from "@/store/reportFormStore";
import PhotoCaptureModal from "./PhotoCaptureModal";
import MapAdjustmentOverlay from "./MapAdjustmentOverlay";
import SubmitReportForm from "./SubmitReportForm";
import AIReviewOverlay from "./AIReviewOverlay";
import SubmitRouteForm from "./SubmitRouteForm";

const REPORT_FORMS: Record<string, React.ComponentType> = {
  photoCapture: PhotoCaptureModal,
  locationAdjust: MapAdjustmentOverlay,
  detailsForm: SubmitReportForm,
  aiReview: AIReviewOverlay,
  routeForm: SubmitRouteForm,
};

export default function AddGarbageReport() {
  const { activeReportForm } = useReportWizard();

  if (!activeReportForm || !REPORT_FORMS[activeReportForm]) return null;

  const FormComponent = REPORT_FORMS[activeReportForm];
  return <FormComponent />;
}
