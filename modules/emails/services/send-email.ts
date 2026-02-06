import { Resend } from "resend"
import { EMAIL_FROM } from "../constants/email.constants"
import type { EmailResult } from "../types/email.types"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(params: {
	to: string | string[]
	subject: string
	html: string
	replyTo?: string
}): Promise<EmailResult> {
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
