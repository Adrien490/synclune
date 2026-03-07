import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/shared/lib/rate-limit";
import { logger } from "@/shared/lib/logger";
import { headers } from "next/headers";

/**
 * CSP violation report endpoint.
 * Receives Content-Security-Policy violation reports and logs them.
 * In production, these could be forwarded to a monitoring service.
 *
 * Rate limited to prevent abuse (browsers auto-report, could be weaponized).
 */
export async function POST(request: Request) {
	try {
		// Rate limit: 20 reports per minute per IP
		const headersList = await headers();
		const ip = await getClientIp(headersList);
		const rateLimit = await checkRateLimit(`ip:${ip ?? "unknown"}`, {
			limit: 20,
			windowMs: 60_000,
		});

		if (!rateLimit.success) {
			return NextResponse.json({ status: "rate_limited" }, { status: 429 });
		}

		const body = (await request.json()) as Record<string, unknown>;

		const report = (body["csp-report"] ?? body) as Record<string, unknown>;
		const blockedUri = report["blocked-uri"] as string | undefined;
		const violatedDirective = report["violated-directive"] as string | undefined;
		const documentUri = report["document-uri"] as string | undefined;

		logger.warn("CSP violation detected", {
			service: "csp",
			blockedUri,
			violatedDirective,
			documentUri,
		});

		return NextResponse.json({ status: "ok" }, { status: 204 });
	} catch {
		return NextResponse.json({ status: "error" }, { status: 400 });
	}
}
