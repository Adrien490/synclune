import type { Session } from "@/modules/auth/lib/auth";

/**
 * Constantes pour limiter les items affichés dans les menus
 */
export const MAX_COLLECTIONS_IN_MENU = 3;
export const MAX_PRODUCT_TYPES_IN_MENU = 50;

/**
 * Catégories d'items de navigation pour le menu mobile
 */
export type NavCategory = "discovery" | "transaction";

/**
 * Navigation constants - Restructuré selon les recommandations Nielsen Norman Group
 *
 * Principes appliqués:
 * - Navigation desktop visible (pas de hamburger sur desktop)
 * - 3 clics maximum pour atteindre un produit
 * - Hiérarchie claire avec accordéons pour les sous-catégories
 * - Icônes + labels pour meilleure compréhension
 * - Personnalisation en évidence (différenciateur artisan)
 */

// Types d'icônes disponibles (mapping côté client)
export type IconName =
	| "home"
	| "gem"
	| "sparkles"
	| "shopping-cart"
	| "user"
	| "folder-open"
	| "heart"
	| "log-in"
	| "info"
	| "layout-dashboard";

// Types pour la navigation
export type NavItemChild = {
	href: string;
	label: string;
	badge?: string | number;
	icon?: IconName;
	description?: string | null;
	imageUrl?: string | null;
};

export type NavItemWithChildren = {
	href: string;
	label: string;
	children?: NavItemChild[];
	icon?: IconName;
	/**
	 * Pour desktop: si true, affiche un dropdown au hover
	 * Pour mobile: si true, affiche un collapsible
	 */
	hasDropdown?: boolean;
};

export type NavItem = {
	href: string;
	label: string;
	icon?: IconName;
};

/**
 * Collections disponibles - À synchroniser avec votre base de données
 * Structure permettant d'afficher les collections dans les menus dropdown/collapsible
 */
export const COLLECTIONS_MENU_ITEMS: NavItemChild[] = [
	{ href: "/collections", label: "Toutes les collections", icon: "folder-open" },
	// Exemples - À remplacer par vos vraies collections dynamiques
	{ href: "/collections/nouveautes", label: "Nouveautés" },
	{ href: "/collections/ete-2025", label: "Collection Été 2025" },
	{ href: "/collections/mariage", label: "Collection Mariage" },
	{ href: "/collections/minimaliste", label: "Collection Minimaliste" },
] as const;

/**
 * Navigation desktop - Toujours visible sur écran ≥1024px
 *
 * Structure optimisée pour bijouterie artisanale:
 * Niveau 1: Collections (storytelling first), Mes créations, Personnaliser, L'atelier
 */
export const desktopNavItems = [
	{
		href: "/collections",
		label: "Collections",
		icon: "folder-open",
		hasDropdown: false,
	},
	{ href: "/produits", label: "Mes créations", icon: "gem" },
	{ href: "/personnalisation", label: "Personnaliser", icon: "sparkles" },
	{ href: "/a-propos", label: "L'atelier", icon: "info" },
] as const;

/**
 * Génère les items de navigation mobile en fonction de l'état de connexion
 *
 * Flow optimisé selon les bonnes pratiques bijouterie artisanale:
 *
 * 💎 DÉCOUVRIR (storytelling first - 80% des sessions)
 *    → Collections (collapsible avec collections: Mariage, Été 2025, etc.)
 *    → Mes créations (collapsible avec types: Bagues, Colliers, etc.)
 *    → Personnaliser (service différenciateur)
 *
 * ─────────────
 * 👤 COMPTE (gestion utilisateur)
 *    → Mon compte / Se connecter
 *    → Tableau de bord (si admin)
 *
 * 📖 EN SAVOIR PLUS (découverte de l'atelier)
 *    → L'atelier
 *
 * Note: "Panier" supprimé (redondant avec header)
 *
 * @param session - Session de l'utilisateur (null si non connecté)
 * @param productTypes - Types de produits actifs
 * @param collections - Collections actives (optionnel)
 * @param isAdmin - Si l'utilisateur est administrateur
 * @returns Items de navigation filtrés et adaptés avec support des children
 */
export function getMobileNavItems(
	session: Session | null,
	productTypes?: Array<{ slug: string; label: string }>,
	collections?: Array<{ slug: string; label: string; description?: string | null; imageUrl?: string | null }>,
	isAdmin?: boolean
): NavItemWithChildren[] {
	// Item "Mes créations" avec collapsible des types
	const bijouxItem: NavItemWithChildren = {
		href: "/produits",
		label: "Mes créations",
		icon: "gem",
		hasDropdown: true,
		children: productTypes
			? [
					{ href: "/produits", label: "Mes créations", icon: "gem" },
					...productTypes.map((type) => ({
						href: `/produits/${type.slug}`,
						label: type.label,
					})),
			  ]
			: undefined,
	};

	// Item "Collections" avec collapsible des collections (limité aux 3 dernières)
	const collectionsItem: NavItemWithChildren = {
		href: "/collections",
		label: "Collections",
		icon: "folder-open",
		hasDropdown: true,
		children: collections
			? [
					{
						href: "/collections",
						label: "Toutes les collections",
						icon: "folder-open",
					},
					...collections.slice(0, MAX_COLLECTIONS_IN_MENU).map((collection) => ({
						href: `/collections/${collection.slug}`,
						label: collection.label,
						description: collection.description,
						imageUrl: collection.imageUrl,
					})),
			  ]
			: COLLECTIONS_MENU_ITEMS, // Fallback sur les collections statiques
	};

	// Flow optimisé: Accueil → Collections → Bijoux → Personnaliser → Compte → Tableau de bord (admin) → L'atelier
	const items: NavItemWithChildren[] = [
		// 🏠 ACCUEIL - Retour à la page d'accueil
		{ href: "/", label: "Accueil", icon: "home" },

		// 💎 DÉCOUVRIR - Storytelling first (Collections avant Bijoux)
		collectionsItem,
		bijouxItem,

		// ✨ PERSONNALISER - Service différenciateur
		{ href: "/personnalisation", label: "Personnaliser", icon: "sparkles" },

		// 👤 COMPTE - Gestion utilisateur
		session
			? { href: "/compte", label: "Mon compte", icon: "user" }
			: { href: "/connexion", label: "Se connecter", icon: "log-in" },
	];

	// 🛠️ ADMIN - Tableau de bord (uniquement pour les administrateurs)
	if (isAdmin) {
		items.push({ href: "/admin", label: "Tableau de bord", icon: "layout-dashboard" });
	}

	// 📖 EN SAVOIR PLUS - Découverte de l'atelier
	items.push({ href: "/a-propos", label: "L'atelier", icon: "info" });

	return items;
}

/**
 * Génère les items de navigation desktop
 *
 * @returns Items de navigation desktop
 */
export function getDesktopNavItems(): NavItemWithChildren[] {
	return desktopNavItems as unknown as NavItemWithChildren[];
}

// Footer - Navigation simple (labels harmonisés avec le header)
export const footerNavItems = [
	{ href: "/collections", label: "Collections" },
	{ href: "/produits", label: "Mes créations" },
	{ href: "/personnalisation", label: "Personnaliser" },
	{ href: "/a-propos", label: "L'atelier" },
	{ href: "/compte", label: "Mon compte" },
	{ href: "/panier", label: "Panier" },
] as const;

// Liens légaux
export const legalLinks = [
	{ label: "CGV", href: "/cgv" },
	{ label: "Mentions légales", href: "/mentions-legales" },
	{ label: "Politique de confidentialité", href: "/confidentialite" },
	{ label: "Gestion des cookies", href: "/cookies" },
	{ label: "Formulaire de rétractation", href: "/retractation" },
	{ label: "Accessibilité", href: "/accessibilite" },
] as const;
