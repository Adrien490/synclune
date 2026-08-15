import { cacheLife, cacheTag } from "next/cache";
import { COLORS_CACHE_TAGS } from "@/modules/colors/constants/cache";
import { MATERIALS_CACHE_TAGS } from "@/modules/materials/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { slugify } from "@/shared/utils/generate-slug";

/**
 * Résout les valeurs de filtre `?color=` / `?material=` (des NOMS slugifiés —
 * l'identité URL depuis le schéma lean) vers les NOMS en base, seuls
 * exploitables en SQL.
 *
 * 🐛 Bug corrigé (débusqué par `shop-desktop-filters.spec.ts` au lot 7) : les
 * sections de filtres écrivaient `slugify(color.name)` dans l'URL
 * (`?color=bleu-nuit`) mais `buildProductFilterConditions` comparait
 * `name in [...]` — toute couleur ou matériau MULTI-MOTS rendait « 0 pièce »
 * alors que la facette annonçait un compte. SQL ne sait pas slugifier : la
 * résolution se fait ici, en amont du query builder, sur des référentiels
 * minuscules et cachés (profil `reference`).
 */
async function fetchTaxonomySlugMaps(): Promise<{
	colors: Record<string, string>;
	materials: Record<string, string>;
}> {
	"use cache";
	cacheLife("reference");
	cacheTag(COLORS_CACHE_TAGS.LIST);
	cacheTag(MATERIALS_CACHE_TAGS.LIST);

	const [colors, materials] = await Promise.all([
		prisma.color.findMany({ select: { name: true } }),
		prisma.material.findMany({ select: { name: true } }),
	]);

	return {
		colors: Object.fromEntries(colors.map((color) => [slugify(color.name), color.name])),
		materials: Object.fromEntries(
			materials.map((material) => [slugify(material.name), material.name]),
		),
	};
}

function resolveValues(value: string | string[], map: Record<string, string>): string | string[] {
	// Repli sur la valeur brute : tolérant à un nom passé tel quel.
	const resolve = (entry: string) => map[entry] ?? entry;
	return Array.isArray(value) ? value.map(resolve) : resolve(value);
}

export async function resolveTaxonomyFilterSlugs<
	T extends { color?: string | string[]; material?: string | string[] },
>(filters: T | undefined): Promise<T | undefined> {
	if (!filters || (filters.color === undefined && filters.material === undefined)) {
		return filters;
	}

	const maps = await fetchTaxonomySlugMaps();
	return {
		...filters,
		...(filters.color !== undefined && { color: resolveValues(filters.color, maps.colors) }),
		...(filters.material !== undefined && {
			material: resolveValues(filters.material, maps.materials),
		}),
	};
}
