import { Winky_Sans, Onest, Kalam } from "next/font/google";

// Pile de repli de la display. Elle n'existait PAS (audit du premier écran,
// 2026-08-05) : `--font-display` était émise comme `"Winky Sans"` toute seule —
// ni face métrique ajustée, ni famille générique — là où `--font-sans` valait
// `"Onest", "Onest Fallback"` et `--font-cursive` `"Kalam", "Kalam Fallback"`.
// Le seul élément qui porte le LCP mobile (mesuré) retombait donc sur la police
// par défaut de l'UA, une SERIF, avant de re-flower.
//
// Mesuré au rendu (Chromium, woff2 réellement émis, `document.fonts.ready`) sur
// la chaîne du h1 « Des bijoux colorés, faits un par un » à corps égal :
//   Winky Sans 300 : 1392,70 px · system-ui (SF) : 1383,59 px → **0,66 % d'écart**
//   Arial          : 1506,35 px                              → 8,15 % d'écart
// `system-ui` est donc le repli le plus proche en largeur, et l'écart tient sous
// le seuil de 2 % au-delà duquel une face `@font-face` maison à `size-adjust`
// se justifierait (elle vaudrait 94,94 % contre Arial, mesuré aussi).
//
// ⚠️ Les 0,66 % valent pour la plateforme mesurée (macOS/iOS → SF Pro) ;
// `system-ui` désigne Roboto sur Android et Segoe UI sur Windows. `sans-serif`
// derrière est le plancher — l'important est qu'il n'y ait plus de serif.
// ⚠️ Sur le `h1` de l'étal les overrides `ascent`/`descent` seraient de toute
// façon INERTES : son `line-height` est numérique et explicite (`leading-[1.02]`),
// donc la hauteur de ligne ne dérive pas des métriques de la police. Ce qui
// décale, c'est la LARGEUR d'avance (elle décide du nombre de lignes) — d'où le
// critère ci-dessus. Si une mesure de CLS l'exige un jour, l'échappatoire est une
// face `Winky Sans Fallback` déclarée à la main : ascent 106,38 %, descent
// 33,71 %, size-adjust 94,94 % contre Arial (valeurs mesurées le 2026-08-05).
//
// ⚠️ La pile est écrite EN LITTÉRAL dans chacun des deux loaders display, et il
// faut résister à l'envie de la factoriser dans une constante : next/font analyse
// STATIQUEMENT les options (il doit résoudre les fichiers au build, pas à
// l'exécution), donc `fallback: DISPLAY_FALLBACK` casse le build sur
// « Font loader values must be explicitly written literals » — invisible au
// typecheck comme au lint. La duplication est le prix de cette contrainte ; c'est
// `font-fallback-declared.regression.test.ts` qui garde les deux copies d'accord.

// Système S5 « Encre et papier » (migration du 2026-08-05, remplace
// Fraunces / Figtree / Sacramento). Les variables CSS ne changent JAMAIS ici :
// c'est ce qui rend les 113 `font-display` / 32 `font-cursive` du repo insensibles
// à une migration de famille.

// Winky Sans — display « trait d'encre », informelle et adulte (Typofactur, 2024).
// Variable wght 300..900 (couvre le `font-light` des h1).
// PERF : le préchargé passe de 67 388 o (Fraunces opsz+wght) à 37 648 o (romaine).
// L'italique vit dans un SECOND loader, non préchargé (cf. `winkySansItalic`).
export const winkySans = Winky_Sans({
	subsets: ["latin"],
	display: "swap",
	// ⚠️ Romaine SEULE. `style: ["normal", "italic"]` faisait émettre les DEUX
	// woff2 en préchargé (next/font ne précharge pas par style) : 37 648 + 40 572
	// = 78 220 o sur le chemin critique de TOUTES les routes, alors qu'aucun écran
	// ne peint un glyphe d'italique display au chargement (les 6 sites sont des
	// popups de méga-menu desktop et un heading admin). Audit du premier écran,
	// 2026-08-05.
	style: ["normal"],
	variable: "--font-display",
	// Hero h1 uses the display face above-fold; without preload the woff2 fetched
	// in ~3s on desktop, blocking LCP element render.
	// ⚠️ Ne pas justifier ce preload par « le h1 porte le LCP mobile » : cette
	// identité a changé de signe entre deux mesures (h1 le 2026-08-05, première
	// photo le 2026-08-06 en dev — marge ~3 %, instable). Le preload tient sans
	// elle : la display peint au-dessus du pli sur TOUTES les routes et le h1
	// reste un candidat LCP. Re-mesurer en prod avant tout ré-arbitrage.
	preload: true,
	// ⚠️ Winky Sans est ABSENTE de capsize-font-metrics.json (Next 16.3.0) :
	// aucune face de repli à métriques ajustées ne peut être générée. À réévaluer
	// à chaque upgrade Next (la table suit les ajouts Google Fonts avec retard).
	// ⚠️ Ce réglage à lui seul laissait `--font-display` sans AUCUN repli : c'est
	// `fallback` ci-dessous qui empêche la retombée sur la serif de l'UA.
	adjustFontFallback: false,
	fallback: ["system-ui", "sans-serif"],
});

// L'italique display, hors du chemin critique.
//
// Pourquoi un second loader et pas un `style` de plus sur la romaine : `preload`
// est une option DU LOADER, pas du style. Un seul appel déclarant les deux styles
// préchargeait les deux woff2 ; deux appels permettent de ne précharger que la
// romaine.
//
// ⚠️ Et les deux faces cohabitent quand même, parce que next/font émet la MÊME
// `font-family` pour deux appels de la même famille Google — vérifié dans le CSS
// bâti : `@font-face{font-family:Winky Sans;font-style:normal}` et
// `@font-face{font-family:Winky Sans;font-style:italic}`. Donc `italic` posé sur
// `font-display` sélectionne la VRAIE italique dessinée, et il n'y a aucune
// variable `--font-display-italic` à créer (elle vaudrait exactement la même chose
// que `--font-display`, en suggérant une distinction inexistante).
//
// ⚠️ C'est ce partage de famille qui rend l'astuce sûre : si un jour next/font
// hachait un nom par appel, les 6 usages d'italique retomberaient SILENCIEUSEMENT
// en faux-oblique. L'invariant « les deux loaders chargent la même famille Google »
// est donc verrouillé par `display-italic-family.regression.test.ts`.
export const winkySansItalic = Winky_Sans({
	subsets: ["latin"],
	display: "swap",
	style: ["italic"],
	// La variable n'est lue par personne : elle est le HOOK qui garde ce loader — et
	// donc son `@font-face` — dans le graphe de modules (`app/layout.tsx` la publie
	// sur `<html>`). Ne pas la « nettoyer » comme une variable morte : sans
	// référence au loader, la face italique disparaît du CSS.
	variable: "--font-display-italic",
	// Aucun glyphe d'italique display n'est peint au premier paint, sur AUCUN
	// viewport : les 6 sites sont des popups de méga-menu (desktop, à l'ouverture)
	// et un heading admin. Précharger 40 572 o pour eux volait la bande passante
	// au h1 sous `lg` et à la photo LCP au-delà.
	preload: false,
	adjustFontFallback: false,
	// Même pile que la romaine ci-dessus — cf. l'avertissement sur la duplication.
	fallback: ["system-ui", "sans-serif"],
});

// Onest — sans humaniste-géométrique chaleureuse, variable wght 100..900.
// `tnum` VÉRIFIÉ dans la table GSUB (les prix tabulaires du panier/checkout
// continuent de s'aligner — le Δ 0,00 px de cart-sheet-footer.test.tsx tient).
// ⚠️ Pas d'italique dessinée : les ~28 fichiers d'italique de corps (pages
// légales, cartes admin…) rendent en oblique synthétisé par le navigateur —
// assumé sur une sans ; si ça finit par gêner, Plus Jakarta Sans (italiques +
// tnum, ~12 Ko) est le remplacement documenté dans l'audit.
export const onest = Onest({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-sans",
	// PERF : pas de preload. Sur mobile l'élément LCP est le h1 display (préchargé),
	// PAS le corps de texte. Précharger un 2ᵉ woff2 sur un chemin critique
	// network-byte-bound (LCP mobile 7–12s) vole de la bande passante à l'image/au
	// texte LCP. `display: "swap"` + la face de repli à métriques ajustées couvrent
	// le premier paint sans flash gênant.
	// ⚠️ Ce repli n'est PAS `system-ui`, contrairement à ce que disait ce
	// commentaire : Onest a ses métriques capsize, donc `adjustFontFallback` (au
	// défaut) émet une face `"Onest Fallback"` — un Arial local à
	// `size-adjust: 97.58%` — et `--font-sans` vaut `"Onest", "Onest Fallback"`
	// (vérifié dans le CSS émis). C'est ce mécanisme qui borne le CLS ici, et c'est
	// son ABSENCE sur la display qui a motivé la pile explicite ci-dessus.
	preload: false,
});

// Kalam — script manuscrit « feutre » : le seul script Google Fonts qui cumule
// une x-height exploitable (xH/capH 0,71 — Sacramento plafonnait à 0,40, d'où
// son rendu « apprêté et minuscule ») et de VRAIES graisses (300/400/700).
// Seule la 400 est CHARGÉE (usage signature uniquement) : déclarer 300/700 le
// jour où un usage naît, pas avant.
// A11Y : `--font-cursive` est RÉSERVÉE au décoratif non-essentiel (nom de marque,
// légendes, notes en marge) — jamais prix, libellés de formulaire,
// navigation fonctionnelle ni body (lisibilité faible des scripts à petite
// taille / dyslexie). Tel que chargé, mono-poids : ne pas appliquer
// font-bold/semibold (aucune graisse déclarée à rendre) ni `italic`
// (faux-oblique sur un script déjà incliné) sur les usages `font-cursive`.
// Boîte de ligne 1,59 em (desc −0,53) vs 1,46 pour Sacramento : les blocs
// signature respirent un peu plus haut — parité skeleton à re-mesurer.
export const kalam = Kalam({
	subsets: ["latin"],
	weight: "400",
	display: "swap",
	variable: "--font-cursive",
	// Navbar streams in via Suspense (after LCP) and atelier signature is below
	// the fold. `display: "swap"` keeps the fallback visible until Kalam loads —
	// no preload needed.
	preload: false,
});
