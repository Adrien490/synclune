import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";

interface LogFailedEmailParams {
	to: string;
	subject: string;
	template: string;
	payload: Record<string, unknown>;
	error: unknown;
	orderId?: string;
}

/**
 * Logs a failed email to the FailedEmail table for automatic retry via cron
 * Non-throwing: silently logs errors to avoid cascading failures
 */
export async function logFailedEmail(params: LogFailedEmailParams): Promise<void> {
	try {
		await prisma.failedEmail.create({
			data: {
				to: params.to,
				subject: params.subject,
				template: params.template,
				payload: params.payload as Prisma.InputJsonValue,
				orderId: params.orderId,
				lastError: params.error instanceof Error ? params.error.message : String(params.error),
			},
		});
	} catch (e) {
		console.error("[LOG_FAILED_EMAIL] Could not log failed email:", e);
	}
}
