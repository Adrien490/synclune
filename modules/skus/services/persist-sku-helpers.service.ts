/**
 * Helpers transactionnels partagés entre create-sku et update-sku.
 *
 * Exception layering documentée : ce service contient des reads transactionnels
 * (validation existence color/material + uniqueness check) appelés depuis 2 actions
 * mutations. Atomicité requise (read-then-write dans la même transaction).
 *
 * Cf. `docs/audit/01-conventions.md` § Services transactionnels partagés.
 */

import type { Prisma } from "@/app/generated/prisma/client";
import { BusinessError } from "@/shared/lib/actions";
import { detectMediaType } from "@/modules/media/utils/media-type-detection";
import type { ParsedMedia } from "../types/sku.types";

// ============================================================================
// TYPES
// ============================================================================

export type SkuMediaInput = {
	url: string;
	thumbnailUrl?: string | null;
	blurDataUrl?: string | null;
	altText?: string | null;
	mediaType?: "IMAGE" | "VIDEO";
	/** Dimensions intrinsèques lues à l'upload (NULL si illisibles ou média legacy) */
	width?: number | null;
	height?: number | null;
	isPrimary: boolean;
	position: number;
};

export type NormalizedOptionalRefs = {
	/** Couleurs M2M ordonnées (1re = principale). Vide = aucune couleur renseignée. */
	colorIds: string[];
	/** Matériaux M2M ordonnés (1er = principal). Vide = aucun matériau renseigné. */
	materialIds: string[];
	size: string | null;
};

// ============================================================================
// NORMALIZE
// ============================================================================

/**
 * Normalise les FK optionnelles + size en `null` (Zod transforme déjà empty string
 * en undefined, ce helper aplatit `undefined → null` pour Prisma).
 *
 * `colorIds` et `materialIds` sont dédupliqués (préserve l'ordre saisi : 1er = principal).
 */
export function normalizeOptionalRefs(input: {
	colorIds?: string[];
	materialIds?: string[];
	size?: string;
}): NormalizedOptionalRefs {
	// Trim défensif (Zod trim déjà en amont) ; blancs-seuls → null comme absent.
	const trimmedSize = input.size?.trim();
	return {
		colorIds: input.colorIds ? Array.from(new Set(input.colorIds)) : [],
		materialIds: input.materialIds ? Array.from(new Set(input.materialIds)) : [],
		size: trimmedSize === undefined || trimmedSize === "" ? null : trimmedSize,
	};
}

/**
 * Convertit un prix en euros (number) vers centimes entiers.
 */
export function eurosToCents(euros: number): number {
	return Math.round(euros * 100);
}

/**
 * Convertit un prix optionnel en euros vers centimes (null si absent).
 */
export function optionalEurosToCents(euros: number | undefined): number | null {
	if (!euros) return null;
	return Math.round(euros * 100);
}

// ============================================================================
// MEDIA NORMALIZATION
// ============================================================================

/**
 * Normalise un tableau unifié `media[]` issu du formulaire en SkuMediaInput[]
 * prêts pour persistance : premier item = principal (isPrimary, position 0),
 * suivants en galerie ordonnée (position 1..n).
 *
 * Le mediaType du premier item est forcé à IMAGE — le schema Zod l'a déjà
 * validé (refineFirstMediaNotVideo) mais on garde le filet pour les chemins
 * non-validés (jamais en pratique côté actions).
 */
export function normalizeMediaForPersistence(media: ParsedMedia[]): SkuMediaInput[] {
	return media.map((m, index) => ({
		url: m.url,
		thumbnailUrl: m.thumbnailUrl,
		blurDataUrl: m.blurDataUrl,
		altText: m.altText,
		mediaType: index === 0 ? "IMAGE" : m.mediaType,
		width: m.width,
		height: m.height,
		isPrimary: index === 0,
		position: index,
	}));
}

/**
 * Convertit SkuMediaInput[] en payload `skuMedia.createMany` data.
 * Résout `mediaType` via detection si non fourni.
 */
export function toSkuMediaCreatePayload(skuId: string, media: SkuMediaInput[]) {
	return media.map((m) => ({
		skuId,
		url: m.url,
		thumbnailUrl: m.thumbnailUrl ?? null,
		blurDataUrl: m.blurDataUrl ?? null,
		altText: m.altText ?? null,
		mediaType: m.mediaType ?? detectMediaType(m.url),
		width: m.width ?? null,
		height: m.height ?? null,
		isPrimary: m.isPrimary,
		position: m.position,
	}));
}

// ============================================================================
// TRANSACTIONAL VALIDATIONS
// ============================================================================

/**
 * Vérifie l'existence des couleurs M2M dans la transaction. Throw BusinessError
 * si au moins un ID est manquant en base.
 */
export async function assertColorsExist(
	tx: Prisma.TransactionClient,
	colorIds: string[],
): Promise<void> {
	if (colorIds.length === 0) return;
	const colors = await tx.color.findMany({
		where: { id: { in: colorIds } },
		select: { id: true },
	});
	if (colors.length !== colorIds.length) {
		throw new BusinessError("Une ou plusieurs couleurs spécifiées n'existent pas.");
	}
}

/**
 * Vérifie l'existence des matériaux M2M dans la transaction. Throw BusinessError
 * si au moins un ID est manquant en base.
 */
export async function assertMaterialsExist(
	tx: Prisma.TransactionClient,
	materialIds: string[],
): Promise<void> {
	if (materialIds.length === 0) return;
	const materials = await tx.material.findMany({
		where: { id: { in: materialIds } },
		select: { id: true },
	});
	if (materials.length !== materialIds.length) {
		throw new BusinessError("Un ou plusieurs matériaux spécifiés n'existent pas.");
	}
}

/**
 * Offset de l'advisory lock sérialisant les writers de « variant identity » d'un
 * même produit (create/update/restore SKU). Clé bigint `offset + hashtext(productId)` :
 * hashtext couvre ±2,15e9, donc la plage [6,85e9 ; 11,15e9] est DISJOINTE de celle
 * d'`ORDER_PAID_LOCK_OFFSET` (4e9 ± 2,15e9) et des clés facture/avoir (~1-2e6).
 */
const VARIANT_IDENTITY_LOCK_OFFSET = 9_000_000_000;

/**
 * Vérifie l'unicité de la combinaison (productId, ensemble exact de colorIds, size)
 * dans la transaction. Depuis la migration M2M couleurs (2026-05-15), `colorId` n'est
 * plus un discriminateur DB unique — la « variant identity » se compose désormais
 * de l'ensemble de couleurs (en jeu) + taille, validée au niveau applicatif.
 *
 * SSOT identité de variante :
 * - Deux SKUs sont identiques quand ils partagent EXACTEMENT le même set de couleurs
 *   (ordre indifférent) ET la même taille (comparaison insensible à la casse) pour le
 *   même produit.
 * - Les MATÉRIAUX ne font délibérément PAS partie de l'identité (attribut descriptif,
 *   pas un axe de variante) — deux SKUs ne différant que par le matériau sont refusés.
 *   Décision inverse = ajouter `materialIds` ici + adapter le sélecteur storefront.
 * - Exception connue : `duplicateSku` crée sciemment un jumeau d'identité (inactif,
 *   stock 0, destiné à être édité) sans passer par cette garde.
 *
 * Le check est read-then-write sans index DB (impossible sur des M2M) : un advisory
 * lock transactionnel par produit sérialise les writers concurrents (deux créations
 * simultanées de la même combinaison, create vs restore, etc.). Relâché au
 * commit/rollback. Si excludeSkuId fourni (cas update), l'exclut de la recherche.
 */
export async function assertUniqueVariantCombination(
	tx: Prisma.TransactionClient,
	params: {
		productId: string;
		colorIds: string[];
		size: string | null;
		excludeSkuId?: string;
	},
): Promise<void> {
	await tx.$queryRaw`SELECT pg_advisory_xact_lock(${VARIANT_IDENTITY_LOCK_OFFSET}::bigint + hashtext(${params.productId}))`;

	// Récupère tous les SKUs actifs du produit avec la même taille
	const candidateSkus = await tx.productSku.findMany({
		where: {
			productId: params.productId,
			size: params.size === null ? null : { equals: params.size, mode: "insensitive" },
			deletedAt: null,
			...(params.excludeSkuId ? { NOT: { id: params.excludeSkuId } } : {}),
		},
		select: {
			id: true,
			sku: true,
			colors: { select: { colorId: true } },
		},
	});

	const targetSet = new Set(params.colorIds);
	const collision = candidateSkus.find((s) => {
		if (s.colors.length !== targetSet.size) return false;
		return s.colors.every((c) => targetSet.has(c.colorId));
	});

	if (collision) {
		const variantDetails = [
			params.colorIds.length > 0
				? `${params.colorIds.length === 1 ? "couleur" : "couleurs"} spécifiée${params.colorIds.length > 1 ? "s" : ""}`
				: null,
			params.size ? `taille "${params.size}"` : null,
		]
			.filter(Boolean)
			.join(", ");

		throw new BusinessError(
			`Cette combinaison de variantes${variantDetails ? ` (${variantDetails})` : ""} existe déjà pour ce produit (Réf: ${collision.sku}). Veuillez modifier au moins une variante.`,
		);
	}
}

/**
 * Désactive le flag `isDefault` sur tous les autres SKUs du produit (transaction).
 * Si `excludeSkuId` fourni (cas update), il est exclus de l'opération.
 */
export async function unsetOtherDefaultSkus(
	tx: Prisma.TransactionClient,
	productId: string,
	excludeSkuId?: string,
): Promise<void> {
	await tx.productSku.updateMany({
		where: {
			productId,
			isDefault: true,
			...(excludeSkuId ? { NOT: { id: excludeSkuId } } : {}),
		},
		data: { isDefault: false },
	});
}
