import * as Sentry from "@sentry/nextjs";

export interface LogContext {
	requestId?: string;
	userId?: string;
	action?: string;
	route?: string;
	orderId?: string;
	correlationId?: string;
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

function formatEntry(level: string, message: string, context?: LogContext) {
	return JSON.stringify({
		level,
		message: redactPii(message),
		timestamp: new Date().toISOString(),
		...(context && { context }),
	});
}

export const logger = {
	info(message: string, context?: LogContext) {
		console.log(formatEntry("info", message, context));
	},

	warn(message: string, context?: LogContext) {
		console.warn(formatEntry("warn", message, context));

		Sentry.addBreadcrumb({
			level: "warning",
			message: redactPii(message),
			data: context,
		});
	},

	error(message: string, error?: unknown, context?: LogContext) {
		const errorObj = error instanceof Error ? error : error ? new Error(String(error)) : undefined;

		console.error(formatEntry("error", message, context), ...(errorObj ? [errorObj.message] : []));

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
		if (process.env.NODE_ENV !== "development") return;
		console.debug(formatEntry("debug", message, context));
	},
};
