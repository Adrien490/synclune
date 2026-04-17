"use server";

import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	handleActionError,
	notFound,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_NEWSLETTER_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { gdprExportSubscriberSchema } from "../schemas/newsletter.schemas";

/**
 * Export RGPD article 15 (droit d'accès) des données d'un subscriber.
 *
 * Recherche par email (inclut les soft-deleted pour conformité legale).
 * Inclut tous les champs subscriber + audit logs liés.
 * Le résultat est retourné dans `data` pour téléchargement client en JSON.
 */
export async function gdprExportSubscriberData(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const auth = await requireAdminWithUser();
	if ("error" in auth) return auth.error;
	const { user: adminUser } = auth;

	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_NEWSLETTER_LIMITS.GDPR_EXPORT);
	if ("error" in rateLimit) return rateLimit.error;

	const validation = validateInput(gdprExportSubscriberSchema, {
		email: safeFormGet(formData, "email"),
	});
	if ("error" in validation) return validation.error;

	const { email } = validation.data;

	try {
		// Inclut les soft-deleted (l'utilisateur a le droit d'accéder à ses données même supprimées)
		const subscriber = await prisma.newsletterSubscriber.findUnique({
			where: { email },
		});

		if (!subscriber) {
			return notFound("Aucun abonné trouvé pour cette adresse email");
		}

		const auditLogs = await prisma.auditLog.findMany({
			where: {
				targetType: "newsletter_subscriber",
				targetId: subscriber.id,
			},
			orderBy: { createdAt: "desc" },
			take: 1000,
		});

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "newsletter.gdprExport",
			targetType: "newsletter_subscriber",
			targetId: subscriber.id,
			metadata: { email: subscriber.email, auditLogsCount: auditLogs.length },
		});

		const exportPayload = {
			exportedAt: new Date().toISOString(),
			exportedBy: adminUser.email,
			gdprArticle: "Article 15 - Droit d'accès",
			subscriber: {
				id: subscriber.id,
				email: subscriber.email,
				status: subscriber.status,
				userId: subscriber.userId,
				ipAddress: subscriber.ipAddress,
				confirmationIpAddress: subscriber.confirmationIpAddress,
				userAgent: subscriber.userAgent,
				consentSource: subscriber.consentSource,
				consentTimestamp: subscriber.consentTimestamp.toISOString(),
				subscribedAt: subscriber.subscribedAt.toISOString(),
				confirmedAt: subscriber.confirmedAt?.toISOString() ?? null,
				unsubscribedAt: subscriber.unsubscribedAt?.toISOString() ?? null,
				createdAt: subscriber.createdAt.toISOString(),
				updatedAt: subscriber.updatedAt.toISOString(),
				deletedAt: subscriber.deletedAt?.toISOString() ?? null,
			},
			auditLogs: auditLogs.map((log) => ({
				id: log.id,
				action: log.action,
				adminId: log.adminId,
				adminName: log.adminName,
				metadata: log.metadata,
				createdAt: log.createdAt.toISOString(),
			})),
		};

		return success(`Export RGPD généré pour ${subscriber.email}`, exportPayload);
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'export RGPD");
	}
}
