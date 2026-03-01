import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/shared/lib/rate-limit";
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
		const rateLimit = await checkRateLimit(`ip:${ip || "unknown"}`, {
			limit: 20,
			windowMs: 60_000,
		});

		if (!rateLimit.success) {
			return NextResponse.json({ status: "rate_limited" }, { status: 429 });
		}

		const body = await request.json();

		if (process.env.NODE_ENV === "development") {
			console.warn("[CSP Violation]", JSON.stringify(body, null, 2));
		} else {
			const report = body?.["csp-report"] ?? body;
			console.warn(
				"[CSP Violation]",
				JSON.stringify({
					blockedUri: report?.["blocked-uri"],
					violatedDirective: report?.["violated-directive"],
					documentUri: report?.["document-uri"],
				}),
			);
		}

		return NextResponse.json({ status: "ok" }, { status: 204 });
	} catch {
		return NextResponse.json({ status: "error" }, { status: 400 });
	}
}
