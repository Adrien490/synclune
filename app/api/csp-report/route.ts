import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/shared/lib/rate-limit";
import { logger } from "@/shared/lib/logger";
import { headers } from "next/headers";

/**
 * Champs loggés bornés (fail-open par champ : valeur absente/malformée/trop
 * longue → undefined, le report reste loggé — un attaquant ne peut plus
 * injecter des chaînes arbitrairement longues dans les logs).
 */
const cspFieldSchema = z.string().max(1024).optional().catch(undefined);

const cspReportSchema = z.looseObject({
	"blocked-uri": cspFieldSchema,
	"violated-directive": cspFieldSchema,
	"document-uri": cspFieldSchema,
});

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
			return NextResponse.json(
				{ status: "rate_limited" },
				{
					status: 429,
					headers: { "Retry-After": String(rateLimit.retryAfter ?? 60) },
				},
			);
		}

		const body: unknown = await request.json();

		const envelope =
			typeof body === "object" && body !== null && "csp-report" in body
				? (body as Record<string, unknown>)["csp-report"]
				: body;

		const report = cspReportSchema.safeParse(envelope);
		if (!report.success) {
			// Report non-objet (garbage) : ignoré silencieusement, comme avant
			return new Response(null, { status: 204 });
		}

		logger.warn("CSP violation detected", {
			service: "csp",
			blockedUri: report.data["blocked-uri"],
			violatedDirective: report.data["violated-directive"],
			documentUri: report.data["document-uri"],
		});

		return new Response(null, { status: 204 });
	} catch {
		return NextResponse.json({ status: "error" }, { status: 400 });
	}
}
