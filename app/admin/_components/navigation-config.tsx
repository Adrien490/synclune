import {
	BankIcon,
	GearIcon,
	PackageIcon,
	PaletteIcon,
	ReceiptIcon,
	ShieldWarningIcon,
	ShoppingBagIcon,
	SquaresFourIcon,
	StackIcon,
	StorefrontIcon,
	SwatchesIcon,
	TagIcon,
	TicketIcon,
	WrenchIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";

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
// TYPES
// ============================================================================

export interface NavItem {
	id: string;
	title: string;
	shortTitle?: string; // Pour mobile (optionnel, sinon title)
	url: string;
	icon: Icon;
	/**
	 * Destination de la PASTILLE quand elle diffère du lien nu.
	 *
	 * Le libellé mène à la liste complète (« Commandes »), mais cliquer le
	 * compteur doit mener à la file qu'il compte — sinon l'admin arrive sur une
	 * liste non filtrée et doit repérer à l'œil les lignes concernées.
	 */
	badgeUrl?: string;
}

interface NavGroup {
	label: string;
	icon?: Icon;
	items: NavItem[];
	collapsible?: boolean;
	/**
	 * Accent de marque du groupe, consommé par le menu mobile en rail vertical.
	 *
	 * Les valeurs sont celles de `[data-accent]` (`app/styles/section-accents.css`),
	 * qui expose `--section-accent` — on ne redéclare donc aucune couleur ici, et
	 * `rose` reste dérivé de `--primary`.
	 *
	 * ⚠️ Il n'y a que QUATRE accents, et le bloc d'actions du menu n'en prend
	 * aucun : un cinquième groupe rendrait le code couleur arbitraire. C'est la
	 * condition de validité de ce champ, pas un détail cosmétique.
	 */
	accent?: "rose" | "lavender" | "mint" | "sun";
}

interface NavigationData {
	navGroups: NavGroup[];
}

// ============================================================================
// NAVIGATION GROUPS
// ============================================================================

/**
 * Groupe « Pilotage » — le tableau de bord et les surfaces de vente.
 *
 * Fusionne les anciens `Pilotage` (tableau de bord + fiche clients) et `Ventes`.
 * Le retrait de l'espace client (2026-07-31) a supprimé `/admin/clients`, ce qui
 * laissait `Pilotage` avec un seul lien — un libellé de groupe et un séparateur
 * de chrome pour « Tableau de bord » seul, exactement ce que le test
 * « n'a plus aucun groupe mono-item » interdit.
 *
 * Le tableau de bord est en tête plutôt que dans un groupe à part : ses KPI (CA,
 * commandes, progression du seuil de franchise) sont la vue d'ensemble de ce que
 * les items suivants détaillent.
 *
 * Au passage, disparition du gate `SHOP_LIVE` qui n'englobait que ce groupe :
 * codé en dur à `true`, sa branche `false` était morte depuis que la fermeture de
 * boutique est pilotée à l'exécution par `StoreSettings.isClosed` et non plus par
 * un drapeau de build. Le garder ici aurait fait disparaître « Tableau de bord »
 * avec le groupe si quelqu'un l'avait repassé à `false`.
 */
const PILOTAGE_GROUP: NavGroup = {
	label: "Pilotage",
	icon: SquaresFourIcon,
	accent: "rose",
	items: [
		{
			id: "dashboard",
			title: "Tableau de bord",
			shortTitle: "Accueil",
			url: "/admin",
			icon: SquaresFourIcon,
		},
		{
			id: "orders",
			title: "Commandes",
			url: "/admin/ventes/commandes",
			// La pastille compte la file « à expédier » — elle doit y mener.
			badgeUrl: ORDERS_TO_SHIP_HREF,
			icon: ShoppingBagIcon,
		},
		{
			id: "refunds",
			title: "Remboursements",
			url: "/admin/ventes/remboursements",
			badgeUrl: "/admin/ventes/remboursements?filter_status=PENDING",
			icon: ReceiptIcon,
		},
		{
			id: "invoicing",
			title: "Facturation",
			url: "/admin/ventes/facturation",
			icon: BankIcon,
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
			icon: TicketIcon,
		},
	],
};

const CATALOGUE_GROUP: NavGroup = {
	label: "Catalogue",
	icon: PackageIcon,
	accent: "lavender",
	collapsible: true,
	items: [
		{
			id: "products",
			title: "Produits",
			url: "/admin/catalogue/produits",
			icon: PackageIcon,
		},
		{
			id: "collections",
			title: "Collections",
			url: "/admin/catalogue/collections",
			icon: StackIcon,
		},
		{
			id: "product-types",
			title: "Types de produits",
			shortTitle: "Types",
			url: "/admin/catalogue/types-de-produits",
			icon: TagIcon,
		},
		{
			id: "colors",
			title: "Couleurs",
			url: "/admin/catalogue/couleurs",
			icon: PaletteIcon,
		},
		{
			id: "materials",
			title: "Matériaux",
			url: "/admin/catalogue/materiaux",
			icon: SwatchesIcon,
		},
	],
};

/**
 * Groupe « Boutique » — tout ce qui paramètre la vitrine.
 *
 * Anciennement issu de la fusion des groupes mono-item `Contenu` (Annonces) et
 * `Configuration` (Boutique). La barre d'annonce ayant été retirée le 2026-08-04,
 * la section `/admin/contenu/**` a disparu avec elle : ne restent que des routes
 * `/admin/configuration/**`.
 */
const BOUTIQUE_GROUP: NavGroup = {
	label: "Boutique",
	icon: GearIcon,
	accent: "mint",
	items: [
		{
			id: "store-settings",
			title: "Réglages boutique",
			shortTitle: "Réglages",
			url: "/admin/configuration/boutique",
			icon: StorefrontIcon,
		},
		{
			id: "security-settings",
			title: "Sécurité",
			url: "/admin/configuration/securite",
			icon: ShieldWarningIcon,
		},
		{
			id: "maintenance",
			title: "Maintenance",
			url: "/admin/configuration/maintenance",
			icon: WrenchIcon,
		},
	],
};

// ============================================================================
// NAVIGATION DATA
// ============================================================================

/**
 * Ordre = fréquence d'usage quotidienne décroissante : on pilote et on traite les
 * ventes, on entretient le catalogue, puis les réglages.
 *
 * Trois groupes au lieu de six à l'origine. Cinq groupes mono-item successifs
 * (Clients, Contenu, Configuration, Marketing, puis Pilotage) coûtaient chacun un
 * libellé et un séparateur de chrome pour un unique lien :
 * - `Contenu` + `Configuration` ont fusionné en `Boutique` ;
 * - `Marketing` est devenu mono-item au retrait du système d'avis (2026-07-30),
 *   « Codes promo » a rejoint les ventes ;
 * - `Clients` a disparu au retrait de l'espace client (2026-07-31), ce qui a rendu
 *   `Pilotage` mono-item à son tour → fusion avec `Ventes`.
 *
 * Verrouillé par le test « n'a plus aucun groupe mono-item » de
 * navigation-config.test.ts.
 */
export const navigationData: NavigationData = {
	navGroups: [PILOTAGE_GROUP, CATALOGUE_GROUP, BOUTIQUE_GROUP],
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * IDs des items affichés dans la section "Accès rapide" du menu mobile.
 * Filtrés depuis getAllNavItems() pour rester en sync avec navigationData.
 */
/**
 * ⚠️ `refunds` en fait partie **parce qu'il porte une pastille**.
 *
 * `getAdminNavBadges()` compte deux files actionnables — `orders` et `refunds` —
 * et `app/admin/layout.tsx` passe l'objet entier à la barre du bas. Mais tant que
 * `refunds` n'était pas un onglet d'accès rapide, ce compteur traversait tout le
 * layout pour être ignoré : sur son téléphone, l'administratrice ne voyait jamais
 * un remboursement en échec Stripe ni un avoir manquant sur une commande
 * facturée. C'est exactement le périmètre du bouton `reconcile-refunds` de la
 * page Maintenance, donc une file à conséquence fiscale.
 *
 * Corollaire à tenir : **tout item badgé par `getAdminNavBadges()` doit figurer
 * ici**, sinon son compteur redevient muet en mobile. Verrouillé par le test
 * « chaque file badgée est atteignable en accès rapide » de navigation-config.test.ts.
 */
const QUICK_ACCESS_ITEM_IDS = ["dashboard", "orders", "products", "refunds"] as const;

/**
 * Récupère tous les items de navigation (liste plate).
 *
 * Plus de `DASHBOARD_ITEM` hors-groupe à concaténer : « Tableau de bord » vit
 * dans `PILOTAGE_GROUP`, donc il apparaît une seule fois (le concaténer en tête
 * le dupliquerait dans la recherche du menu mobile).
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
const BADGE_NOUNS: Record<string, { one: string; many: string; none: string }> = {
	orders: {
		one: "commande en attente",
		many: "commandes en attente",
		none: "Aucune commande en attente",
	},
	refunds: {
		one: "remboursement en attente",
		many: "remboursements en attente",
		none: "Aucun remboursement en attente",
	},
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

/**
 * Libellé annoncé quand une file badgée retombe à zéro.
 *
 * Écrit en toutes lettres par item plutôt que dérivé de `one` : « Aucune » /
 * « Aucun » dépend du genre du substantif, que rien dans la donnée ne porte.
 * Le déduire produirait « Aucune remboursement en attente ».
 */
export function badgeEmptyLabel(itemId: string): string {
	return BADGE_NOUNS[itemId]?.none ?? "Aucun élément en attente";
}

/** Ids des files réellement badgées (SSOT locale, alignée sur `getAdminNavBadges`). */
export const BADGED_ITEM_IDS = Object.keys(BADGE_NOUNS);

/**
 * Substantifs des files ACTIONNABLES, pour l'ardoise du menu mobile.
 *
 * Troisième formulation du même compteur, et elle est volontaire : la pastille
 * dit un ÉTAT (« 3 commandes en attente »), l'ardoise dit un TRAVAIL (« 3
 * commandes à expédier »). Les mots viennent du prédicat réel de
 * `getAdminNavBadges` — la file `orders` est « à expédier »
 * (`buildToShipWhereClause`), la file `refunds` est « à rattraper » (échec Stripe
 * ou avoir manquant). Les rendre identiques rendrait le libellé faux d'un côté.
 *
 * Comme les deux autres, elle vit ICI : aucun composant ne fabrique la chaîne.
 */
const QUEUE_NOUNS: Record<string, { one: string; many: string }> = {
	orders: { one: "commande à expédier", many: "commandes à expédier" },
	refunds: { one: "remboursement à rattraper", many: "remboursements à rattraper" },
};

/**
 * Libellé d'une ligne de file. `null` quand l'item n'est pas une file
 * actionnable — l'appelant l'exclut alors de l'ardoise plutôt que d'inventer un
 * substantif générique : une ligne « 4 éléments à traiter » n'apprend rien.
 */
export function queueLabel(itemId: string, count: number): string | null {
	const noun = QUEUE_NOUNS[itemId];
	if (!noun) return null;
	return `${count} ${count > 1 ? noun.many : noun.one}`;
}

/** Les items qui peuvent apparaître dans l'ardoise, dans l'ordre de la navigation. */
export function getQueueItems(): NavItem[] {
	return getAllNavItems().filter((item) => item.id in QUEUE_NOUNS);
}
