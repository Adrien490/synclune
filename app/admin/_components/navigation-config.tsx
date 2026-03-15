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
	Ticket,
	FileText,
	Megaphone,
	HelpCircle,
	Store,
	Users,
	Monitor,
	Gavel,
	ScrollText,
	Webhook,
	MailWarning,
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
}

export interface NavGroup {
	label: string;
	icon?: LucideIcon;
	items: NavItem[];
	collapsible?: boolean;
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
		// CLIENTS - Gestion des utilisateurs
		// ─────────────────────────────────────────────────────────────────────────
		{
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
		},
		// ─────────────────────────────────────────────────────────────────────────
		// CATALOGUE - Produits, Collections, Types, Couleurs, Matériaux
		// ─────────────────────────────────────────────────────────────────────────
		{
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
		},
		// ─────────────────────────────────────────────────────────────────────────
		// MARKETING - Newsletter, avis et personnalisations
		// ─────────────────────────────────────────────────────────────────────────
		{
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
		// CONTENU - Contenu éditable du site
		// ─────────────────────────────────────────────────────────────────────────
		{
			label: "Contenu",
			icon: FileText,
			items: [
				{
					id: "announcements",
					title: "Annonces",
					url: "/admin/contenu/annonces",
					icon: Megaphone,
				},
				{
					id: "faq",
					title: "FAQ",
					url: "/admin/contenu/faq",
					icon: HelpCircle,
				},
			],
		},
		// ─────────────────────────────────────────────────────────────────────────
		// CONFIGURATION - Paramètres boutique
		// ─────────────────────────────────────────────────────────────────────────
		{
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
		},
		// ─────────────────────────────────────────────────────────────────────────
		// SYSTEME - Monitoring production
		// ─────────────────────────────────────────────────────────────────────────
		{
			label: "Système",
			icon: Monitor,
			collapsible: true,
			items: [
				{
					id: "disputes",
					title: "Litiges",
					url: "/admin/systeme/litiges",
					icon: Gavel,
				},
				{
					id: "audit",
					title: "Journal d'audit",
					shortTitle: "Audit",
					url: "/admin/systeme/audit",
					icon: ScrollText,
				},
				{
					id: "webhooks",
					title: "Webhooks",
					url: "/admin/systeme/webhooks",
					icon: Webhook,
				},
				{
					id: "failed-emails",
					title: "Emails échoués",
					shortTitle: "Emails",
					url: "/admin/systeme/emails",
					icon: MailWarning,
				},
			],
		},
	],
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
