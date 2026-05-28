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
	Mail,
	MessageSquare,
	Ticket,
	FileText,
	Megaphone,
	Store,
	Users,
	Landmark,
} from "lucide-react";

// ============================================================================
// CONSTANTS (shared between sheet content + bottom-bar trigger)
// ============================================================================

/**
 * DOM id de la SheetContent admin. Référencé par le bouton Menu du
 * bottom-bar via `aria-controls` pour relier le trigger à son content
 * (WCAG 4.1.2). ID statique car la sheet est unique au DOM admin.
 */
export const ADMIN_MENU_SHEET_CONTENT_ID = "admin-menu-sheet-content";

// ============================================================================
// SHOP STATUS FLAG
// ============================================================================

// Boutique en ligne : tous les groupes sont actifs (Ventes, Clients, Marketing,
// Contenu). L'onglet "Commandes" est restauré dans le bottom bar mobile.
// Cast `as boolean` pour défaire le narrowing TypeScript du littéral, sinon
// ESLint flag `SHOP_LIVE ? ... : []` comme always-truthy.
const SHOP_LIVE = true as boolean;

// ============================================================================
// TYPES
// ============================================================================

export interface NavItem {
	id: string;
	title: string;
	shortTitle?: string; // Pour mobile (optionnel, sinon title)
	url: string;
	icon: LucideIcon;
}

export interface NavGroup {
	label: string;
	icon?: LucideIcon;
	items: NavItem[];
	collapsible?: boolean;
}

interface NavigationData {
	navGroups: NavGroup[];
}

// ============================================================================
// NAVIGATION GROUPS
// ============================================================================

const VENTES_GROUP: NavGroup = {
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
		{
			id: "invoicing",
			title: "Facturation",
			url: "/admin/ventes/facturation",
			icon: Landmark,
		},
	],
};

const CLIENTS_GROUP: NavGroup = {
	label: "Clients",
	icon: Users,
	items: [
		{
			id: "customers",
			title: "Clients",
			url: "/admin/clients",
			icon: Users,
		},
	],
};

const CATALOGUE_GROUP: NavGroup = {
	label: "Catalogue",
	icon: Package,
	collapsible: true,
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
};

const MARKETING_GROUP: NavGroup = {
	label: "Marketing",
	icon: Mail,
	collapsible: true,
	items: [
		{
			id: "discounts",
			title: "Codes promo",
			shortTitle: "Promos",
			url: "/admin/marketing/discounts",
			icon: Ticket,
		},
		{
			id: "reviews",
			title: "Avis clients",
			shortTitle: "Avis",
			url: "/admin/marketing/avis",
			icon: MessageSquare,
		},
	],
};

const CONTENU_GROUP: NavGroup = {
	label: "Contenu",
	icon: FileText,
	items: [
		{
			id: "announcements",
			title: "Annonces",
			url: "/admin/contenu/annonces",
			icon: Megaphone,
		},
	],
};

const CONFIG_GROUP: NavGroup = {
	label: "Configuration",
	icon: Settings,
	items: [
		{
			id: "store-settings",
			title: "Boutique",
			url: "/admin/configuration/boutique",
			icon: Store,
		},
	],
};

// ============================================================================
// NAVIGATION DATA
// ============================================================================

export const navigationData: NavigationData = {
	navGroups: [
		...(SHOP_LIVE ? [VENTES_GROUP, CLIENTS_GROUP] : []),
		CATALOGUE_GROUP,
		...(SHOP_LIVE ? [MARKETING_GROUP, CONTENU_GROUP] : []),
		CONFIG_GROUP,
	],
};

// ============================================================================
// STANDALONE ITEMS (not in navGroups — used only by Quick Access / helpers)
// ============================================================================

/** Dashboard item — rendered only in Quick Access, not in navGroups. */
const DASHBOARD_ITEM: NavItem = {
	id: "dashboard",
	title: "Tableau de bord",
	shortTitle: "Accueil",
	url: "/admin",
	icon: LayoutDashboard,
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * IDs des items affichés dans la section "Accès rapide" du menu mobile.
 * Filtrés depuis getAllNavItems() pour rester en sync avec navigationData.
 * Mode boutique fermée : remplace "orders" par "store-settings".
 */
const QUICK_ACCESS_ITEM_IDS = SHOP_LIVE
	? (["dashboard", "orders", "products"] as const)
	: (["dashboard", "store-settings", "products"] as const);

/**
 * Récupère tous les items de navigation (flat list), including standalone items.
 */
export function getAllNavItems(): NavItem[] {
	return [DASHBOARD_ITEM, ...navigationData.navGroups.flatMap((group) => group.items)];
}

/**
 * Récupère les items d'accès rapide pour le menu mobile
 */
export function getQuickAccessItems(): NavItem[] {
	const allItems = getAllNavItems();
	return QUICK_ACCESS_ITEM_IDS.map((id) => allItems.find((item) => item.id === id)).filter(
		(item): item is NavItem => item !== undefined,
	);
}
