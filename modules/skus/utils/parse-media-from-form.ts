/**
 * Types et utilitaires pour parser les medias depuis FormData
 */

import { logger } from "@/shared/lib/logger";
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
	fieldName = "primaryImage",
): ParsedMedia | undefined {
	const raw = formData.get(fieldName);

	if (!raw || typeof raw !== "string" || raw.trim() === "") {
		return undefined;
	}

	try {
		const parsed: unknown = JSON.parse(raw);
		// Validation basique de la structure
		if (
			parsed &&
			typeof parsed === "object" &&
			"url" in parsed &&
			typeof (parsed as Record<string, unknown>).url === "string"
		) {
			return parsed as ParsedMedia;
		}
		logger.warn("Invalid primaryImage: incorrect structure", { service: "parse-media-from-form" });
		return undefined;
	} catch (error) {
		logger.error("Error parsing primaryImage", error, { service: "parse-media-from-form" });
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
	fieldName = "galleryMedia",
): ParsedMedia[] {
	const raw = formData.get(fieldName);

	if (!raw || typeof raw !== "string" || raw.trim() === "") {
		return [];
	}

	try {
		const parsed: unknown = JSON.parse(raw);
		// Validation basique: doit etre un tableau
		if (!Array.isArray(parsed)) {
			logger.warn("Invalid galleryMedia: not an array", { service: "parse-media-from-form" });
			return [];
		}
		// Filtrer les elements invalides
		return (parsed as unknown[]).filter(
			(item): item is ParsedMedia =>
				item !== null &&
				item !== undefined &&
				typeof item === "object" &&
				"url" in item &&
				typeof (item as Record<string, unknown>).url === "string",
		);
	} catch (error) {
		logger.error("Error parsing galleryMedia", error, { service: "parse-media-from-form" });
		return [];
	}
}
