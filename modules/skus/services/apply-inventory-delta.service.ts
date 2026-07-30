import type { Prisma } from "@/app/generated/prisma/client";
import { StockMovementSource } from "@/app/generated/prisma/client";
import { BusinessError } from "@/shared/lib/actions";
import { recordStockMovementTx } from "./stock-movement.service";

/**
 * SSOT du stock saisi dans un FORMULAIRE admin : verrou de ligne, delta relatif,
 * garde de plancher et écriture du mouvement d'audit.
 *
 * Pourquoi un delta plutôt qu'un `inventory: <valeur>` absolu — un formulaire
 * affiche un stock à l'ouverture, l'admin le modifie et enregistre plus tard. Entre
 * les deux, le webhook d'encaissement a pu décrémenter. Un set absolu écrit alors
 * la valeur périmée du formulaire par-dessus une vente réelle (**stock fantôme**),
 * et la survente suivante se solde par un `OversellError` → commande FAILED +
 * remboursement automatique. Le `SELECT … FOR UPDATE` sérialise avec le
 * `FOR UPDATE` de `checkout-order-processing.service`, et l'`increment` relatif
 * préserve tout décrément commité entre-temps.
 *
 * Ce helper est partagé par les DEUX formulaires qui portent un champ de stock —
 * `update-sku` (fiche variante) et `update-product` (fiche produit, cas mono-SKU).
 * Il existe précisément parce que la duplication a laissé le second en set absolu
 * pendant deux mois après la correction du premier : la logique vit ici pour ne
 * plus pouvoir diverger.
 *
 * ⚠️ N'écrit PAS l'inventaire : il retourne le delta, et c'est l'appelant qui pose
 * `inventory: { increment: delta }` dans son propre `productSku.update` — les deux
 * appelants en font déjà un pour leurs autres champs, une seconde écriture sur la
 * même ligne serait gratuite.
 *
 * @returns `delta` à appliquer (0 = ne rien changer, cas dominant) et l'encadrement
 *   VERROUILLÉ du stock. `previousInventory`/`newInventory` viennent de la ligne
 *   verrouillée, jamais du formulaire : c'est ce qui rend le journal `StockMovement`
 *   fidèle même si un writer concurrent passe entre la lecture et l'écriture.
 */
export async function applyInventoryDeltaTx(
	tx: Prisma.TransactionClient,
	params: {
		skuId: string;
		productId: string;
		/** Stock cible saisi dans le formulaire. */
		targetInventory: number;
		/**
		 * Stock affiché à l'ouverture du formulaire (champ caché). Absent ⇒ baseline
		 * = cible ⇒ delta 0 : on préfère ne rien toucher plutôt qu'écraser.
		 */
		originalInventory?: number;
		/** Valeur déjà lue hors verrou, utilisée si le FOR UPDATE ne rend aucune ligne. */
		fallbackInventory: number;
		admin: { id: string; name?: string | null };
	},
): Promise<{ delta: number; previousInventory: number; newInventory: number }> {
	const lockedRows = await tx.$queryRaw<{ inventory: number }[]>`
		SELECT "inventory" FROM "ProductSku" WHERE "id" = ${params.skuId} FOR UPDATE
	`;
	const lockedInventory = lockedRows[0]?.inventory ?? params.fallbackInventory;

	const baselineInventory = params.originalInventory ?? params.targetInventory;
	const delta = params.targetInventory - baselineInventory;
	if (delta === 0) {
		return { delta: 0, previousInventory: lockedInventory, newInventory: lockedInventory };
	}

	const newInventory = lockedInventory + delta;
	if (newInventory < 0) {
		throw new BusinessError(
			"Le stock a changé depuis l'ouverture du formulaire. Rechargez la fiche et réessayez.",
		);
	}

	// Audit inventaire, à parité avec `adjust-sku-stock`. Même transaction que
	// l'`increment` de l'appelant : un rollback emporte les deux.
	await recordStockMovementTx(tx, {
		skuId: params.skuId,
		productId: params.productId,
		previousInventory: lockedInventory,
		newInventory,
		source: StockMovementSource.SKU_UPDATE,
		createdById: params.admin.id,
		createdByName: params.admin.name ?? null,
	});

	return { delta, previousInventory: lockedInventory, newInventory };
}
