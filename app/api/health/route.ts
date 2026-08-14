import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/shared/lib/prisma";
import { stripeCircuitBreaker, resendCircuitBreaker } from "@/shared/lib/circuit-breaker";
import { requireAdminApiRoute } from "@/modules/admin-auth/lib/require-admin";
import { STRIPE_API_VERSION } from "@/shared/constants/stripe-api-version";

interface ServiceCheck {
	status: "ok" | "error" | "degraded";
	latencyMs?: number;
	message?: string;
}

async function checkDatabase(): Promise<ServiceCheck> {
	const start = Date.now();
	try {
		await prisma.$queryRaw`SELECT 1`;
		return { status: "ok", latencyMs: Date.now() - start };
	} catch (e) {
		return {
			status: "error",
			latencyMs: Date.now() - start,
			message: e instanceof Error ? e.message : "Unknown error",
		};
	}
}

async function checkStripe(): Promise<ServiceCheck> {
	if (!stripeCircuitBreaker.isAvailable) {
		return { status: "degraded", message: `Circuit breaker ${stripeCircuitBreaker.state}` };
	}

	const start = Date.now();
	try {
		const { default: Stripe } = await import("stripe");
		const secretKey = process.env.STRIPE_SECRET_KEY;
		if (!secretKey) {
			return { status: "error", message: "STRIPE_SECRET_KEY not configured" };
		}
		// Client dédié (et non `shared/lib/stripe`) parce que le healthcheck veut
		// échouer VITE : aucun retry, timeout court. La version d'API, elle, vient de
		// la SSOT — un healthcheck vert sur une version différente de celle du tunnel
		// de paiement est un signal qui ment.
		const stripe = new Stripe(secretKey, {
			apiVersion: STRIPE_API_VERSION,
			maxNetworkRetries: 0,
			timeout: 5000,
		});
		// Lightweight API call to verify connectivity
		await stripe.balance.retrieve();
		return { status: "ok", latencyMs: Date.now() - start };
	} catch (e) {
		return {
			status: "error",
			latencyMs: Date.now() - start,
			message: e instanceof Error ? e.message : "Unknown error",
		};
	}
}

async function checkResend(): Promise<ServiceCheck> {
	if (!resendCircuitBreaker.isAvailable) {
		return { status: "degraded", message: `Circuit breaker ${resendCircuitBreaker.state}` };
	}

	if (!process.env.RESEND_API_KEY) {
		return { status: "error", message: "RESEND_API_KEY not configured" };
	}

	// Resend doesn't have a lightweight ping endpoint, so just check the API key is set
	// and the circuit breaker is healthy. A full domain check would count against rate limits.
	return { status: "ok" };
}

function verifyHealthcheckToken(request: Request): boolean {
	const expected = process.env.HEALTHCHECK_TOKEN;
	if (!expected) return false;

	const url = new URL(request.url);
	const provided = url.searchParams.get("token") ?? request.headers.get("x-healthcheck-token");
	if (!provided) return false;

	const expectedBytes = Buffer.from(expected);
	const providedBytes = Buffer.from(provided);
	if (expectedBytes.length !== providedBytes.length) return false;
	return timingSafeEqual(expectedBytes, providedBytes);
}

export async function GET(request: Request) {
	// Detailed view granted if either the user is admin OR a valid healthcheck
	// token is provided (external probes like UptimeRobot / Better Stack).
	const tokenValid = verifyHealthcheckToken(request);
	const adminCheck = tokenValid ? null : await requireAdminApiRoute();
	const detailed = tokenValid || (adminCheck !== null && "admin" in adminCheck);

	// Unauthenticated/non-admin without token: return minimal status only
	if (!detailed) {
		return Response.json({ status: "ok" });
	}

	// Admin: return full service details
	const start = Date.now();

	const [database, stripe, resend] = await Promise.all([
		checkDatabase(),
		checkStripe(),
		checkResend(),
	]);

	const services = { database, stripe, resend };

	// Overall status: error if any critical service (DB, Stripe) is down
	const criticalDown = database.status === "error" || stripe.status === "error";
	const anyDegraded = Object.values(services).some(
		(s) => s.status === "degraded" || s.status === "error",
	);

	const overallStatus = criticalDown ? "error" : anyDegraded ? "degraded" : "ok";

	const httpStatus = criticalDown ? 503 : 200;

	return Response.json(
		{
			status: overallStatus,
			version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
			timestamp: new Date().toISOString(),
			totalLatencyMs: Date.now() - start,
			services,
		},
		{ status: httpStatus },
	);
}
