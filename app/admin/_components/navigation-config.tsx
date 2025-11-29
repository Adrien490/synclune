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
	Mail,
	Users,
	Ticket,
	Bell,
} from "lucide-react";

interface NavSubItem {
	title: string;
	url: string;
	badge?: number | "pending" | "alerts";
}

interface NavItem {
	title: string;
	url: string;
	icon: LucideIcon;
	isActive?: boolean;
	items?: NavSubItem[];
}

interface NavGroup {
	label: string;
	items: NavItem[];
}

interface NavigationData {
	navGroups: NavGroup[];
}

export const navigationData: NavigationData = {
	navGroups: [
		{
			label: "Vue d'ensemble",
			items: [
				{
					title: "Tableau de bord",
					url: "/admin",
					icon: LayoutDashboard,
					isActive: false,
				},
			],
		},
		{
			label: "Ventes",
			items: [
				{
					title: "Commandes",
					url: "/admin/ventes/commandes",
					icon: ShoppingBag,
				},
				{
					title: "Remboursements",
					url: "/admin/ventes/remboursements",
					icon: ReceiptText,
				},
			],
		},
		{
			label: "Catalogue",
			items: [
				{
					title: "Produits",
					url: "/admin/catalogue/produits",
					icon: Package,
				},
				{
					title: "Collections",
					url: "/admin/catalogue/collections",
					icon: Layers,
				},
				{
					title: "Types de produits",
					url: "/admin/catalogue/types-de-produits",
					icon: Tag,
				},
				{
					title: "Couleurs",
					url: "/admin/catalogue/couleurs",
					icon: Palette,
				},
				{
					title: "Matériaux",
					url: "/admin/catalogue/materiaux",
					icon: Gem,
				},
			],
		},
		{
			label: "Marketing",
			items: [
				{
					title: "Newsletter",
					url: "/admin/marketing/newsletter",
					icon: Mail,
				},
				{
					title: "Codes promo",
					url: "/admin/marketing/codes-promo",
					icon: Ticket,
				},
				{
					title: "Alertes stock",
					url: "/admin/marketing/notifications-stock",
					icon: Bell,
				},
			],
		},
		{
			label: "Administration",
			items: [
				{
					title: "Utilisateurs",
					url: "/admin/utilisateurs",
					icon: Users,
				},
			],
		},
	],
};
