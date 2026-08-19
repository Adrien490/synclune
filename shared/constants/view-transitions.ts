/**
 * SSOT des View Transitions **pilotées par React** (`<ViewTransition>`).
 *
 * Depuis le 2026-08-18, une navigation client ne démarre plus sa transition
 * elle-même : `router.push`/`router.replace` sont déjà des transitions React
 * (`app-router-instance.js` les enveloppe dans `startTransition`), et ce sont
 * les frontières `<ViewTransition>` des deux layouts qui décident d'animer. Le
 * helper impératif `withViewTransition()` ne couvre plus que les mutations
 * d'état SYNCHRONES (cf. son JSDoc).
 *
 * ⚠️ **Le fondu est OPT-IN, et ça n'est pas un excès de prudence — c'est une
 * mesure.** Une frontière en `update: "auto"` anime TOUT changement de contenu,
 * y compris chaque tronçon streamé par PPR : au premier rendu de `/produits`,
 * 4 transitions ENCHAÎNÉES de ~300 ms (relevé du 2026-08-18, instrumentation de
 * `document.startViewTransition` en e2e), soit ~1,5 s pendant lesquelles le
 * contenu est un instantané figé qui se ré-empile à chaque chunk. Sur une
 * vitrine, c'est du LCP jeté par la fenêtre pour une animation que personne n'a
 * demandée. Une navigation la demande explicitement, un tronçon streamé non :
 * d'où le type ci-dessous, réclamé au call site.
 *
 * Corollaire à connaître : le type ne survit PAS toujours au commit. React ne
 * lit `pendingTransitionTypes` que si les voies du commit sont **uniquement**
 * des voies de transition (`(lanes & 335544064) === lanes`) ; un `useOptimistic`
 * dans la même transition y entangle une voie synchrone et les types tombent.
 * La dégradation va alors vers `default: "none"` — pas de fondu, jamais de
 * fondu parasite. C'est le bon sens de chute.
 *
 * La parité avec `app/styles/pwa.css` est verrouillée par
 * `shared/constants/__tests__/view-transition-names.regression.test.ts`.
 */

/**
 * Nom porté par le `<main>` des deux layouts pendant une transition.
 *
 * Le nommer l'EXCLUT du snapshot `root` : le chrome (navbar, pied de page,
 * sidebar admin, barre basse) ne se repeint pas avec le contenu.
 */
export const PAGE_CONTENT_VIEW_TRANSITION_NAME = "page-content";

/**
 * Type de transition qui AUTORISE le fondu de page. Émis par les navigations
 * qui remplacent visiblement le contenu (formulaires admin qui reviennent à
 * leur liste, recherche rapide, panneau de filtres, carte produit → fiche),
 * mappé sur `"auto"` par les frontières des layouts.
 */
export const PAGE_FADE_TRANSITION_TYPE = "page-fade";

/** Forme attendue par `<Link transitionTypes={…}>`. */
export const PAGE_FADE_TRANSITION_TYPES: string[] = [PAGE_FADE_TRANSITION_TYPE];

/**
 * Forme attendue par `router.push`/`router.replace`. À étaler quand la
 * navigation a déjà des options : `{ scroll: false, ...PAGE_FADE_NAVIGATION }`.
 */
export const PAGE_FADE_NAVIGATION = { transitionTypes: PAGE_FADE_TRANSITION_TYPES };
