import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import type { Session } from "@/modules/auth/lib/auth";

/**
 * EINV-SEC-008 / EINV-SEC-001 : résout de façon sûre si l'acteur courant est
 * réellement admin pour les routes de documents fiscaux (facture + avoirs).
 *
 * `session.user.role` est best-effort (jusqu'à ~5 min stale) à cause du
 * `cookieCache` Better Auth. Un admin récemment démoté conserverait sinon le
 * quota élargi (200/h) ET bypasserait l'ownership check sur n'importe quel
 * document (facture/avoir contenant des PII).
 *
 * On re-vérifie le rôle en DB UNIQUEMENT quand le cookie prétend admin
 * (1 query supplémentaire limitée aux admins, aucun impact sur les users
 * normaux). Partagé entre les 3 routes (`/invoice`, `/credit-note`,
 * `/credit-note/[refundId]`) pour éviter la re-divergence.
 *
 * @param service nom du service pour le log de session stale (observabilité).
 * @returns `true` seulement si le cookie prétend admin ET la DB le confirme.
 */
export async function resolveInvoiceActorIsAdmin(
	session: Session | null,
	service: string,
): Promise<boolean> {
	if (session?.user.role !== "ADMIN" || !session.user.id) {
		return false;
	}

	const dbUser = await prisma.user.findUnique({
		where: { id: session.user.id, ...notDeleted },
		select: { role: true },
	});
	const isAdmin = dbUser?.role === "ADMIN";

	if (!isAdmin) {
		logger.warn(
			"Stale admin session detected on invoice route — falling back to owner/token path",
			{
				service,
				userId: session.user.id,
				sessionRole: session.user.role,
				dbRole: dbUser?.role ?? "user_not_found",
			},
		);
	}

	return isAdmin;
}
