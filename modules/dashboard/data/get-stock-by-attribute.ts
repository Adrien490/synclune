import { prisma } from "@/shared/lib/prisma";
import {
	cacheDashboardStockByColor,
	cacheDashboardStockByMaterial,
} from "../constants/cache";
import type {
	GetStockByColorReturn,
	GetStockByMaterialReturn,
} from "../types/dashboard.types";

// ============================================================================
// STOCK BY COLOR
// ============================================================================

/**
 * Recupere le stock agrege par couleur
 */
export async function fetchStockByColor(): Promise<GetStockByColorReturn> {
	"use cache: remote";

	cacheDashboardStockByColor();

	// Recuperer tous les SKUs actifs avec stock
	const skus = await prisma.productSku.findMany({
		where: {
			isActive: true,
			inventory: { gt: 0 },
		},
		select: {
			inventory: true,
			priceInclTax: true,
			colorId: true,
			color: {
				select: {
					id: true,
					name: true,
					hex: true,
				},
			},
		},
	});

	// Agreger par couleur
	const colorMap = new Map<
		string,
		{
			id: string;
			name: string;
			hex: string;
			totalUnits: number;
			skuCount: number;
			value: number;
		}
	>();

	let uncategorizedUnits = 0;
	let uncategorizedValue = 0;

	for (const sku of skus) {
		const itemValue = sku.inventory * sku.priceInclTax;

		if (!sku.color) {
			uncategorizedUnits += sku.inventory;
			uncategorizedValue += itemValue;
			continue;
		}

		const existing = colorMap.get(sku.color.id);
		if (existing) {
			existing.totalUnits += sku.inventory;
			existing.skuCount += 1;
			existing.value += itemValue;
		} else {
			colorMap.set(sku.color.id, {
				id: sku.color.id,
				name: sku.color.name,
				hex: sku.color.hex,
				totalUnits: sku.inventory,
				skuCount: 1,
				value: itemValue,
			});
		}
	}

	// Convertir et trier par stock decroissant
	const colors = Array.from(colorMap.values()).sort(
		(a, b) => b.totalUnits - a.totalUnits
	);

	return {
		colors,
		uncategorized: {
			totalUnits: uncategorizedUnits,
			value: uncategorizedValue,
		},
	};
}

// ============================================================================
// STOCK BY MATERIAL
// ============================================================================

/**
 * Recupere le stock agrege par materiau
 */
export async function fetchStockByMaterial(): Promise<GetStockByMaterialReturn> {
	"use cache: remote";

	cacheDashboardStockByMaterial();

	// Recuperer tous les SKUs actifs avec stock
	const skus = await prisma.productSku.findMany({
		where: {
			isActive: true,
			inventory: { gt: 0 },
		},
		select: {
			inventory: true,
			priceInclTax: true,
			materialId: true,
			material: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});

	// Agreger par materiau
	const materialMap = new Map<
		string,
		{
			id: string;
			name: string;
			totalUnits: number;
			skuCount: number;
			value: number;
		}
	>();

	let uncategorizedUnits = 0;
	let uncategorizedValue = 0;

	for (const sku of skus) {
		const itemValue = sku.inventory * sku.priceInclTax;

		if (!sku.material) {
			uncategorizedUnits += sku.inventory;
			uncategorizedValue += itemValue;
			continue;
		}

		const existing = materialMap.get(sku.material.id);
		if (existing) {
			existing.totalUnits += sku.inventory;
			existing.skuCount += 1;
			existing.value += itemValue;
		} else {
			materialMap.set(sku.material.id, {
				id: sku.material.id,
				name: sku.material.name,
				totalUnits: sku.inventory,
				skuCount: 1,
				value: itemValue,
			});
		}
	}

	// Convertir et trier par stock decroissant
	const materials = Array.from(materialMap.values()).sort(
		(a, b) => b.totalUnits - a.totalUnits
	);

	return {
		materials,
		uncategorized: {
			totalUnits: uncategorizedUnits,
			value: uncategorizedValue,
		},
	};
}
