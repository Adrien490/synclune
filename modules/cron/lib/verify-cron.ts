import { timingSafeEqual } from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Verify that the request is from Vercel Cron
 *
 * In production, Vercel adds the Authorization header with Bearer <CRON_SECRET>
 * In development, we skip verification for testing
 *
 * @returns null if authorized, NextResponse with 401 if unauthorized
 */
export async function verifyCronRequest(): Promise<NextResponse | null> {
	// Skip verification in development for testing
	if (process.env.NODE_ENV === "development") {
		return null;
	}

	const cronSecret = process.env.CRON_SECRET;

	// If CRON_SECRET is not set, reject all requests in production
	if (!cronSecret) {
		console.error("[CRON] CRON_SECRET environment variable is not set");
		return NextResponse.json(
			{ error: "Cron secret not configured" },
			{ status: 500 }
		);
	}

	const headersList = await headers();
	const authorization = headersList.get("authorization");

	const expected = Buffer.from(`Bearer ${cronSecret}`);
	const received = Buffer.from(authorization || "");
	if (
		expected.length !== received.length ||
		!timingSafeEqual(expected, received)
	) {
		console.warn("[CRON] Unauthorized cron request attempt");
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	return null;
}

/**
 * Start a timer for measuring cron job duration.
 * Pass the returned value to cronSuccess() to include durationMs in the response.
 */
export function cronTimer(): number {
	return Date.now();
}

/**
 * Standard success response for cron jobs
 */
export function cronSuccess(
	data: Record<string, unknown>,
	startTime?: number
): NextResponse {
	return NextResponse.json({
		success: true,
		timestamp: new Date().toISOString(),
		...(startTime !== undefined && { durationMs: Date.now() - startTime }),
		...data,
	});
}

/**
 * Standard error response for cron jobs
 */
export function cronError(message: string, status = 500): NextResponse {
	console.error(`[CRON] Error: ${message}`);
	return NextResponse.json(
		{
			success: false,
			error: message,
			timestamp: new Date().toISOString(),
		},
		{ status }
	);
}
