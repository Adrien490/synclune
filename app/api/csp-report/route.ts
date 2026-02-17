import { NextResponse } from "next/server";

/**
 * CSP violation report endpoint.
 * Receives Content-Security-Policy violation reports and logs them.
 * In production, these could be forwarded to a monitoring service.
 */
export async function POST(request: Request) {
	try {
		const body = await request.json();

		// Log CSP violations in development, silently in production
		if (process.env.NODE_ENV === "development") {
			console.warn("[CSP Violation]", JSON.stringify(body, null, 2));
		}

		return NextResponse.json({ status: "ok" }, { status: 204 });
	} catch {
		return NextResponse.json({ status: "error" }, { status: 400 });
	}
}
