export type RecentlyViewedProduct = {
	slug: string;
	title: string;
	price: number;
	image: { url: string; blurDataUrl: string | null } | null;
};

export type QuickSearchCollection = {
	slug: string;
	name: string;
	productCount: number;
	image: { url: string; blurDataUrl: string | null } | null;
};

export type QuickSearchProductType = {
	slug: string;
	label: string;
};

/** Une teinte du nuancier — sort vers `/produits?color=<slug>`. */
export type QuickSearchColor = {
	slug: string;
	name: string;
	hex: string;
};

/**
 * Sous ce nombre de teintes actives, le mur ne se rend pas et le panneau
 * retombe sur son contenu textuel.
 *
 * Un nuancier de 3 pastilles n'est pas un nuancier : il annonce un catalogue
 * coloré et montre le contraire. Le seuil est une GARDE DE DONNÉES, pas un
 * réglage esthétique — il permet à la boutique de démarrer avec deux teintes
 * sans afficher une vitrine qui ment, et de gagner le mur automatiquement dès
 * que la palette est saisie, sans redéploiement.
 */
export const QUICK_SEARCH_MIN_COLORS = 6;

/**
 * Plafond du mur. Au-delà, il mange le panneau et repousse collections et CTA
 * sous la ligne de flottaison — or le mur est censé RÉDUIRE le vide, pas
 * déplacer le problème. Les teintes retenues sont les plus portées du catalogue
 * (tri DB), puis réordonnées en nuancier (`sortColorsByHue`).
 */
export const QUICK_SEARCH_MAX_COLORS = 12;

export const QUICK_SEARCH_DIALOG_ID = "quick-search";

/**
 * CSS selector for arrow-key-navigable elements inside the results area.
 *
 * **`data-qs-option` est le marqueur de NAVIGATION ; `role="option"` est le
 * marqueur ARIA. Les deux sont délibérément distincts.**
 *
 * Ils coïncidaient (`[role="option"]`), ce qui forçait les items du mode idle à
 * porter `role="option"` uniquement pour rester navigables — alors qu'en idle le
 * conteneur n'est pas un `listbox` (choix F3 du 2026-05-29, conservé). Résultat :
 * des options orphelines, sans listbox propriétaire, et un `aria-activedescendant`
 * supprimé — la navigation aux flèches était donc **silencieuse pour les lecteurs
 * d'écran** en idle, alors que `data-active` la montrait visuellement.
 *
 * Depuis la séparation :
 * - **mode recherche** : les items sont dans un vrai `role="listbox"` et portent
 *   `role="option"` + `data-qs-option` ; le roving se fait par
 *   `aria-activedescendant` (l'input garde le focus).
 * - **mode idle** : les items portent seulement `data-qs-option` ; le roving
 *   déplace le **focus DOM réel**, que tout lecteur d'écran annonce nativement,
 *   sans une ligne d'ARIA.
 *
 * Restent exclus dans les deux modes : les contrôles auxiliaires (× de
 * suppression, « Effacer », « Voir toutes les collections », « Réessayer »,
 * suggestion orthographique, CTA de pied) — ils ne sont pas des options et
 * restent atteignables au Tab. Cela évite que le surlignage atterrisse sur des
 * contrôles invisibles (les × sont `md:opacity-0` jusqu'au hover/focus).
 */
export const FOCUSABLE_SELECTOR = "[data-qs-option]:not([aria-disabled='true'])";

/** Max matched collections shown in search results */
export const MAX_MATCHED_COLLECTIONS = 2;

/** Max matched product types shown in search results */
export const MAX_MATCHED_TYPES = 2;

/** Number of skeleton rows in the loading state */
export const SKELETON_ROWS = 4;

/** Minimum query length to trigger a search (aligned with FUZZY_MIN_LENGTH) */
export const MIN_SEARCH_LENGTH = 3;

/** Debounce delay (ms) for the live search input */
export const SEARCH_DEBOUNCE_MS = 300;

/** Downward swipe distance (px) from the mobile header that dismisses the dialog */
export const SWIPE_CLOSE_THRESHOLD_PX = 80;

/**
 * Vélocité instantanée (px/ms) d'un flick vers le bas qui ferme même sous le
 * seuil de distance — un geste rapide et court est une intention de fermeture
 * aussi claire qu'un drag long (même arbitrage que Vaul, qui prend 0.4).
 */
export const SWIPE_CLOSE_VELOCITY_PX_PER_MS = 0.5;

/** Dampening applied to an upward (over-)drag so it feels rubber-banded */
export const SWIPE_RUBBER_BAND_FACTOR = 0.3;

/** Interval (ms) between animated placeholder rotations */
export const PLACEHOLDER_CYCLE_MS = 3000;

/** Branded error type replacing the raw "error" string literal */
export type QuickSearchError = { type: "error" };

/**
 * ID du conteneur de résultats — **périmètre de NAVIGATION** (c'est lui que
 * référence `contentRef`, et il englobe aussi bien le mode idle que le mode
 * recherche). Ce n'est PAS le listbox : cf. `LISTBOX_ID`.
 */
export const RESULTS_CONTAINER_ID = "qs-results";

/**
 * ID du `role="listbox"` — **périmètre ARIA**, présent uniquement en mode
 * recherche et n'enveloppant QUE des `role="group"` / `role="option"`.
 *
 * Distinct de `RESULTS_CONTAINER_ID` : le rôle listbox portait sur le conteneur
 * entier, qui contient aussi des `<h3>`, des `<p>`, l'état vide (`role="status"`)
 * et le CTA de pied — des enfants qu'un `listbox` n'a pas le droit de posséder
 * (il n'accepte que `option` et `group`), et que certains lecteurs d'écran
 * élaguent. C'est cet id que vise l'`aria-controls` du combobox.
 */
export const LISTBOX_ID = "qs-listbox";

/** ID du hint « au moins N caractères » — cible de l'`aria-describedby` du champ. */
export const MIN_LENGTH_HINT_ID = "qs-min-length-hint";
