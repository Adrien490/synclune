import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/shared/lib/rate-limit";
import { headers } from "next/headers";
import { z } from "zod";

const metricSchema = z
	.object({
		name: z.enum(["CLS", "INP", "LCP", "FCP", "TTFB"]),
		value: z.number(),
		rating: z.enum(["good", "needs-improvement", "poor"]),
		delta: z.number(),
		id: z.string(),
		navigationType: z.string(),
		url: z.string(),
		debug_target: z.string().optional(),
	})
	.passthrough();

/**
 * Receives batched Web Vitals metrics from the client-side WebVitalsReporter.
 * Logs structured JSON for Vercel Log Drain ingestion and observability.
 */
export async function POST(request: Request) {
	try {
		// Rate limit: 20 reports per minute per IP
		const headersList = await headers();
		const ip = await getClientIp(headersList);
		const rateLimit = await checkRateLimit(`cwv:ip:${ip ?? "unknown"}`, {
			limit: 20,
			windowMs: 60_000,
		});

		if (!rateLimit.success) {
			return NextResponse.json({ status: "rate_limited" }, { status: 429 });
		}

		const metrics: unknown = await request.json();

		if (!Array.isArray(metrics)) {
			return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
		}

		for (const metric of metrics) {
			const parsed = metricSchema.safeParse(metric);
			if (!parsed.success) continue;

			// Structured JSON for Vercel Log Drain ingestion
			// eslint-disable-next-line no-console
			console.log(
				JSON.stringify({
					type: "cwv",
					...parsed.data,
					timestamp: Date.now(),
				}),
			);
		}

		return NextResponse.json({ ok: true }, { status: 200 });
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
}
