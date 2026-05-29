import { type Prisma, StockMovementSource } from "@/app/generated/prisma/client";

/**
 * Paramètres d'enregistrement d'un mouvement de stock (audit append-only).
 * `delta` est dérivé : `newInventory - previousInventory`.
 */
export interface RecordStockMovementParams {
	skuId: string;
	productId: string;
	previousInventory: number;
	newInventory: number;
	reason?: string | null;
	source?: StockMovementSource;
	createdById?: string | null;
	createdByName?: string | null;
}

/**
 * Écrit une entrée d'audit `StockMovement` DANS une transaction Prisma.
 *
 * À utiliser à l'intérieur d'un `prisma.$transaction` pour garantir l'atomicité
 * avec la mutation d'inventaire (cf. `createOrderAuditTx`, `modules/orders/utils/order-audit.ts`).
 * Le modèle est immuable (pas d'update/delete) — Art. L123-22.
 */
export async function recordStockMovementTx(
	tx: Prisma.TransactionClient,
	params: RecordStockMovementParams,
): Promise<void> {
	await tx.stockMovement.create({
		data: {
			skuId: params.skuId,
			productId: params.productId,
			previousInventory: params.previousInventory,
			newInventory: params.newInventory,
			delta: params.newInventory - params.previousInventory,
			reason: params.reason ?? null,
			source: params.source ?? StockMovementSource.MANUAL_ADJUST,
			createdById: params.createdById ?? null,
			createdByName: params.createdByName ?? null,
		},
	});
}
