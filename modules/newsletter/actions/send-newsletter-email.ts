"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { sendNewsletterEmail as sendEmail } from "@/modules/emails/services/newsletter-emails";
import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { sanitizeForEmail, newlinesToBr } from "@/shared/lib/sanitize";
import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { sendNewsletterEmailSchema } from "@/modules/newsletter/schemas/newsletter.schemas";
import { NEWSLETTER_BASE_URL } from "@/modules/newsletter/constants/urls.constants";
import {
	NEWSLETTER_BATCH_SIZE,
	NEWSLETTER_MAX_CONCURRENT_SENDS,
} from "@/modules/newsletter/constants/subscriber.constants";

export async function sendNewsletterEmail(
	_previousState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Validation avec Zod
		const subject = formData.get("subject");
		const content = formData.get("content");
		const result = sendNewsletterEmailSchema.safeParse({ subject, content });

		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		const { subject: validatedSubject, content: validatedContent } =
			result.data;

		// Sanitizer le contenu pour éviter XSS et injection de caractères de contrôle
		const sanitizedSubject = sanitizeForEmail(validatedSubject);
		const sanitizedContent = newlinesToBr(sanitizeForEmail(validatedContent));

		// Compter d'abord le nombre total d'abonnés confirmés
		const totalCount = await prisma.newsletterSubscriber.count({
			where: {
				status: NewsletterStatus.CONFIRMED,
			},
		});

		if (totalCount === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun abonné actif trouvé",
			};
		}

		// Traitement par batch avec curseur pour éviter surcharge mémoire
		let successCount = 0;
		let errorCount = 0;
		let lastId: string | undefined;

		while (true) {
			// Récupérer un batch d'abonnés confirmés
			const subscribers = await prisma.newsletterSubscriber.findMany({
				where: {
					status: NewsletterStatus.CONFIRMED,
					...(lastId ? { id: { gt: lastId } } : {}),
				},
				select: {
					id: true,
					email: true,
					unsubscribeToken: true,
				},
				take: NEWSLETTER_BATCH_SIZE,
				orderBy: { id: "asc" },
			});

			if (subscribers.length === 0) break;

			// Traiter le batch en chunks de NEWSLETTER_MAX_CONCURRENT_SENDS
			for (let i = 0; i < subscribers.length; i += NEWSLETTER_MAX_CONCURRENT_SENDS) {
				const chunk = subscribers.slice(i, i + NEWSLETTER_MAX_CONCURRENT_SENDS);

				const sendPromises = chunk.map((subscriber) => {
					const unsubscribeUrl = `${NEWSLETTER_BASE_URL}/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}`;

					return sendEmail({
						to: subscriber.email,
						subject: sanitizedSubject,
						content: sanitizedContent,
						unsubscribeUrl,
					});
				});

				const results = await Promise.allSettled(sendPromises);

				// Logger les erreurs pour chaque envoi échoué
				results.forEach((r, index) => {
					if (r.status === "rejected") {
						console.error(
							`[SEND_NEWSLETTER] Échec envoi à ${chunk[index].email}:`,
							r.reason
						);
					} else if (!r.value.success) {
						console.error(
							`[SEND_NEWSLETTER] Échec Resend pour ${chunk[index].email}:`,
							r.value.error
						);
					}
				});

				successCount += results.filter(
					(r) => r.status === "fulfilled" && r.value.success
				).length;
				errorCount += results.filter(
					(r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
				).length;
			}

			lastId = subscribers[subscribers.length - 1].id;
		}

		// Audit log
		console.log(
			`[SEND_NEWSLETTER_AUDIT] Newsletter sent: ${successCount} success, ${errorCount} errors, ${totalCount} total`
		);

		if (errorCount > 0) {
			console.error(
				`[SEND_NEWSLETTER] ${errorCount} emails n'ont pas pu être envoyés`
			);
		}

		return {
			status: ActionStatus.SUCCESS,
			message: `Newsletter envoyée avec succès à ${successCount} abonné(s)${errorCount > 0 ? `. ${errorCount} échec(s).` : ""}`,
			data: {
				successCount,
				errorCount,
				totalCount,
			},
		};
	} catch (error) {
		console.error("[SEND_NEWSLETTER] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de l'envoi de la newsletter",
		};
	}
}
