"use server";

import { auth } from "@/modules/auth/lib/auth";
import { sendNewsletterEmail as sendEmail } from "@/shared/lib/email";
import { prisma } from "@/shared/lib/prisma";
import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { sendNewsletterEmailSchema } from "@/modules/newsletter/schemas/newsletter.schemas";

export async function sendNewsletterEmail(
	_previousState: ActionState | null,
	formData: FormData
): Promise<ActionState> {
	try {
		// Vérifier l'authentification et le rôle admin
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session?.user) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous devez être connecté pour effectuer cette action",
			};
		}

		if (session.user.role !== "ADMIN") {
			return {
				status: ActionStatus.FORBIDDEN,
				message: "Vous n'avez pas les permissions pour effectuer cette action",
			};
		}

		// Validation avec Zod
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

		// Récupérer tous les abonnés actifs ET avec email vérifié (double opt-in)
		const subscribers = await prisma.newsletterSubscriber.findMany({
			where: {
				isActive: true,
				emailVerified: true, // ✅ Seulement les emails confirmés
			},
			select: {
				email: true,
				unsubscribeToken: true,
			},
		});

		if (subscribers.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun abonné actif trouvé",
			};
		}

		// Préparer l'URL de désinscription (sera unique par abonné en production)
		const baseUrl = process.env.BETTER_AUTH_URL || "https://synclune.fr";

		// Envoyer l'email à tous les abonnés avec lien de désinscription sécurisé
		const sendPromises = subscribers.map((subscriber) => {
			const unsubscribeUrl = `${baseUrl}/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}`;

			return sendEmail({
				to: subscriber.email,
				subject: validatedSubject,
				content: validatedContent,
				unsubscribeUrl,
			});
		});

		const results = await Promise.allSettled(sendPromises);

		// Compter les succès et les échecs
		const successCount = results.filter(
			(r) => r.status === "fulfilled" && r.value.success
		).length;
		const errorCount = results.length - successCount;

		if (errorCount > 0) {
// console.error(`❌ ${errorCount} emails n'ont pas pu être envoyés`);
		}

		return {
			status: ActionStatus.SUCCESS,
			message: `Newsletter envoyée avec succès à ${successCount} abonné(s)${errorCount > 0 ? `. ${errorCount} échec(s).` : ""}`,
			data: {
				successCount,
				errorCount,
				totalCount: subscribers.length,
			},
		};
	} catch (error) {
// console.error("Erreur lors de l'envoi de la newsletter:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de l'envoi de la newsletter",
		};
	}
}
