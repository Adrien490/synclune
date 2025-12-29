/**
 * Types et utilitaires pour parser les medias depuis FormData
 */

import type { ParsedMedia } from "../types/sku.types";

export type { ParsedMedia } from "../types/sku.types";

/**
 * Parse une image primaire depuis FormData
 * Les images sont envoyees en JSON string dans un champ hidden
 *
 * @param formData - FormData du formulaire
 * @param fieldName - Nom du champ (defaut: "primaryImage")
 * @returns L'image parsee ou undefined
 */
export function parsePrimaryImageFromForm(
	formData: FormData,
	fieldName = "primaryImage"
): ParsedMedia | undefined {
	const raw = formData.get(fieldName);

	if (!raw || typeof raw !== "string" || raw.trim() === "") {
		return undefined;
	}

	try {
		const parsed = JSON.parse(raw);
		// Validation basique de la structure
		if (parsed && typeof parsed === "object" && typeof parsed.url === "string") {
			return parsed as ParsedMedia;
		}
		console.warn(`[parse-media] primaryImage invalide: structure incorrecte`);
		return undefined;
	} catch (error) {
		console.error(`[parse-media] Erreur parsing primaryImage:`, error);
		return undefined;
	}
}

/**
 * Parse un tableau de medias (galerie) depuis FormData
 * Les medias sont envoyes en JSON string dans un champ hidden
 *
 * @param formData - FormData du formulaire
 * @param fieldName - Nom du champ (defaut: "galleryMedia")
 * @returns Le tableau de medias parses (vide si erreur)
 */
export function parseGalleryMediaFromForm(
	formData: FormData,
	fieldName = "galleryMedia"
): ParsedMedia[] {
	const raw = formData.get(fieldName);

	if (!raw || typeof raw !== "string" || raw.trim() === "") {
		return [];
	}

	try {
		const parsed = JSON.parse(raw);
		// Validation basique: doit etre un tableau
		if (!Array.isArray(parsed)) {
			console.warn(`[parse-media] galleryMedia invalide: n'est pas un tableau`);
			return [];
		}
		// Filtrer les elements invalides
		return parsed.filter(
			(item): item is ParsedMedia =>
				item && typeof item === "object" && typeof item.url === "string"
		);
	} catch (error) {
		console.error(`[parse-media] Erreur parsing galleryMedia:`, error);
		return [];
	}
}
