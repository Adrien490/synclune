"use server";

import { NewsletterStatus } from "@/app/generated/prisma";
import { auth } from "@/modules/auth/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { exportSubscribersSchema } from "@/modules/newsletter/schemas/newsletter.schemas";

/**
 * Export des abonnés newsletter au format CSV
 *
 * Server Action réservée aux administrateurs
 * Retourne les données CSV en base64 pour téléchargement côté client
 *
 * @returns ActionState avec data.csv (string base64) et data.filename
 */
export async function exportSubscribers(
	_previousState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// Vérification admin
		const session = await auth.api.getSession({ headers: await headers() });

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
		const statusParam = formData.get("status") || "all";
		const formatParam = formData.get("format") || "csv";

		const result = exportSubscribersSchema.safeParse({
			status: statusParam,
			format: formatParam,
		});

		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		const { status } = result.data;

		// Construire le filtre Prisma basé sur le statut enum
		const whereClause =
			status === "active"
				? { status: NewsletterStatus.CONFIRMED }
				: status === "inactive"
					? { status: { in: [NewsletterStatus.PENDING, NewsletterStatus.UNSUBSCRIBED] } }
					: {}; // "all" : pas de filtre

		// Récupérer les abonnés selon le filtre (sans données GDPR sensibles)
		const subscribers = await prisma.newsletterSubscriber.findMany({
			where: whereClause,
			select: {
				email: true,
				status: true,
				subscribedAt: true,
				unsubscribedAt: true,
				consentTimestamp: true,
				// ipAddress et consentSource retirés pour conformité RGPD
			},
			orderBy: { subscribedAt: "desc" },
		});

		if (subscribers.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun abonné trouvé avec les filtres sélectionnés",
			};
		}

		// Audit log de l'export
		console.log(
			`[EXPORT_AUDIT] Admin ${session.user.id} exported ${subscribers.length} subscribers (status: ${status})`
		);

		// Générer CSV avec BOM UTF-8 (pour Excel)
		const BOM = "\uFEFF";
		const csvHeader =
			"Email,Statut,Date d'inscription,Date de consentement,Date de désinscription\n";

		const csvRows = subscribers
			.map((s) => {
				const statusLabel = s.status === NewsletterStatus.CONFIRMED ? "Confirmé" : s.status === NewsletterStatus.PENDING ? "En attente" : "Désabonné";
				const subscribedAt = s.subscribedAt.toISOString().split("T")[0];
				const consentTimestamp = s.consentTimestamp
					.toISOString()
					.split("T")[0];
				const unsubscribedAt = s.unsubscribedAt
					? s.unsubscribedAt.toISOString().split("T")[0]
					: "N/A";

				// Échapper les virgules dans l'email (si besoin)
				const emailEscaped = s.email.includes(",")
					? `"${s.email}"`
					: s.email;

				return `${emailEscaped},${statusLabel},${subscribedAt},${consentTimestamp},${unsubscribedAt}`;
			})
			.join("\n");

		const csv = BOM + csvHeader + csvRows;

		// Encoder en base64 pour transmission via ActionState
		const csvBase64 = Buffer.from(csv, "utf-8").toString("base64");

		// Nom de fichier avec date et filtre
		const today = new Date().toISOString().split("T")[0];
		const statusSuffix =
			status === "active"
				? "-actifs"
				: status === "inactive"
					? "-inactifs"
					: "";
		const filename = `newsletter-subscribers${statusSuffix}-${today}.csv`;

		return {
			status: ActionStatus.SUCCESS,
			message: `Export réussi : ${subscribers.length} abonné(s)`,
			data: {
				csv: csvBase64,
				filename,
				count: subscribers.length,
			},
		};
	} catch (error) {
		console.error("[EXPORT_SUBSCRIBERS] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de l'export",
		};
	}
}
