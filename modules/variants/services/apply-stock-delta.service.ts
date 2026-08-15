import type { Prisma } from "@/app/generated/prisma/client";
import { BusinessError } from "@/shared/lib/actions";

/**
 * SSOT du stock saisi dans un FORMULAIRE admin : verrou de ligne, delta relatif,
 * garde de plancher et écriture du mouvement d'audit.
 *
 * Pourquoi un delta plutôt qu'un `stock: <valeur>` absolu — un formulaire
 * affiche un stock à l'ouverture, l'admin le modifie et enregistre plus tard. Entre
 * les deux, le webhook d'encaissement a pu décrémenter. Un set absolu écrit alors
 * la valeur périmée du formulaire par-dessus une vente réelle (**stock fantôme**),
 * et la survente suivante se solde par un `OversellError` → commande FAILED +
 * remboursement automatique. Le `SELECT … FOR UPDATE` sérialise avec le
 * `FOR UPDATE` de `checkout-order-processing.service`, et l'`increment` relatif
 * préserve tout décrément commité entre-temps.
 *
 * Ce helper est partagé par les DEUX formulaires qui portent un champ de stock —
 * `update-variant` (fiche variante) et `update-product` (fiche produit, cas mono-VARIANT).
 * Il existe précisément parce que la duplication a laissé le second en set absolu
 * pendant deux mois après la correction du premier : la logique vit ici pour ne
 * plus pouvoir diverger.
 *
 * ⚠️ N'écrit PAS l'inventaire : il retourne le delta, et c'est l'appelant qui pose
 * `stock: { increment: delta }` dans son propre `productVariant.update` — les deux
 * appelants en font déjà un pour leurs autres champs, une seconde écriture sur la
 * même ligne serait gratuite.
 *
 * @returns `delta` à appliquer (0 = ne rien changer, cas dominant), calculé contre la
 *   ligne VERROUILLÉE et non contre la valeur du formulaire — c'est ce qui préserve un
 *   décrément commité entre l'ouverture du formulaire et l'enregistrement.
 */
export async function applyStockDeltaTx(
	tx: Prisma.TransactionClient,
	params: {
		variantId: string;
		/** Stock cible saisi dans le formulaire. */
		targetStock: number;
		/**
		 * Stock affiché à l'ouverture du formulaire (champ caché). Absent ⇒ baseline
		 * = cible ⇒ delta 0 : on préfère ne rien toucher plutôt qu'écraser.
		 */
		originalStock?: number;
		/** Valeur déjà lue hors verrou, utilisée si le FOR UPDATE ne rend aucune ligne. */
		fallbackStock: number;
	},
): Promise<number> {
	const lockedRows = await tx.$queryRaw<{ stock: number }[]>`
		SELECT "stock" FROM "ProductVariant" WHERE "id" = ${params.variantId} FOR UPDATE
	`;
	const lockedStock = lockedRows[0]?.stock ?? params.fallbackStock;

	const baselineStock = params.originalStock ?? params.targetStock;
	const delta = params.targetStock - baselineStock;
	if (delta === 0) return 0;

	if (lockedStock + delta < 0) {
		throw new BusinessError(
			"Le stock a changé depuis l'ouverture du formulaire. Rechargez la fiche et réessayez.",
		);
	}

	return delta;
}
