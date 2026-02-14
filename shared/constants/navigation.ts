import type { MinimalSession } from "@/shared/types/session.types"
import type { MegaMenuProduct, NavItemChild, NavItemWithChildren } from "@/shared/types/navigation.types"
import { ROUTES } from "@/shared/constants/urls"

export type {
	NavCategory,
	IconName,
	NavItemChild,
	NavItemWithChildren,
	NavItem,
	MegaMenuProduct,
} from "@/shared/types/navigation.types"

/**
 * Constantes pour limiter les items affichés dans les menus
 */
export const MAX_COLLECTIONS_IN_MENU = 3


/**
 * Navigation desktop - Toujours visible sur écran ≥1024px
 *
 * Structure optimisée pour bijouterie artisanale:
 * Niveau 1: Les créations (mega menu), Les collections (mega menu), Personnalisation
 */
export const desktopNavItems = [
	{ href: ROUTES.SHOP.PRODUCTS, label: "Les créations", icon: "gem", hasDropdown: true },
	{ href: ROUTES.SHOP.COLLECTIONS, label: "Les collections", icon: "folder-open", hasDropdown: true },
	{ href: ROUTES.SHOP.CUSTOMIZATION, label: "Personnalisation", icon: "sparkles" },
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
		href: ROUTES.SHOP.PRODUCTS,
		label: "Les créations",
		icon: "gem",
		hasDropdown: true,
		children: productTypes
			? [
					{ href: ROUTES.SHOP.PRODUCTS, label: "Les créations", icon: "gem" },
					...productTypes.map((type) => ({
						href: ROUTES.SHOP.PRODUCT_TYPE(type.slug),
						label: type.label,
					})),
			  ]
			: undefined,
	};

	// Item "Collections" avec collapsible des collections (limité aux 3 dernières)
	const collectionsItem: NavItemWithChildren = {
		href: ROUTES.SHOP.COLLECTIONS,
		label: "Les collections",
		icon: "folder-open",
		hasDropdown: true,
		children: collections
			? [
					{
						href: ROUTES.SHOP.COLLECTIONS,
						label: "Toutes les collections",
						icon: "folder-open",
					},
					...collections.slice(0, MAX_COLLECTIONS_IN_MENU).map((collection) => ({
						href: ROUTES.SHOP.COLLECTION(collection.slug),
						label: collection.label,
						description: collection.description,
						imageUrl: collection.imageUrl,
						blurDataUrl: collection.blurDataUrl,
					})),
			  ]
			: undefined,
	};

	// Flow optimisé: Accueil → Créations → Collections → Personnaliser → Compte → Tableau de bord (admin)
	const items: NavItemWithChildren[] = [
		// 🏠 ACCUEIL - Retour à la page d'accueil
		{ href: ROUTES.SHOP.HOME, label: "Accueil", icon: "home" },

		// 💎 DÉCOUVRIR - Créations en premier
		bijouxItem,
		collectionsItem,

		// ✨ PERSONNALISER - Service différenciateur
		{ href: ROUTES.SHOP.CUSTOMIZATION, label: "Personnalisation", icon: "sparkles" },

		// 👤 COMPTE - Gestion utilisateur
		session
			? { href: ROUTES.ACCOUNT.ROOT, label: "Mon compte", icon: "user" }
			: { href: ROUTES.AUTH.SIGN_IN, label: "Se connecter", icon: "log-in" },

		// ❤️ FAVORIS - Accessible à tous (Baymard: full scope label)
		{ href: ROUTES.ACCOUNT.FAVORITES, label: "Mes favoris", icon: "heart" },
	];

	// 🛠️ ADMIN - Tableau de bord (uniquement pour les administrateurs)
	if (isAdmin) {
		items.push({ href: ROUTES.ADMIN.ROOT, label: "Tableau de bord", icon: "layout-dashboard" });
	}

	return items;
}

/** Type pour les images de collections dans le mega menu */
type CollectionImage = {
	url: string;
	blurDataUrl: string | null;
	alt: string | null;
};

/** Type pour les collections dans le mega menu */
export type MegaMenuCollection = {
	slug: string;
	label: string;
	description?: string | null;
	createdAt?: Date;
	images: CollectionImage[];
};

/** Données pour les mega menus desktop */
export type MegaMenuData = {
	productTypes?: Array<{ slug: string; label: string }>;
	collections?: MegaMenuCollection[];
	featuredProducts?: MegaMenuProduct[];
};

/**
 * Génère les items de navigation desktop avec mega menus
 *
 * @param data - Données pour les mega menus (types, collections)
 * @returns Items de navigation desktop avec children pour mega menus
 */
export function getDesktopNavItems(data: MegaMenuData): NavItemWithChildren[] {
	const { productTypes, collections } = data;
	// Mega menu "Les créations" avec types de produits
	const creationsItem: NavItemWithChildren = {
		href: ROUTES.SHOP.PRODUCTS,
		label: "Les créations",
		icon: "gem",
		hasDropdown: true,
		dropdownType: "creations",
		children: productTypes
			? [
					{ href: ROUTES.SHOP.PRODUCTS, label: "Toutes les créations", icon: "gem" },
					...productTypes.map((type) => ({
						href: ROUTES.SHOP.PRODUCT_TYPE(type.slug),
						label: type.label,
					})),
			  ]
			: undefined,
	};

	// Mega menu "Les collections" avec images
	const collectionsItem: NavItemWithChildren = {
		href: ROUTES.SHOP.COLLECTIONS,
		label: "Les collections",
		icon: "folder-open",
		hasDropdown: true,
		dropdownType: "collections",
		children: collections
			? [
					{ href: ROUTES.SHOP.COLLECTIONS, label: "Toutes les collections", icon: "folder-open" },
					...collections.map((collection) => ({
						href: ROUTES.SHOP.COLLECTION(collection.slug),
						label: collection.label,
						description: collection.description,
						images: collection.images,
						createdAt: collection.createdAt,
					})),
			  ]
			: undefined,
	};

	return [
		creationsItem,
		collectionsItem,
		{ href: ROUTES.SHOP.CUSTOMIZATION, label: "Personnalisation", icon: "sparkles" },
	];
}

// Footer - Navigation simple (labels harmonisés avec le header)
export const footerNavItems = [
	{ href: ROUTES.SHOP.PRODUCTS, label: "Les créations" },
	{ href: ROUTES.SHOP.COLLECTIONS, label: "Les collections" },
	{ href: ROUTES.SHOP.CUSTOMIZATION, label: "Personnalisation" },
	{ href: ROUTES.ACCOUNT.ROOT, label: "Mon compte" },
] as const;

// Liens légaux
export const legalLinks = [
	{ label: "CGV", href: ROUTES.LEGAL.CGV },
	{ label: "Mentions légales", href: ROUTES.LEGAL.LEGAL_NOTICE },
	{ label: "Politique de confidentialité", href: ROUTES.LEGAL.PRIVACY },
	{ label: "Gestion des cookies", href: ROUTES.LEGAL.COOKIES },
	{ label: "Formulaire de rétractation", href: ROUTES.LEGAL.WITHDRAWAL },
	{ label: "Accessibilité", href: ROUTES.LEGAL.ACCESSIBILITY },
] as const;
