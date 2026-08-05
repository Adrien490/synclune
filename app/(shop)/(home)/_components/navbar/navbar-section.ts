import { ROUTES } from "@/shared/constants/urls";

/**
 * Les quatre accents de marque exposés par `app/styles/section-accents.css`.
 * `null` = pas d'accent : le bandeau ne se peint pas.
 */
export type NavbarAccent = "rose" | "lavender" | "mint" | "sun";

export type NavbarSection = {
	/** Valeur de `data-accent` à poser sur le `<header>`, ou `null`. */
	accent: NavbarAccent | null;
	/**
	 * Nom de la salle courante, affiché dans la barre une fois scrollée SOUS `lg`.
	 * `null` sur l'accueil (la marque suffit) et hors boutique.
	 */
	label: string | null;
};

const NONE: NavbarSection = { accent: null, label: null };

/**
 * Résout la « salle » de la boutique à partir du chemin.
 *
 * ## Pourquoi une couleur par salle, et pourquoi CELLES-LÀ
 *
 * Le bandeau de 4 px sous la barre est un APLAT : c'est la seule façon d'employer
 * les accents de marque, excellents en surface (7,8 à 12,7:1 sous `--foreground`)
 * et inutilisables en encre (1,5 à 2,5:1). Reste à ne pas rendre la
 * correspondance arbitraire — sinon le bandeau devient de la décoration.
 *
 * Elle suit **l'ordre des touches de pinceau du bloc titre** (`RAIL_ACCENTS`,
 * rose → lavande → menthe → soleil — le même fil que portait le dégradé du
 * titre avant son passage au surligneur, 2026-08-05) : accueil rose,
 * créations lavande, collections menthe.
 *
 * ⚠️ Le soleil — quatrième accent, seul hors dégradé — allait à l'aide. Depuis
 * que la FAQ a rejoint la landing (2026-08-05), il n'est plus attribué à AUCUNE
 * salle : `NavbarAccent` le garde parce que `section-accents.css` l'expose et
 * que la section FAQ le porte sur son contenu, mais `resolveNavbarSection` ne le
 * rend plus jamais. C'est donc lui, le candidat naturel d'une cinquième salle.
 *
 * ## Ce qui n'a délibérément PAS d'accent
 *
 * Les pages légales, le tunnel de paiement, la connexion et le suivi de commande
 * ne sont pas des salles de la boutique : le bandeau y retombe sur le filet
 * `--border`. Ajouter une cinquième salle demandera de trancher une couleur, pas
 * de cycler dans la palette — c'est le critère d'échec assumé de cette direction.
 *
 * ## Granularité : la SECTION, jamais la feuille
 *
 * `/produits/papilloux` rend « Créations », pas « Papilloux ». Le libellé d'un
 * type de produit vit en base ; le résoudre ici demanderait de faire descendre
 * une table de correspondance jusqu'au client pour un texte que le fil d'Ariane
 * porte déjà.
 *
 * ## Registre COURT, et pourquoi ce n'est plus le libellé de la nav
 *
 * Ces libellés reprenaient mot pour mot ceux de `getDesktopNavItems` (« Les
 * créations », « Mes favoris »), avec la consigne de le rester. **La consigne est
 * levée** : elle coûtait plus qu'elle ne rapportait.
 *
 * La colonne droite de la barre est `flex-1` à base 0 — elle reçoit donc
 * `(largeur utile − logo mobile − gouttières) / 2`, soit ~92 px à 390 px et
 * ~57 px à 320 px. « Les collections » en display `text-sm` en demande ~105 (mesuré sous Fraunces ; ordre de grandeur inchangé sous Winky Sans) :
 * le repère qui existe pour dire où l'on est rendait « Les collec… » sur TOUS les
 * téléphones courants.
 *
 * Aligner les deux textes n'avait de toute façon aucun effet observable : ce
 * libellé est `aria-hidden` **et** `lg:hidden`, donc jamais co-visible avec la
 * nav desktop ni lisible par un lecteur d'écran. Nouveau contrat : **registre
 * court, une seule respiration**, mesuré à 320 px.
 */
export function resolveNavbarSection(pathname: string | null): NavbarSection {
	if (!pathname) return NONE;

	// Accueil : match EXACT. Un `startsWith("/")` attraperait tout le site.
	if (pathname === ROUTES.SHOP.HOME) return { accent: "rose", label: null };

	// Fiche produit : `/creations/<slug>` appartient à la salle « Les créations »,
	// exactement comme `useActiveNavbarItem` y allume l'entrée de nav.
	if (
		isUnder(pathname, ROUTES.SHOP.PRODUCT_DETAIL_PREFIX) ||
		isUnder(pathname, ROUTES.SHOP.PRODUCTS)
	) {
		return { accent: "lavender", label: "Créations" };
	}

	if (isUnder(pathname, ROUTES.SHOP.COLLECTIONS)) {
		return { accent: "mint", label: "Collections" };
	}

	// ⚠️ Plus de salle « Aide ». La FAQ a rejoint la landing le 2026-08-05, et
	// `ROUTES.SHOP.HELP` vaut désormais `/#faq` : ce n'est plus un pathname, donc
	// un `isUnder(pathname, ROUTES.SHOP.HELP)` ne matcherait JAMAIS — une branche
	// morte qui laisserait croire que l'accent soleil est encore attribué. Il ne
	// survit que sur le contenu (la touche de pinceau de `FaqSection`).
	if (isUnder(pathname, ROUTES.SHOP.FAVORITES)) {
		return { accent: "rose", label: "Favoris" };
	}

	return NONE;
}

/**
 * `true` si le chemin EST la base ou vit dessous.
 *
 * Le `/` de fin est obligatoire : sans lui, `/collections` attraperait une
 * hypothétique `/collections-privees`.
 */
function isUnder(pathname: string, base: string): boolean {
	return pathname === base || pathname.startsWith(`${base}/`);
}
