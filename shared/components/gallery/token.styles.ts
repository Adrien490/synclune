/**
 * Le « jeton » de la galerie — surface commune aux chevrons (`navigation.tsx`) et
 * à la loupe (`zoom-button.tsx`).
 *
 * Pourquoi une SSOT plutôt que deux listes de classes jumelles : les deux
 * composants répétaient mot pour mot une dizaine d'utilities (surface, anneau
 * d'encre, survol, transition, anneau de focus, repli contraste forcé). Toute
 * correction devait être faite deux fois — et c'est précisément ce qui s'était
 * produit : les conventions `forced-colors:` (`bottom-bar.styles.ts`,
 * `count-badge.tsx`) et `aria-haspopup="dialog"` n'avaient été appliquées qu'au
 * coup d'après, sur un fichier puis sur l'autre. Même patron que
 * `shared/components/bottom-bar/bottom-bar.styles.ts`.
 *
 * ⚠️ La GÉOMÉTRIE reste au call site (`absolute -left-3.5 md:flex`,
 * `ms-auto md:flex`) : c'est elle qui diffère, et c'est elle que
 * `__tests__/gallery-chrome-off-photo.regression.test.ts` lit dans chaque
 * composant. Ne pas la remonter ici.
 *
 * ## Le bord d'encre, et pourquoi il n'est pas `focus-ring`
 *
 * L'anneau au repos est un `box-shadow` d'encre (`--foreground`, **20,12:1** sur
 * `--card`) et non un remplissage coloré : `bg-primary` (#fdb8e4) plafonne à
 * **1,60:1** de contraste de bord contre un fond clair, là où WCAG 1.4.11 demande
 * 3:1 — sur un packshot de bijou pris sur fond blanc, le bouton n'aurait aucun
 * bord perceptible.
 *
 * L'anneau de FOCUS est un sandwich encre/rose/encre local, et non l'utility
 * `focus-ring`. ⚠️ La raison historiquement écrite ici — « `focus-ring` pose
 * `--ring` (le rose) seul » — est **périmée** : depuis, `@utility focus-ring`
 * (`app/globals.css`) peint d'abord un `outline: 2px solid var(--foreground)` en
 * CSS brut, soit la même encre à 20,12:1, et ne garde le rose (1,60:1) qu'en halo
 * de marque. Le contraste n'est donc plus l'argument. Ce qui reste, et qui suffit :
 * le jeton est un disque posé À CHEVAL sur la photo, dont le bord au repos est
 * déjà un `box-shadow` — un anneau de focus peint dans la même propriété reste
 * concentrique au bord existant à toutes les tailles, là où un `outline` doublé
 * d'un `box-shadow` produit deux traits d'encre d'épaisseurs différentes sur un
 * fond arbitraire. Si un jour le jeton perd son bord au repos, l'arbitrage se
 * rouvre et `focus-ring` redevient le bon choix.
 *
 * ## Le survol ne doit pas dépendre d'un `transform`
 *
 * `motion-reduce:transform-none` supprime `scale-105` ET `scale-95`. Quand il ne
 * restait que `can-hover:hover:bg-muted`, le seul retour de survol tombait à un
 * écart de **1,19:1** (`--card` → `--muted`) : celui qui a demandé « moins de
 * mouvement » se retrouvait avec le retour le plus faible sur les deux seules
 * commandes desktop de la galerie. « Moins de mouvement » n'est pas « moins
 * d'information » — d'où l'épaisseur du bord, portée par `--token-ring`.
 *
 * ⚠️ L'épaisseur passe par une **variable**, pas par une seconde déclaration
 * `can-hover:hover:shadow-[…]`. Deux règles sur la même propriété se
 * disputeraient l'ordre d'émission avec `focus-visible:shadow-[…]`, et un jeton
 * survolé PENDANT qu'il a le focus pourrait perdre son anneau. Avec la variable,
 * il n'existe qu'une déclaration `box-shadow` par état : le survol épaissit le
 * trait d'encre, le sandwich de focus reste intact par construction.
 *
 * ## ⚠️ `active:` seul est MORT sur un pointeur fin
 *
 * `can-hover` est un `@custom-variant` (`app/globals.css`), et Tailwind v4 émet
 * les variants personnalisés **après** les variants intégrés. Mesuré sur le CSS
 * compilé de ce dépôt : `.active:…` sort à l'offset ~231 000, `.can-hover:hover:…`
 * à ~334 000. À spécificité égale (une pseudo-classe chacun), **c'est le survol
 * qui gagne** — or à la souris, `:active` implique toujours `:hover`. Le
 * `active:scale-95` du chrome de la galerie n'a donc jamais rien fait sur un
 * pointeur fin ; il ne fonctionnait qu'au doigt, où il n'y a pas de `:hover`.
 *
 * D'où le doublon `active:` + `can-hover:active:` sur chaque état d'appui : le
 * premier couvre le tactile, le second repasse **après** `can-hover:hover:` dans
 * l'ordre d'émission (vérifié : ~334 362 contre ~334 200) et redonne à l'appui
 * son autorité à la souris. Ne pas « simplifier » en supprimant l'un des deux.
 *
 * Le motif `can-hover:hover:X active:Y` existe ailleurs dans le dépôt
 * (`navbar-styles.ts`, `fab.tsx`, `add-to-cart-card-button.tsx`…) et y souffre
 * du même angle mort — passe transverse à faire, hors périmètre de ce fichier.
 */
export const GALLERY_TOKEN_CLASS = [
	// Épaisseur du trait d'encre — pilotée par le survol et l'appui, jamais par un
	// `transform` (cf. l'entête). `active:` + `can-hover:active:` : le premier pour
	// le tactile, le second pour reprendre la main sur `can-hover:hover:`.
	"[--token-ring:1.5px] can-hover:hover:[--token-ring:2.5px]",
	"active:[--token-ring:3.5px] can-hover:active:[--token-ring:3.5px]",

	"bg-card size-11 items-center justify-center rounded-full",
	"text-foreground shadow-[0_0_0_var(--token-ring)_var(--foreground)]",
	"can-hover:hover:bg-muted",

	"motion-safe:transition-[transform,box-shadow] motion-safe:duration-[var(--duration-normal)]",
	"can-hover:hover:scale-105 active:scale-95 can-hover:active:scale-95 motion-reduce:transform-none",

	"outline-none focus-visible:shadow-[0_0_0_var(--token-ring)_var(--foreground),0_0_0_4.5px_var(--ring),0_0_0_6px_var(--foreground)]",

	// Contraste forcé (Windows High Contrast) : les `box-shadow` y sont supprimés,
	// donc l'anneau d'encre au repos ET le sandwich de focus disparaissent d'un
	// coup — le jeton devient un aplat `Canvas` sur `Canvas`, sans bord ni focus
	// visible. Repli en `outline`, aligné sur `bottom-bar.styles.ts` /
	// `count-badge.tsx`. ⚠️ `forced-colors:outline` (sans largeur) est requis
	// AVANT `forced-colors:outline-1` : `outline-none` ci-dessus pose
	// `--tw-outline-style: none`, que les utilities de largeur relisent.
	"forced-colors:outline forced-colors:outline-1 forced-colors:outline-[CanvasText]",
	"forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[Highlight]",
].join(" ");
