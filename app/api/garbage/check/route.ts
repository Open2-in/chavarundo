import { NextRequest, NextResponse } from "next/server";
import { getReport, updateReportStatus } from "@/lib/firebase-server";
import { getAIServiceToken } from "@/lib/open2-auth";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { reportId, imageUrl } = await req.json().catch(() => ({}));
    if (!reportId && !imageUrl) {
      return NextResponse.json({ error: "Missing reportId or imageUrl" }, { status: 400 });
    }

    let imageToVerify = imageUrl;

    if (reportId) {
      // 2. Fetch the report from Firestore
      const report = await getReport(reportId);
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      imageToVerify = report.imageUrl;
    }

    if (!imageToVerify) {
      if (reportId) {
        await updateReportStatus(reportId, "pending");
      }
      return NextResponse.json({
        success: true,
        verified: false,
        reasoning: "No photo evidence provided for AI verification.",
      });
    }

    // 3. Decode base64 image data to binary
    const matches = imageToVerify.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (!matches) {
      if (reportId) {
        await updateReportStatus(reportId, "pending");
      }
      return NextResponse.json({ error: "Invalid image format in request/database" }, { status: 400 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const fileBlob = new Blob([bytes], { type: mimeType });

    // 4. Check if Mock AI Service is enabled
    if (process.env.MOCK_AI_SERVICE === "true") {
      console.log(`[Mock AI] Bypassing real AI check`);
      if (reportId) {
        await updateReportStatus(reportId, "verified");
      }
      return NextResponse.json({
        success: true,
        verified: true,
        reasoning: "[Mock AI] Garbage detected in the photo (simulated check).",
      });
    }

    // 5. Authenticate and retrieve access token for the AI service
    let aiToken: string;
    try {
      aiToken = await getAIServiceToken();
    } catch (e: any) {
      console.error("AI service authentication failed:", e);
      if (reportId) {
        await updateReportStatus(reportId, "pending");
      }
      return NextResponse.json({
        success: true,
        verified: false,
        reasoning: `AI authentication failed: ${e.message || "Service offline"}. Status set to pending review.`,
      });
    }

    // 6. Build multipart/form-data payload
    const formData = new FormData();
    formData.append("image", fileBlob, "report_image.jpg");

    // 7. Call the AI service garbage detection endpoint
    const aiServiceUrl = (process.env.AI_SERVICE_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");
    let aiRes: Response;
    try {
      aiRes = await fetch(`${aiServiceUrl}/garbage/check`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiToken}`,
        },
        body: formData,
      });

      // If the response is 401 Unauthorized, the cached token might have expired.
      // Force refresh the token and retry the request once.
      if (aiRes.status === 401) {
        console.warn("AI service returned 401 Unauthorized. Retrying with a refreshed token...");
        try {
          aiToken = await getAIServiceToken(true);
          aiRes = await fetch(`${aiServiceUrl}/garbage/check`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${aiToken}`,
            },
            body: formData,
          });
        } catch (retryErr: any) {
          console.error("Retry AI service authentication failed:", retryErr);
        }
      }
    } catch (e: any) {
      console.error("AI service connection failed:", e);
      if (reportId) {
        await updateReportStatus(reportId, "pending");
      }
      return NextResponse.json({
        success: true,
        verified: false,
        reasoning: `AI service is offline or unreachable: ${e.message || "Connection refused"}. Status set to pending review.`,
      });
    }

    if (!aiRes.ok) {
      const errDetail = await aiRes.text().catch(() => "");
      console.error(`AI service call failed: ${aiRes.status} ${errDetail}`);
      if (reportId) {
        await updateReportStatus(reportId, "pending");
      }
      return NextResponse.json({
        success: true,
        verified: false,
        reasoning: "AI service check failed. Status set to pending review.",
      });
    }

    const aiData = await aiRes.json();
    const containsGarbage = aiData.data?.containsGarbage === true;
    const analysisReasoning = aiData.data?.analysisReasoning || "No explanation provided.";

    // 8. Update status in database based on verification result
    if (reportId) {
      const nextStatus = containsGarbage ? "verified" : "pending";
      await updateReportStatus(reportId, nextStatus);
    }

    return NextResponse.json({
      success: true,
      verified: containsGarbage,
      reasoning: analysisReasoning,
    });
  } catch (e: any) {
    console.error("Garbage check endpoint error:", e);
    // On unexpected errors, ensure status is set to pending rather than leaving it in an undefined state
    try {
      const { reportId } = await req.json().catch(() => ({}));
      if (reportId) {
        await updateReportStatus(reportId, "pending");
      }
    } catch {}
    return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
  }
}
