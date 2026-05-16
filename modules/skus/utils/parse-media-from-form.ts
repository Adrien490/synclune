/**
 * Types et utilitaires pour parser les medias depuis FormData
 */

import { BusinessError } from "@/shared/lib/actions";
import { logger } from "@/shared/lib/logger";
import type { ParsedMedia } from "../types/sku.types";

/**
 * Parse un tableau de médias unifié depuis FormData
 * (premier item = principal, ordre = position).
 *
 * Les médias sont envoyés en JSON string dans un champ hidden.
 *
 * @param formData - FormData du formulaire
 * @param fieldName - Nom du champ (defaut: "media")
 * @returns Le tableau de médias parsés (vide si erreur silencieuse)
 */
export function parseMediaFromForm(formData: FormData, fieldName = "media"): ParsedMedia[] {
	const raw = formData.get(fieldName);

	if (!raw || typeof raw !== "string" || raw.trim() === "") {
		return [];
	}

	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			logger.warn("Invalid media: not an array", { service: "parse-media-from-form" });
			return [];
		}
		return (parsed as unknown[]).filter(
			(item): item is ParsedMedia =>
				item !== null &&
				item !== undefined &&
				typeof item === "object" &&
				"url" in item &&
				typeof (item as Record<string, unknown>).url === "string",
		);
	} catch (error) {
		logger.error("Error parsing media", error, { service: "parse-media-from-form" });
		return [];
	}
}

/**
 * Variante stricte : throw BusinessError au lieu de retourner [] quand le JSON
 * est invalide. À utiliser dans les actions/ pour propager une vraie erreur de
 * validation à l'utilisateur (pas un succès silencieux avec galerie tronquée).
 *
 * Le champ absent/vide reste valide (retour []).
 */
export function parseMediaFromFormStrict(formData: FormData, fieldName = "media"): ParsedMedia[] {
	const raw = formData.get(fieldName);
	if (!raw || typeof raw !== "string" || raw.trim() === "") {
		return [];
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		logger.error("Error parsing media", error, { service: "parse-media-from-form" });
		throw new BusinessError("Médias: format invalide. Veuillez relancer les uploads.");
	}
	if (!Array.isArray(parsed)) {
		throw new BusinessError("Médias: structure invalide. Veuillez relancer les uploads.");
	}
	return (parsed as unknown[]).filter(
		(item): item is ParsedMedia =>
			item !== null &&
			item !== undefined &&
			typeof item === "object" &&
			"url" in item &&
			typeof (item as Record<string, unknown>).url === "string",
	);
}
