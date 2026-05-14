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
	isPrimary: boolean;
	position: number;
};

export type NormalizedOptionalRefs = {
	colorId: string | null;
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
 * `materialIds` est dédupliqué (préserve l'ordre saisi : 1er = principal).
 */
export function normalizeOptionalRefs(input: {
	colorId?: string;
	materialIds?: string[];
	size?: string;
}): NormalizedOptionalRefs {
	return {
		colorId: input.colorId ?? null,
		materialIds: input.materialIds ? Array.from(new Set(input.materialIds)) : [],
		size: input.size ?? null,
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
// MEDIA COMBINATION
// ============================================================================

/**
 * Fusionne primaryImage + galleryMedia en tableau ordonné position-aware.
 * primary=true à position 0, gallery à partir de position 1.
 */
export function combineSkuMedia(
	primary: ParsedMedia | undefined | null,
	gallery: ParsedMedia[],
): SkuMediaInput[] {
	const all: SkuMediaInput[] = [];
	if (primary) {
		all.push({
			...primary,
			// Force IMAGE type for primary media (validated by Zod schema)
			mediaType: "IMAGE",
			isPrimary: true,
			position: 0,
		});
	}
	all.push(
		...gallery.map((media, index) => ({
			...media,
			isPrimary: false,
			position: index + 1,
		})),
	);
	return all;
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
		isPrimary: m.isPrimary,
		position: m.position,
	}));
}

// ============================================================================
// TRANSACTIONAL VALIDATIONS
// ============================================================================

/**
 * Vérifie l'existence d'une couleur dans la transaction. Throw BusinessError sinon.
 */
export async function assertColorExists(
	tx: Prisma.TransactionClient,
	colorId: string | null,
): Promise<void> {
	if (!colorId) return;
	const color = await tx.color.findUnique({
		where: { id: colorId },
		select: { id: true },
	});
	if (!color) {
		throw new BusinessError("La couleur spécifiée n'existe pas.");
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
 * Vérifie l'unicité de la combinaison (productId, colorId, size) dans la
 * transaction. Depuis la migration M2M matériaux (2026-05-14), `materialId` ne
 * fait plus partie de la « variant identity » DB — les matériaux sont des
 * attributs descriptifs M2M, pas une dimension de variante.
 *
 * Si excludeSkuId fourni (cas update), l'exclut de la recherche.
 *
 * Throw BusinessError avec détail des variantes en conflit si collision détectée.
 * La contrainte unique partial (deletedAt IS NULL, NULLS NOT DISTINCT) au niveau DB
 * sert de filet de sécurité ultime via P2002.
 */
export async function assertUniqueVariantCombination(
	tx: Prisma.TransactionClient,
	params: {
		productId: string;
		colorId: string | null;
		size: string | null;
		excludeSkuId?: string;
	},
): Promise<void> {
	const existingCombination = await tx.productSku.findFirst({
		where: {
			productId: params.productId,
			colorId: params.colorId,
			size: params.size,
			...(params.excludeSkuId ? { NOT: { id: params.excludeSkuId } } : {}),
		},
		select: {
			id: true,
			sku: true,
		},
	});

	if (existingCombination) {
		const variantDetails = [
			params.colorId ? `couleur spécifiée` : null,
			params.size ? `taille "${params.size}"` : null,
		]
			.filter(Boolean)
			.join(", ");

		throw new BusinessError(
			`Cette combinaison de variantes${variantDetails ? ` (${variantDetails})` : ""} existe déjà pour ce produit (Réf: ${existingCombination.sku}). Veuillez modifier au moins une variante.`,
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
