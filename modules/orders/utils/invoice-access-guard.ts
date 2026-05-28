import { prisma } from "@/shared/lib/prisma";
import { AccountStatus } from "@/app/generated/prisma/client";

/**
 * EINV-SEC-002 : révocation de l'accès par token permanent après effacement RGPD.
 *
 * Le token d'accès facture (`invoice-token.ts`) est stateless, sans expiration et
 * délivré dans l'email de confirmation. Il survit donc à l'anonymisation du compte.
 * Or le snapshot `billing*` du PDF reste figé (obligation légale Art. 289 CGI) :
 * un porteur du lien email accèderait indéfiniment au nom + adresse d'origine,
 * même après exercice du droit à l'effacement (RGPD Art. 17).
 *
 * Cette garde coupe l'accès **par token** une fois le compte propriétaire effacé :
 * - `ANONYMIZED` : compte effacé après le délai de grâce → révoqué ;
 * - propriétaire introuvable (hard-delete rétention) → révoqué par prudence.
 *
 * Ne concerne PAS :
 * - les commandes guest (`userId === null`) : aucun compte à effacer, token valide ;
 * - l'accès admin (audit fiscal, conservé) ;
 * - l'accès owner-session : une session vivante implique un compte non anonymisé
 *   (les sessions sont supprimées à l'anonymisation + login bloqué côté auth).
 *
 * Requête DB volontairement SANS `notDeleted` : un compte anonymisé porte
 * `deletedAt` ET `accountStatus = ANONYMIZED` — il doit être lu, pas filtré.
 *
 * @returns `true` si l'accès par token doit être refusé (→ 410 Gone côté route).
 */
export async function isInvoiceOwnerErased(orderUserId: string | null): Promise<boolean> {
	if (!orderUserId) return false; // commande guest — aucun compte à effacer

	const owner = await prisma.user.findUnique({
		where: { id: orderUserId },
		select: { accountStatus: true },
	});

	return !owner || owner.accountStatus === AccountStatus.ANONYMIZED;
}
