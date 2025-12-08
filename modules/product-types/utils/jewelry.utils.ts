/**
 * Utilitaires pour les types de bijoux
 */

import type { JewelryTypeConfig, JewelrySubType } from "../types/jewelry.types";
import {
	JEWELRY_TYPES,
	SYNCLUNE_JEWELRY_TYPES,
} from "../constants/jewelry-types.constants";

/**
 * Récupère la configuration d'un type de bijou (ancienne API pour compatibilité)
 */
export const getJewelryTypeConfig = (
	typeSlug: string
): JewelryTypeConfig | undefined => {
	return JEWELRY_TYPES[typeSlug];
};

/**
 * Récupère le label français d'un type de bijou (ancienne API pour compatibilité)
 */
export const getJewelryTypeLabel = (typeSlug: string): string => {
	return JEWELRY_TYPES[typeSlug]?.label || "Type inconnu";
};

/**
 * Récupère tous les types de bijoux sous forme de tableau (utilise la nouvelle liste Synclune)
 */
export const getAllJewelryTypes = (): JewelryTypeConfig[] => {
	return SYNCLUNE_JEWELRY_TYPES;
};

/**
 * Récupère un type de bijou par sa clé (nouvelle API)
 */
export const getJewelryTypeByKey = (
	key: string
): JewelryTypeConfig | undefined => {
	return SYNCLUNE_JEWELRY_TYPES.find((type) => type.key === key);
};

/**
 * Récupère tous les sous-types d'un type de bijou
 */
export const getJewelrySubTypes = (typeKey: string): JewelrySubType[] => {
	const type = getJewelryTypeByKey(typeKey);
	return type?.subTypes || [];
};
