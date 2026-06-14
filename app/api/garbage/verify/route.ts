import { NextRequest, NextResponse } from "next/server";
import { getReport } from "@/lib/firebase-server";
import { getAIServiceToken } from "@/lib/open2-auth";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { reportId, afterImageUrl } = await req.json().catch(() => ({}));
    if (!reportId || !afterImageUrl) {
      return NextResponse.json({ error: "Missing reportId or afterImageUrl" }, { status: 400 });
    }

    // 1. Fetch the original report from Firestore
    const report = await getReport(reportId);
    if (!report || !report.imageUrl) {
      return NextResponse.json({ error: "Report not found or has no photo" }, { status: 404 });
    }
    const beforeImageUrl = report.imageUrl;

    // 2. Helper to decode base64 image data to binary
    const decodeBase64Image = (imageUrl: string) => {
      const matches = imageUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
      if (!matches) {
        throw new Error("Invalid image format. Expected base64 data URL.");
      }
      const mimeType = matches[1];
      const base64Data = matches[2];
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([bytes], { type: mimeType });
    };

    let beforeBlob: Blob;
    let afterBlob: Blob;
    try {
      beforeBlob = decodeBase64Image(beforeImageUrl);
      afterBlob = decodeBase64Image(afterImageUrl);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // 3. Check if Mock AI Service is enabled
    if (process.env.MOCK_AI_SERVICE === "true") {
      console.log(`[Mock AI] Bypassing real AI verify`);
      return NextResponse.json({
        success: true,
        data: {
          sameLocation: true,
          beforeContainsGarbage: true,
          afterContainsGarbage: false,
          afterCleaned: true,
          cleanupPercentage: 100,
          verificationReasoning: "[Mock AI] Area successfully verified as clean.",
        }
      });
    }

    // 4. Authenticate and retrieve access token for the AI service
    let aiToken: string;
    try {
      aiToken = await getAIServiceToken();
    } catch (e: any) {
      console.error("AI service authentication failed:", e);
      return NextResponse.json({
        success: false,
        error: `AI authentication failed: ${e.message || "Service offline"}`,
      }, { status: 502 });
    }

    // 5. Build multipart/form-data payload
    const formData = new FormData();
    formData.append("beforeImage", beforeBlob, "before.jpg");
    formData.append("afterImage", afterBlob, "after.jpg");

    // 6. Call the AI service garbage verify endpoint
    const aiServiceUrl = (process.env.AI_SERVICE_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");
    let aiRes: Response;
    try {
      aiRes = await fetch(`${aiServiceUrl}/garbage/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiToken}`,
        },
        body: formData,
      });

      // If the response is 401 Unauthorized, retry with a refreshed token.
      if (aiRes.status === 401) {
        console.warn("AI service returned 401 Unauthorized. Retrying with a refreshed token...");
        try {
          aiToken = await getAIServiceToken(true);
          aiRes = await fetch(`${aiServiceUrl}/garbage/verify`, {
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
      return NextResponse.json({
        success: false,
        error: `AI service is offline or unreachable: ${e.message || "Connection refused"}`,
      }, { status: 502 });
    }

    if (!aiRes.ok) {
      const errDetail = await aiRes.text().catch(() => "");
      console.error(`AI service call failed: ${aiRes.status} ${errDetail}`);
      return NextResponse.json({
        success: false,
        error: "AI service check failed.",
      }, { status: aiRes.status });
    }

    const aiData = await aiRes.json();
    
    return NextResponse.json({
      success: true,
      data: aiData.data,
    });
  } catch (e: any) {
    console.error("Garbage verify endpoint error:", e);
    return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
  }
}
