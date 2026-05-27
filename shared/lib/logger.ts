import * as Sentry from "@sentry/nextjs";
import pino from "pino";

export interface LogContext {
	userId?: string;
	action?: string;
	route?: string;
	orderId?: string;
	cronJob?: string;
	service?: string;
	[key: string]: unknown;
}

// PII patterns to redact from log messages
const PII_PATTERNS: [RegExp, string][] = [
	[/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]"],
	[/(?:\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, "[PHONE_REDACTED]"],
];

function redactPii(message: string): string {
	let result = message;
	for (const [pattern, replacement] of PII_PATTERNS) {
		result = result.replace(pattern, replacement);
	}
	return result;
}

// Cf. audit conformité 2026-05-27 — ORD-COMPLY-008.
// Pino redact ne supporte pas `*.email` ; on liste explicitement les chemins
// imbriqués (depth ≤ 2) qui peuvent recevoir des PII. Pour des structures plus
// profondes, scrubber Sentry côté SDK + redactPii() côté message restent les
// garde-fous secondaires.
export const REDACT_PATHS = [
	// niveau 1 (context.*)
	"context.email",
	"context.phone",
	"context.customerEmail",
	"context.customerPhone",
	"context.shippingPhone",
	"context.billingPhone",
	"context.address1",
	"context.address2",
	"context.firstName",
	"context.lastName",
	// niveau 2 (context.user.* | context.order.* | context.body.shipping.*)
	"context.user.email",
	"context.user.phone",
	"context.user.name",
	"context.order.customerEmail",
	"context.order.customerName",
	"context.order.customerPhone",
	"context.shipping.email",
	"context.shipping.phone",
	"context.body.shipping.email",
	"context.body.shipping.phone",
];

const pinoLogger = pino({
	level: process.env.NODE_ENV === "development" ? "debug" : "info",
	redact: {
		paths: REDACT_PATHS,
		censor: "[REDACTED]",
	},
	...(process.env.NODE_ENV === "development"
		? {
				transport: {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "HH:MM:ss",
						ignore: "pid,hostname",
					},
				},
			}
		: {
				formatters: {
					level(label) {
						return { level: label };
					},
				},
				timestamp: pino.stdTimeFunctions.isoTime,
			}),
});

export const logger = {
	info(message: string, context?: LogContext) {
		pinoLogger.info({ context }, redactPii(message));
	},

	warn(message: string, context?: LogContext) {
		pinoLogger.warn({ context }, redactPii(message));

		Sentry.addBreadcrumb({
			level: "warning",
			message: redactPii(message),
			data: context,
		});
	},

	error(message: string, error?: unknown, context?: LogContext) {
		const errorObj = error instanceof Error ? error : error ? new Error(String(error)) : undefined;

		pinoLogger.error({ err: errorObj, context }, redactPii(message));

		if (errorObj) {
			Sentry.captureException(errorObj, {
				tags: {
					...(context?.action && { action: String(context.action) }),
					...(context?.cronJob && { cronJob: String(context.cronJob) }),
					...(context?.service && { service: String(context.service) }),
					...(context?.route && { route: String(context.route) }),
				},
				contexts: {
					custom: context as Record<string, unknown>,
				},
			});
		} else {
			Sentry.captureMessage(redactPii(message), {
				level: "error",
				tags: {
					...(context?.action && { action: String(context.action) }),
					...(context?.cronJob && { cronJob: String(context.cronJob) }),
				},
			});
		}
	},

	debug(message: string, context?: LogContext) {
		pinoLogger.debug({ context }, redactPii(message));
	},
};
