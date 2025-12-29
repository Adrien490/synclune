import type { MinimalSession } from "@/shared/types/session.types"
import type { NavItemChild, NavItemWithChildren } from "@/shared/types/navigation.types"

export type {
	NavCategory,
	IconName,
	NavItemChild,
	NavItemWithChildren,
	NavItem,
} from "@/shared/types/navigation.types"

/**
 * Constantes pour limiter les items affichés dans les menus
 */
export const MAX_COLLECTIONS_IN_MENU = 3

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
 * Niveau 1: Les créations, Les collections, Personnalisation
 */
export const desktopNavItems = [
	{ href: "/produits", label: "Les créations", icon: "gem" },
	{
		href: "/collections",
		label: "Les collections",
		icon: "folder-open",
		hasDropdown: false,
	},
	{ href: "/personnalisation", label: "Personnalisation", icon: "sparkles" },
] as const;

/**
 * Génère les items de navigation mobile en fonction de l'état de connexion
 *
 * Flow optimisé selon les bonnes pratiques bijouterie artisanale:
 *
 * 💎 DÉCOUVRIR (80% des sessions)
 *    → Les créations (collapsible avec types: Bagues, Colliers, etc.)
 *    → Les collections (collapsible avec collections: Mariage, Été 2025, etc.)
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
	session: MinimalSession | null,
	productTypes?: Array<{ slug: string; label: string }>,
	collections?: Array<{ slug: string; label: string; description?: string | null; imageUrl?: string | null; blurDataUrl?: string | null }>,
	isAdmin?: boolean
): NavItemWithChildren[] {
	// Item "Les créations" avec collapsible des types
	const bijouxItem: NavItemWithChildren = {
		href: "/produits",
		label: "Les créations",
		icon: "gem",
		hasDropdown: true,
		children: productTypes
			? [
					{ href: "/produits", label: "Les créations", icon: "gem" },
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
		label: "Les collections",
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
						blurDataUrl: collection.blurDataUrl,
					})),
			  ]
			: COLLECTIONS_MENU_ITEMS, // Fallback sur les collections statiques
	};

	// Flow optimisé: Accueil → Créations → Collections → Meilleures ventes → Personnaliser → Compte → Tableau de bord (admin)
	const items: NavItemWithChildren[] = [
		// 🏠 ACCUEIL - Retour à la page d'accueil
		{ href: "/", label: "Accueil", icon: "home" },

		// 💎 DÉCOUVRIR - Créations en premier
		bijouxItem,
		collectionsItem,

		// ⭐ MEILLEURES VENTES - Social proof
		{ href: "/produits?sortBy=best-selling", label: "Meilleures ventes", icon: "sparkles" },

		// ✨ PERSONNALISER - Service différenciateur
		{ href: "/personnalisation", label: "Personnalisation", icon: "sparkles" },

		// 👤 COMPTE - Gestion utilisateur
		session
			? { href: "/compte", label: "Mon compte", icon: "user" }
			: { href: "/connexion", label: "Se connecter", icon: "log-in" },

		// ❤️ FAVORIS - Accessible à tous
		{ href: "/favoris", label: "Favoris", icon: "heart" },
	];

	// 🛠️ ADMIN - Tableau de bord (uniquement pour les administrateurs)
	if (isAdmin) {
		items.push({ href: "/admin", label: "Tableau de bord", icon: "layout-dashboard" });
	}

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
	{ href: "/produits", label: "Les créations" },
	{ href: "/collections", label: "Les collections" },
	{ href: "/personnalisation", label: "Personnalisation" },
	{ href: "/compte", label: "Mon compte" },
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
