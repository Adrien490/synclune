/**
 * Utilitaire pour générer les breadcrumbs JSON-LD structurés (version simplifiée)
 * Améliore le SEO en affichant les fils d'Ariane dans les résultats de recherche
 *
 * Stratégie simplifiée : UN SEUL chemin canonique pour éviter complexité excessive
 * Selon recommandations Blue Nile/Pandora : chemins clairs sans multiplication
 */

import { SITE_URL } from "@/shared/constants/seo-config";

export interface BreadcrumbItem {
	name: string;
	url: string;
}

/**
 * Génère le JSON-LD pour les breadcrumbs selon schema.org
 */
export function generateBreadcrumbsSchema(items: BreadcrumbItem[]) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			item: `${SITE_URL}${item.url}`,
		})),
	};
}

/**
 * Génère UN SEUL chemin de breadcrumbs simple pour une page produit
 * Pattern canonique : Accueil > Créations > [Type] > Produit
 *
 * Simplicité over complexité : pas de collections multiples dans le fil
 */
export function generateProductBreadcrumbs(
	productName: string,
	productSlug: string,
	typeName?: string,
	typeSlug?: string
): BreadcrumbItem[] {
	const breadcrumbs: BreadcrumbItem[] = [
		{ name: "Accueil", url: "/" },
		{ name: "Créations", url: "/products" },
	];

	// Ajouter le type de produit (catégorie primaire)
	if (typeName && typeSlug) {
		breadcrumbs.push({
			name: typeName,
			url: `/products?type=${typeSlug}`,
		});
	}

	// Produit final
	breadcrumbs.push({
		name: productName,
		url: `/products/${productSlug}`,
	});

	return breadcrumbs;
}

/**
 * Génère les breadcrumbs simples pour une page collection
 * Pattern : Accueil > Collections > [Nom Collection]
 */
export function generateCollectionBreadcrumbs(
	collectionName: string,
	collectionSlug: string
): BreadcrumbItem[] {
	return [
		{ name: "Accueil", url: "/" },
		{ name: "Collections", url: "/collections" },
		{ name: collectionName, url: `/collections/${collectionSlug}` },
	];
}
