import { NextRequest, NextResponse } from "next/server";
import { ELEMENTPAY_CONFIG, VALIDATION } from "@/lib/elementpay-config";

/**
 * Server-side API route for creating ElementPay orders
 * This keeps the API key secure on the server side
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderPayload, signature, environment } = body;

    // Validate required fields
    if (!orderPayload || !signature) {
      return NextResponse.json(
        { error: "Missing orderPayload or signature" },
        { status: 400 }
      );
    }

    // Use environment from request (user can toggle between sandbox/live)
    // Fallback to 'sandbox' as default for safety
    const currentEnv = environment || "sandbox";
    const isSandbox = currentEnv === "sandbox";

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

    console.log("🔄 [API-ROUTE] Creating order:", {
      hasApiKey: !!apiKey,
      baseUrl,
      environment: currentEnv,
      requestedEnvironment: environment,
      payload: {
        user_address: orderPayload.user_address,
        token: orderPayload.token,
        order_type: orderPayload.order_type,
        fiat_payload: orderPayload.fiat_payload,
        message_hash: orderPayload.message_hash ? "present" : "missing",
        reason: orderPayload.reason,
      },
      signatureLength: signature.length,
    });

    // Call ElementPay API
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      VALIDATION.API_TIMEOUT
    );

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-key": apiKey,
      "X-Signature": signature,
    };

    const response = await fetch(`${baseUrl}/orders/create`, {
      method: "POST",
      headers,
      body: JSON.stringify(orderPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ [API-ROUTE] ElementPay API error:", data);
      return NextResponse.json(
        { error: data.message || "Failed to create order" },
        { status: response.status }
      );
    }

    console.log("✅ [API-ROUTE] Order created successfully");
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ [API-ROUTE] Error creating order:", error);

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
