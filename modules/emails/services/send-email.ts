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
	try {
		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			...params,
		})
		if (error) return { success: false, error }
		return { success: true, data: data! }
	} catch (error) {
		return { success: false, error }
	}
}
