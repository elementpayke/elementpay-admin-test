import { NextRequest, NextResponse } from "next/server";
import { ELEMENTPAY_CONFIG, VALIDATION } from "@/lib/elementpay-config";

/**
 * Server-side API route for getting ElementPay order details
 * This keeps the API key secure on the server side
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Get environment from query params (user can toggle between sandbox/live)
    // Fallback to 'sandbox' as default for safety
    const { searchParams } = new URL(request.url);
    const environment = searchParams.get("environment") || "sandbox";
    const isSandbox = environment === "sandbox";

    // Get API key from server-side environment variables
    const apiKey = isSandbox
      ? process.env.NEXT_PRIVATE_ELEMENTPAY_API_KEY
      : process.env.ELEMENTPAY_API_KEY_LIVE;

    if (!apiKey) {
      console.error("❌ [API-ROUTE] No API key configured on server!");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Get base URL
    const baseUrl = isSandbox
      ? process.env.NEXT_PRIVATE_ELEMENTPAY_SANDBOX_BASE ||
        "https://sandbox.elementpay.net/api/v1"
      : process.env.NEXT_PRIVATE_ELEMENTPAY_LIVE_BASE ||
        "https://api.elementpay.net/api/v1";

    console.log("🔄 [API-ROUTE] Fetching order:", {
      orderId,
      hasApiKey: !!apiKey,
      baseUrl,
      environment,
    });

    // Call ElementPay API
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      VALIDATION.API_TIMEOUT
    );

    const response = await fetch(`${baseUrl}/orders/${orderId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-key": apiKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ [API-ROUTE] ElementPay API error:", data);
      return NextResponse.json(
        { error: data.message || "Failed to fetch order" },
        { status: response.status }
      );
    }

    console.log("✅ [API-ROUTE] Order fetched successfully");
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ [API-ROUTE] Error fetching order:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timeout" }, { status: 408 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
