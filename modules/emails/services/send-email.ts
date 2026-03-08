import { render } from "@react-email/components";
import { Resend } from "resend";
import { withRetry } from "@/shared/utils/with-retry";
import { resendCircuitBreaker, CircuitBreakerError } from "@/shared/lib/circuit-breaker";
import { logger } from "@/shared/lib/logger";
import { EMAIL_FROM } from "../constants/email.constants";
import type { EmailResult } from "../types/email.types";

function getResendClient(): Resend | null {
	if (!process.env.RESEND_API_KEY) return null;
	return new Resend(process.env.RESEND_API_KEY);
}

function isRetryableEmailError(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		if (
			message.includes("fetch") ||
			message.includes("network") ||
			message.includes("timeout") ||
			message.includes("econnrefused")
		) {
			return true;
		}
	}
	// Resend API errors with statusCode
	if (typeof error === "object" && error !== null && "statusCode" in error) {
		const statusCode = (error as { statusCode: number }).statusCode;
		return statusCode >= 500;
	}
	return false;
}

export async function sendEmail(params: {
	to: string | string[];
	subject: string;
	html: string;
	text?: string;
	replyTo?: string;
	headers?: Record<string, string>;
	tags?: Array<{ name: string; value: string }>;
}): Promise<EmailResult> {
	if (!params.to || (Array.isArray(params.to) && params.to.length === 0)) {
		logger.error("Missing recipient", undefined, { service: "send-email" });
		return { success: false, error: "Missing recipient" };
	}

	const resend = getResendClient();
	if (!resend) {
		logger.error("RESEND_API_KEY not configured", undefined, { service: "send-email" });
		return { success: false, error: "RESEND_API_KEY not configured" };
	}

	try {
		const { data, error } = await resendCircuitBreaker.execute(() =>
			withRetry(
				async () => {
					const result = await resend.emails.send({
						from: EMAIL_FROM,
						...params,
					});
					if (result.error && isRetryableEmailError(result.error)) {
						throw result.error;
					}
					return result;
				},
				{
					maxAttempts: 3,
					baseDelay: 1000,
					isRetryable: isRetryableEmailError,
				},
			),
		);
		if (error) {
			logger.error("Failed to send email", error, {
				service: "send-email",
				subject: params.subject,
			});
			return { success: false, error };
		}
		logger.info("Email sent successfully", { service: "send-email", subject: params.subject });
		return { success: true, data: data! };
	} catch (error) {
		if (error instanceof CircuitBreakerError) {
			logger.warn("Circuit breaker OPEN, skipping email", {
				service: "send-email",
				subject: params.subject,
			});
			return { success: false, error: "Email service temporarily unavailable" };
		}
		logger.error("Failed to send email", error, { service: "send-email", subject: params.subject });
		return { success: false, error };
	}
}

/**
 * Renders a React Email component to HTML/text and sends it via Resend
 */
export async function renderAndSend(
	component: React.ReactElement,
	params: Omit<Parameters<typeof sendEmail>[0], "html" | "text">,
): Promise<EmailResult> {
	if (!params.to || (Array.isArray(params.to) && params.to.length === 0)) {
		logger.error("Missing recipient", undefined, { service: "send-email" });
		return { success: false, error: "Missing recipient" };
	}

	let html: string;
	let text: string;
	try {
		html = await render(component);
		text = await render(component, { plainText: true });
	} catch (renderError) {
		logger.error("Failed to render email template", renderError, {
			service: "send-email",
			subject: params.subject,
		});
		return { success: false, error: renderError };
	}
	return sendEmail({ ...params, html, text });
}
