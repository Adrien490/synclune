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
	Ticket,
	Megaphone,
	Store,
	Users,
	Landmark,
} from "lucide-react";
import { ORDERS_TO_SHIP_HREF } from "@/modules/orders/constants/to-ship";

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
	/**
	 * Destination de la PASTILLE quand elle diffère du lien nu.
	 *
	 * Le libellé mène à la liste complète (« Commandes »), mais cliquer le
	 * compteur doit mener à la file qu'il compte — sinon l'admin arrive sur une
	 * liste non filtrée et doit repérer à l'œil les lignes concernées.
	 */
	badgeUrl?: string;
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
			// La pastille compte la file « à expédier » — elle doit y mener.
			badgeUrl: ORDERS_TO_SHIP_HREF,
			icon: ShoppingBag,
		},
		{
			id: "refunds",
			title: "Remboursements",
			url: "/admin/ventes/remboursements",
			badgeUrl: "/admin/ventes/remboursements?filter_status=PENDING",
			icon: ReceiptText,
		},
		{
			id: "invoicing",
			title: "Facturation",
			url: "/admin/ventes/facturation",
			icon: Landmark,
		},
		// Route inchangée (`/admin/marketing/discounts`) : seul le regroupement
		// visuel bouge, comme pour la fusion Contenu+Configuration → Boutique.
		// Le hub `/admin/marketing` reste l'ancre de section de cette route et
		// demeure atteignable par le fil d'Ariane.
		{
			id: "discounts",
			title: "Codes promo",
			shortTitle: "Promos",
			url: "/admin/marketing/discounts",
			icon: Ticket,
		},
	],
};

/**
 * Groupe « Pilotage » — le tableau de bord et la fiche clients.
 *
 * `Clients` occupait à lui seul un groupe (libellé + séparateur pour un unique
 * lien) placé AVANT `Catalogue`, la deuxième surface la plus utilisée. Et
 * `/admin` n'avait aucune entrée nommée : le seul retour au tableau de bord
 * passait par le logo, non libellé.
 */
const PILOTAGE_GROUP: NavGroup = {
	label: "Pilotage",
	icon: LayoutDashboard,
	items: [
		{
			id: "dashboard",
			title: "Tableau de bord",
			shortTitle: "Accueil",
			url: "/admin",
			icon: LayoutDashboard,
		},
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

/**
 * Groupe « Boutique » — réglages et contenu éditorial.
 *
 * Fusionne les anciens groupes mono-item `Contenu` (Annonces) et `Configuration`
 * (Boutique) : deux libellés de groupe et deux séparateurs pour deux liens, alors
 * que les deux relèvent du même geste (paramétrer la vitrine) et sont consultés
 * rarement. Les routes `/admin/contenu/**` et `/admin/configuration/**` sont
 * inchangées — seul le regroupement visuel bouge.
 */
const BOUTIQUE_GROUP: NavGroup = {
	label: "Boutique",
	icon: Settings,
	items: [
		{
			id: "store-settings",
			title: "Réglages boutique",
			shortTitle: "Réglages",
			url: "/admin/configuration/boutique",
			icon: Store,
		},
		{
			id: "announcements",
			title: "Annonces",
			url: "/admin/contenu/annonces",
			icon: Megaphone,
		},
	],
};

// ============================================================================
// NAVIGATION DATA
// ============================================================================

/**
 * Ordre = fréquence d'usage quotidienne décroissante : on pilote (tableau de bord),
 * on traite les ventes, on entretient le catalogue, puis les réglages.
 *
 * Trois groupes au lieu de six. Quatre groupes mono-item (Clients, Contenu,
 * Configuration, puis Marketing) coûtaient chacun un libellé et un séparateur pour
 * un unique lien. `Marketing` est devenu mono-item au retrait du système d'avis
 * (2026-07-30) : « Codes promo » a rejoint `Ventes`, dont il partage le gate
 * `SHOP_LIVE` et la nature commerciale. Verrouillé par le test
 * « n'a plus aucun groupe mono-item » de navigation-config.test.ts.
 */
export const navigationData: NavigationData = {
	navGroups: [
		PILOTAGE_GROUP,
		...(SHOP_LIVE ? [VENTES_GROUP] : []),
		CATALOGUE_GROUP,
		BOUTIQUE_GROUP,
	],
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
 * Récupère tous les items de navigation (liste plate).
 *
 * Plus de `DASHBOARD_ITEM` hors-groupe à concaténer : « Tableau de bord » vit
 * désormais dans `PILOTAGE_GROUP`, donc il apparaît une seule fois (le
 * concaténer en tête le dupliquerait dans la recherche du menu mobile).
 */
export function getAllNavItems(): NavItem[] {
	return navigationData.navGroups.flatMap((group) => group.items);
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

// ============================================================================
// BADGES (aria-label SSOT — partagé sidebar desktop + bottom-bar + menu sheet)
// ============================================================================

/**
 * Noms typés par item pour l'aria-label du badge (sinon générique « en attente »).
 * Seuls les items réellement badgés (cf. getAdminNavBadges → { orders, refunds })
 * ont une entrée.
 */
const BADGE_NOUNS: Record<string, { one: string; many: string }> = {
	orders: { one: "commande en attente", many: "commandes en attente" },
	refunds: { one: "remboursement en attente", many: "remboursements en attente" },
};

/**
 * Label accessible exact d'un badge de compteur (le visuel clamp à « 99+ »
 * mais le SR doit garder le compte réel). Parité desktop/mobile.
 */
export function badgeAriaLabel(itemId: string, count: number): string {
	const noun = BADGE_NOUNS[itemId];
	if (!noun) return badgePendingLabel(count);
	return `${count} ${count > 1 ? noun.many : noun.one}`;
}

/**
 * Variante SANS substantif, pour les contextes où le nom de l'item est déjà porté
 * par le nom accessible auquel le compteur est rattaché — le lien de sidebar
 * desktop annonce « Commandes (3 en attente) ». Y utiliser `badgeAriaLabel()`
 * produirait « Commandes 3 commandes en attente ».
 *
 * Les deux formes vivent ici pour qu'un changement de formulation reste unique ;
 * aucun composant ne doit fabriquer la chaîne à la main.
 */
export function badgePendingLabel(count: number): string {
	return `${count} en attente`;
}
