"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { exportSubscribersSchema } from "@/modules/newsletter/schemas/newsletter.schemas";
import { NEWSLETTER_STATUS_LABELS } from "../constants/newsletter-status.constants";

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
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// Validation avec Zod
		const statusParam = formData.get("status") || "all";
		const formatParam = formData.get("format") || "csv";

		const validated = validateInput(exportSubscribersSchema, {
			status: statusParam,
			format: formatParam,
		});
		if ("error" in validated) return validated.error;

		const { status } = validated.data;

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
			return error("Aucun abonné trouvé avec les filtres sélectionnés");
		}

		// Audit log de l'export
		console.log(
			`[EXPORT_AUDIT] Admin exported ${subscribers.length} subscribers (status: ${status})`
		);

		// Générer CSV avec BOM UTF-8 (pour Excel)
		const BOM = "\uFEFF";
		const csvHeader =
			"Email,Statut,Date d'inscription,Date de consentement,Date de désinscription\n";

		const csvRows = subscribers
			.map((s) => {
				const statusLabel = NEWSLETTER_STATUS_LABELS[s.status];
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

		return success(`Export réussi : ${subscribers.length} abonné(s)`, {
			csv: csvBase64,
			filename,
			count: subscribers.length,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'export");
	}
}
