import { render } from "@react-email/components"
import { Resend } from "resend"
import { EMAIL_FROM } from "../constants/email.constants"
import type { EmailResult } from "../types/email.types"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(params: {
	to: string | string[]
	subject: string
	html: string
	text?: string
	replyTo?: string
	headers?: Record<string, string>
	tags?: Array<{ name: string; value: string }>
}): Promise<EmailResult> {
	if (!params.to || (Array.isArray(params.to) && params.to.length === 0)) {
		console.error("[EMAIL] Missing recipient")
		return { success: false, error: "Missing recipient" }
	}

	const recipient = Array.isArray(params.to) ? params.to.join(", ") : params.to
	try {
		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			...params,
		})
		if (error) {
			console.error(`[EMAIL] Failed to send "${params.subject}" to ${recipient}:`, error)
			return { success: false, error }
		}
		console.log(`[EMAIL] Sent "${params.subject}" to ${recipient}`)
		return { success: true, data: data! }
	} catch (error) {
		console.error(`[EMAIL] Failed to send "${params.subject}" to ${recipient}:`, error)
		return { success: false, error }
	}
}

/**
 * Renders a React Email component to HTML/text and sends it via Resend
 */
export async function renderAndSend(
	component: React.ReactElement,
	params: Omit<Parameters<typeof sendEmail>[0], "html" | "text">
): Promise<EmailResult> {
	if (!params.to || (Array.isArray(params.to) && params.to.length === 0)) {
		console.error("[EMAIL] Missing recipient")
		return { success: false, error: "Missing recipient" }
	}

	let html: string
	let text: string
	try {
		html = await render(component)
		text = await render(component, { plainText: true })
	} catch (renderError) {
		const recipient = Array.isArray(params.to) ? params.to.join(", ") : params.to
		console.error(`[EMAIL] Failed to render template for "${params.subject}" to ${recipient}:`, renderError)
		return { success: false, error: renderError }
	}
	return sendEmail({ ...params, html, text })
}
