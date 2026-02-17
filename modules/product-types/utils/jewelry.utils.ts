/**
 * Utility functions for jewelry types lookups
 */

import type { JewelryTypeConfig, JewelrySubType } from "../types/jewelry.types";
import {
	JEWELRY_TYPES,
	SYNCLUNE_JEWELRY_TYPES,
} from "../constants/jewelry-types.constants";

/**
 * Get the config for a jewelry type by slug
 */
export const getJewelryTypeConfig = (
	typeSlug: string
): JewelryTypeConfig | undefined => {
	return JEWELRY_TYPES[typeSlug];
};

/**
 * Get the French label for a jewelry type by slug
 */
export const getJewelryTypeLabel = (typeSlug: string): string => {
	return JEWELRY_TYPES[typeSlug]?.label || "Type inconnu";
};

/**
 * Get all Synclune jewelry types as an array
 */
export const getAllJewelryTypes = (): JewelryTypeConfig[] => {
	return SYNCLUNE_JEWELRY_TYPES;
};

/**
 * Get a jewelry type by its key
 */
export const getJewelryTypeByKey = (
	key: string
): JewelryTypeConfig | undefined => {
	return SYNCLUNE_JEWELRY_TYPES.find((type) => type.key === key);
};

/**
 * Get all sub-types for a jewelry type
 */
export const getJewelrySubTypes = (typeKey: string): JewelrySubType[] => {
	const type = getJewelryTypeByKey(typeKey);
	return type?.subTypes || [];
};
