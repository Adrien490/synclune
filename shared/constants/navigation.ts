import type { MegaMenuProduct, NavItemWithChildren } from "@/shared/types/navigation.types";
import { ROUTES } from "@/shared/constants/urls";

export type {
	NavItemChild,
	NavItemWithChildren,
	MegaMenuProduct,
} from "@/shared/types/navigation.types";

/**
 * Destinations de premier niveau du menu mobile.
 *
 * ## Ce que le sheet en consomme RÉELLEMENT : deux entrées, par href
 *
 * `MenuSheetNav` ne fait que trois `find(...)` sur cette liste — accueil, « à
 * propos » (absent aujourd'hui) et favoris. Tout le reste de la hiérarchie est
 * rendu par les sections dédiées, qui reçoivent `productTypes` et `collections`
 * **directement en props** du `MenuSheet`.
 *
 * ⚠️ La fonction construisait donc, pour rien, un arbre complet : `children` de
 * « Les créations » (1 + n types) et de « Les collections » (1 + 3 collections
 * avec `description`, `imageUrl`, `blurDataUrl`), plus un item admin « Tableau de
 * bord » que `MenuSheetNav` n'a jamais lu — il rend le sien. Le tout sérialisé
 * dans le payload RSC de CHAQUE page de la boutique, puis jeté à l'arrivée.
 * `menu-sheet.tsx` le disait déjà en toutes lettres : « the children embedded in
 * navItems are not used by the sheet ».
 *
 * Les deux entrées de section survivent parce que la liste est le SSOT des
 * destinations de premier niveau ; `DiscoverSection` y cherche encore
 * `ROUTES.SHOP.ABOUT`, point d'extension documenté dont le retrait a été refusé
 * le 2026-07-26.
 *
 * Note: "Panier" supprimé (redondant avec header)
 * Note: plus d'entrée "Compte" — l'espace client a été retiré (2026-07-31)
 * Note: "L'atelier" retiré temporairement du menu mobile (à réintégrer plus tard)
 */
export function getMobileNavItems(): NavItemWithChildren[] {
	return [
		// 🏠 ACCUEIL - Retour à la page d'accueil
		{ href: ROUTES.SHOP.HOME, label: "Accueil", icon: "home" },

		// 💎 DÉCOUVRIR - Créations en premier. Pas de `children` : la hiérarchie est
		// rendue par `CreationsSection` / `CollectionsSection` depuis leurs propres
		// props.
		{ href: ROUTES.SHOP.PRODUCTS, label: "Les créations", icon: "gem" },
		{ href: ROUTES.SHOP.COLLECTIONS, label: "Les collections", icon: "folder-open" },

		// 🏡 L'ATELIER - Page à propos : retiré temporairement du menu mobile
		// (à réintégrer plus tard). DiscoverSection rend l'item s'il est fourni.

		// 👤 Plus d'item COMPTE (retrait de l'espace client 2026-07-31). Il rendait
		// « Mon compte » → /commandes pour une session, « Se connecter » → /connexion
		// sinon : deux destinations qui n'existent plus pour un client. Le seul accès
		// à une commande passe par le lien de suivi de l'email de confirmation.

		// ❤️ FAVORIS - Accessible à tous (Baymard: full scope label)
		{ href: ROUTES.SHOP.FAVORITES, label: "Mes favoris", icon: "heart" },
	];
}

/**
 * Données pour les mega menus desktop.
 *
 * ⚠️ Plus de `collections` : le seul méga-menu restant est « Les créations ».
 * Le bento Collections a été supprimé le 2026-08-08 (à refaire) — la navbar
 * continue de LIRE les collections (`getNavbarMenuData`), mais uniquement pour
 * la collection vedette du panneau Créations, qu'elle compose elle-même.
 */
type MegaMenuData = {
	productTypes?: Array<{ slug: string; label: string }>;
	featuredProducts?: MegaMenuProduct[];
};

/**
 * Génère les items de navigation desktop avec mega menus
 *
 * @param data - Données pour le mega menu Créations (types de produits)
 * @returns Items de navigation desktop avec children pour mega menus
 */
export function getDesktopNavItems(data: MegaMenuData): NavItemWithChildren[] {
	const { productTypes } = data;
	// Mega menu "Les créations" avec types de produits
	const creationsItem: NavItemWithChildren = {
		href: ROUTES.SHOP.PRODUCTS,
		label: "Les créations",
		icon: "gem",
		hasDropdown: !!(productTypes && productTypes.length > 0),
		dropdownType: "creations",
		children:
			productTypes && productTypes.length > 0
				? [
						{ href: ROUTES.SHOP.PRODUCTS, label: "Toutes les créations", icon: "gem" },
						...productTypes.map((type) => ({
							href: ROUTES.SHOP.PRODUCT_TYPE(type.slug),
							label: type.label,
							// Plus d'`iconKey` : `MegaMenuColumn` n'affiche plus d'icône par
							// catégorie — le mapping ne servait que 3 des 7 familles réelles et
							// désalignait les 4 autres de 26px. Détail du retrait dans le
							// commentaire d'en-tête de `mega-menu-column.tsx`.
						})),
					]
				: undefined,
	};

	// « Les collections » — lien simple, plus de méga-menu.
	//
	// ⚠️ Le bento de cartes a été supprimé le 2026-08-08 avec toutes les surfaces
	// à cartes de collection (à refaire) : sans panneau à ouvrir, `hasDropdown`
	// resterait un piège — `DesktopNav` monterait un `NavigationMenuTrigger` dont
	// le contenu est vide, donc un tap tactile ouvrirait un panneau blanc au lieu
	// de naviguer (la branche `isTouch` fait exprès de ne pas naviguer). L'entrée
	// tombe donc dans la branche « lien simple », et la navigation vers
	// `/collections` reste intacte.
	const collectionsItem: NavItemWithChildren = {
		href: ROUTES.SHOP.COLLECTIONS,
		label: "Les collections",
		icon: "folder-open",
	};

	const items: NavItemWithChildren[] = [creationsItem, collectionsItem];

	return items;
}

// Footer, colonne « La boutique » (labels harmonisés avec le header)
export const footerNavItems = [
	{ href: ROUTES.SHOP.PRODUCTS, label: "Les créations" },
	{ href: ROUTES.SHOP.COLLECTIONS, label: "Les collections" },
	{ href: ROUTES.SHOP.FAVORITES, label: "Mes favoris" },
] as const;

// ⚠️ Plus de `footerHelpNavItems` : la colonne « Écrire à l'atelier » du pied de
// page ouvrait sur « Aide et FAQ » (`/#faq`), retiré le 2026-08-08 avec la
// section FAQ. Il ne reste que l'adresse e-mail, rendue en dur par `Footer`.
// Le libre-service AVANT l'adresse e-mail reste le bon ordre le jour où la FAQ
// revient : une question de délai de livraison se répond seule, un message non.

// Liens légaux — libellés courts, pour tenir en deux colonnes sous `sm` sans
// repasser à la ligne (le bandeau faisait 7 cibles empilées, 308 px).
// WCAG 2.5.3 (Label in Name) : dès que le libellé visible est abrégé, le nom
// accessible DOIT le contenir en tête, puis développer.
export const legalLinks = [
	{ label: "CGV", href: ROUTES.LEGAL.CGV, ariaLabel: "CGV — Conditions Générales de Vente" },
	{ label: "Mentions légales", href: ROUTES.LEGAL.LEGAL_NOTICE },
	{
		label: "Confidentialité",
		href: ROUTES.LEGAL.PRIVACY,
		ariaLabel: "Confidentialité — Politique de confidentialité",
	},
	{ label: "Cookies", href: ROUTES.LEGAL.COOKIES, ariaLabel: "Cookies — Gestion des cookies" },
	{
		label: "Rétractation",
		href: ROUTES.LEGAL.WITHDRAWAL,
		ariaLabel: "Rétractation — Formulaire de rétractation",
	},
	{ label: "Accessibilité", href: ROUTES.LEGAL.ACCESSIBILITY },
	// ⚠️ Ajoutée le 2026-08-06. `/informations-legales` était au sitemap
	// (`app/sitemap.ts`), liée depuis le fil d'Ariane des six autres pages légales,
	// et absente d'ici — donc **inatteignable depuis `/`**, alors que c'est le hub
	// qui porte SIREN, hébergeurs et médiateur. Une page légale indexable qu'aucun
	// lien du site ne désigne depuis l'accueil est exactement le cas qu'un audit
	// de conformité relève.
	{
		label: "Informations légales",
		href: ROUTES.LEGAL.HUB,
		ariaLabel: "Informations légales — toutes les pages légales",
	},
] as const;
