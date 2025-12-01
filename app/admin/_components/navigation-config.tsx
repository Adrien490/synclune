import type { LucideIcon } from "lucide-react";
import {
	LayoutDashboard,
	ShoppingBag,
	CreditCard,
	ReceiptText,
	Package,
	Layers,
	Boxes,
	Bell,
	Ticket,
	Users,
	Tag,
	Palette,
	Gem,
} from "lucide-react";
import type { NavBadgeKey } from "./nav-badges-data";

// ============================================================================
// TYPES
// ============================================================================

export interface NavItem {
	id: string;
	title: string;
	shortTitle?: string; // Pour mobile (optionnel, sinon title)
	url: string;
	icon: LucideIcon;
	badge?: NavBadgeKey;
	isActive?: boolean;
}

export interface NavGroup {
	label: string;
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
		// VENTES - Cycle commande → paiement → remboursement
		// ─────────────────────────────────────────────────────────────────────────
		{
			label: "Ventes",
			items: [
				{
					id: "orders",
					title: "Commandes",
					url: "/admin/ventes/commandes",
					icon: ShoppingBag,
				},
				{
					id: "payments",
					title: "Paiements",
					url: "/admin/ventes/paiements",
					icon: CreditCard,
				},
				{
					id: "refunds",
					title: "Remboursements",
					url: "/admin/ventes/remboursements",
					icon: ReceiptText,
					badge: "pendingRefunds",
				},
			],
		},
		// ─────────────────────────────────────────────────────────────────────────
		// CATALOGUE - Produits + Inventaire
		// ─────────────────────────────────────────────────────────────────────────
		{
			label: "Catalogue",
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
				{
					id: "inventory",
					title: "Inventaire",
					url: "/admin/catalogue/inventaire",
					icon: Boxes,
				},
			],
		},
		// ─────────────────────────────────────────────────────────────────────────
		// MARKETING - Promotions et alertes stock
		// ─────────────────────────────────────────────────────────────────────────
		{
			label: "Marketing",
			items: [
				{
					id: "promo-codes",
					title: "Codes promo",
					url: "/admin/marketing/codes-promo",
					icon: Ticket,
				},
				{
					id: "stock-alerts",
					title: "Alertes stock",
					shortTitle: "Alertes",
					url: "/admin/marketing/notifications-stock",
					icon: Bell,
					badge: "stockAlerts",
				},
			],
		},
		// ─────────────────────────────────────────────────────────────────────────
		// CLIENTS - Gestion des clients (ex: Administration > Utilisateurs)
		// ─────────────────────────────────────────────────────────────────────────
		{
			label: "Clients",
			items: [
				{
					id: "customers",
					title: "Clients",
					url: "/admin/utilisateurs",
					icon: Users,
				},
			],
		},
		// ─────────────────────────────────────────────────────────────────────────
		// CONFIGURATION - Attributs produits (rarement modifiés)
		// ─────────────────────────────────────────────────────────────────────────
		{
			label: "Configuration",
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
export const bottomNavConfig = {
	primaryIds: ["dashboard", "orders", "inventory"] as const,
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
export function getNavItemById(id: string): NavItem | undefined {
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

/**
 * Récupère les items secondaires du bottom nav (menu "Plus")
 */
export function getBottomNavSecondaryItems(): NavItem[] {
	const primaryIds = new Set<string>(bottomNavConfig.primaryIds);
	return getAllNavItems().filter((item) => !primaryIds.has(item.id));
}
