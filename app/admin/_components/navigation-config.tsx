import type { LucideIcon } from "lucide-react";
import {
	LayoutDashboard,
	ShoppingBag,
	ReceiptText,
	Package,
	Layers,
	Tag,
	Palette,
	Gem,
	Settings,
	Sparkles,
	Mail,
	MessageSquare,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface NavItem {
	id: string;
	title: string;
	shortTitle?: string; // Pour mobile (optionnel, sinon title)
	url: string;
	icon: LucideIcon;
	isActive?: boolean;
}

export interface NavGroup {
	label: string;
	icon?: LucideIcon;
	items: NavItem[];
}

export interface NavigationData {
	navGroups: NavGroup[];
}

// ============================================================================
// NAVIGATION DATA
// ============================================================================

export const navigationData: NavigationData = {
	navGroups: [
		// ─────────────────────────────────────────────────────────────────────────
		// ACCUEIL - Point d'entrée
		// ─────────────────────────────────────────────────────────────────────────
		{
			label: "Accueil",
			icon: LayoutDashboard,
			items: [
				{
					id: "dashboard",
					title: "Tableau de bord",
					shortTitle: "Accueil",
					url: "/admin",
					icon: LayoutDashboard,
				},
			],
		},
		// ─────────────────────────────────────────────────────────────────────────
		// VENTES - Commandes et remboursements
		// ─────────────────────────────────────────────────────────────────────────
		{
			label: "Ventes",
			icon: ShoppingBag,
			items: [
				{
					id: "orders",
					title: "Commandes",
					url: "/admin/ventes/commandes",
					icon: ShoppingBag,
				},
				{
					id: "refunds",
					title: "Remboursements",
					url: "/admin/ventes/remboursements",
					icon: ReceiptText,
				},
			],
		},
		// ─────────────────────────────────────────────────────────────────────────
		// CATALOGUE - Produits + Collections
		// ─────────────────────────────────────────────────────────────────────────
		{
			label: "Catalogue",
			icon: Package,
			items: [
				{
					id: "products",
					title: "Produits",
					url: "/admin/catalogue/produits",
					icon: Package,
				},
				{
					id: "collections",
					title: "Collections",
					url: "/admin/catalogue/collections",
					icon: Layers,
				},
			],
		},
		// ─────────────────────────────────────────────────────────────────────────
		// MARKETING - Newsletter, avis et personnalisations
		// ─────────────────────────────────────────────────────────────────────────
		{
			label: "Marketing",
			icon: Mail,
			items: [
				{
					id: "reviews",
					title: "Avis clients",
					shortTitle: "Avis",
					url: "/admin/marketing/avis",
					icon: MessageSquare,
				},
				{
					id: "customizations",
					title: "Personnalisations",
					shortTitle: "Persos",
					url: "/admin/marketing/personnalisations",
					icon: Sparkles,
				},
				{
					id: "newsletter",
					title: "Newsletter",
					url: "/admin/marketing/newsletter",
					icon: Mail,
				},
			],
		},
		// ─────────────────────────────────────────────────────────────────────────
		// CONFIGURATION - Attributs produits (rarement modifiés)
		// ─────────────────────────────────────────────────────────────────────────
		{
			label: "Configuration",
			icon: Settings,
			items: [
				{
					id: "product-types",
					title: "Types de produits",
					shortTitle: "Types",
					url: "/admin/catalogue/types-de-produits",
					icon: Tag,
				},
				{
					id: "colors",
					title: "Couleurs",
					url: "/admin/catalogue/couleurs",
					icon: Palette,
				},
				{
					id: "materials",
					title: "Matériaux",
					url: "/admin/catalogue/materiaux",
					icon: Gem,
				},
			],
		},
	],
};

// ============================================================================
// BOTTOM NAV CONFIG
// ============================================================================

/**
 * Configuration pour la bottom navigation mobile
 * - primaryIds : items affichés directement dans la barre
 * - Les autres items sont accessibles via le menu "Plus"
 */
const bottomNavConfig = {
	primaryIds: ["dashboard", "orders", "products"] as const,
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Récupère tous les items de navigation (flat list)
 */
export function getAllNavItems(): NavItem[] {
	return navigationData.navGroups.flatMap((group) => group.items);
}

/**
 * Récupère un item de navigation par son ID
 */
function getNavItemById(id: string): NavItem | undefined {
	return getAllNavItems().find((item) => item.id === id);
}

/**
 * Récupère les items principaux du bottom nav
 */
export function getBottomNavPrimaryItems(): NavItem[] {
	return bottomNavConfig.primaryIds
		.map((id) => getNavItemById(id))
		.filter((item): item is NavItem => item !== undefined);
}

