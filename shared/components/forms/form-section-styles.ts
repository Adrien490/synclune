/**
 * SSOT du traitement visuel des sous-cards de section de formulaire admin
 * (Créer/Éditer Produit, Variante, Code promo, etc.).
 *
 * Évite la dérive entre les ~10 sections de formulaire des modules products
 * et discounts, où le chrome de card et la typo de titre étaient dupliqués
 * inline (ou redéfinis localement par module).
 *
 * - `FORM_SECTION_CARD_CLASS` : chrome mobile-flat → desktop-card. Appliqué à
 *   la `<Card role="region">` qui enveloppe chaque section. Mobile : pas de
 *   bordure/ombre/fond (densité iOS). Desktop (`md:`) : Card complète.
 * - `FORM_SECTION_TITLE_CLASS` : titre mobile-first (uppercase tracking-wide,
 *   petit) avec override desktop (`md:`) qui revient à la typographie standard.
 *
 * ## Pourquoi `md:` et non `lg:`
 *
 * Le seuil est celui du **chrome admin** (barre latérale + bottom bar, `md` =
 * 48rem — cf. CLAUDE.md § Conventions UI). Tant que ces sections
 * basculaient à `lg` (64rem), la plage 768–1023px — l'iPad en portrait — rendait
 * le chrome desktop AVEC un formulaire encore en mode téléphone : pas de carte,
 * pas de bordure, titres gris en capitales. Deux seuils sur le même écran se
 * lisent comme une feuille de style qui n'a pas chargé, pas comme une décision.
 *
 * ⚠️ Les `CardHeader`/`CardContent` des consommateurs portent leur padding en
 * `md:px-6` pour la même raison : le padding doit basculer avec le chrome, sinon
 * la carte apparaît à 768 mais son contenu reste collé au bord.
 */
export const FORM_SECTION_CARD_CLASS =
	"md:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none md:gap-6 md:rounded-xl md:border md:py-6 md:shadow-md";

/**
 * ⚠️ `md:text-2xl` n'est pas un embellissement : c'est l'échelle annoncée.
 *
 * La direction pose un ratio de 1,25 (12,8 / 16 / 20 / 25 px), avec le titre de
 * section au dernier cran. Le `md:text-base` d'origine le laissait à 16 px —
 * strictement la taille du corps de texte, donc une section qui ne pesait pas plus
 * lourd que son propre contenu. `text-2xl` (24 px) est le cran Tailwind le plus
 * proche des 25 px visés ; rester sur l'échelle standard vaut mieux qu'une valeur
 * arbitraire pour 1 px.
 *
 * `md:font-normal` est requis, et pas cosmétique : `CardTitle` pose
 * `md:font-display md:font-normal`, et sans le rappeler ici le `font-semibold`
 * mobile fuitait vers le desktop. La display s'y serait rendue en semi-gras, seul
 * endroit du dépôt où la police display n'est pas en graisse normale.
 */
export const FORM_SECTION_TITLE_CLASS =
	"text-muted-foreground text-sm font-semibold tracking-wide uppercase md:text-foreground md:text-2xl md:font-normal md:normal-case md:tracking-normal";

/**
 * Repère de gouttière : une règle colorée sur le bord gauche de la section.
 *
 * À combiner avec un `data-accent="rose|lavender|mint|sun"` sur la même Card —
 * `--section-accent` vient de `app/styles/section-accents.css`, la SSOT des quatre
 * accents de marque (le rose y est dérivé de `--primary`, jamais dupliqué).
 *
 * Le repère change de bord avec le chrome. Sous `md` les sections sont à plat et
 * pleine largeur : une règle verticale n'y aurait rien à border, donc l'accent se
 * pose EN HAUT. À partir de `md`, la section redevient une card et l'accent passe
 * dans la gouttière gauche. Sans la variante mobile, toute l'histoire chromatique
 * de la surface n'existait que sur desktop.
 *
 * ⚠️ C'est une SURFACE, pas de l'encre. Les quatre accents plafonnent entre 1,5:1
 * et 2,5:1 sur le fond — inutilisables pour du texte, très bien pour un aplat ou
 * un trait.
 *
 * L'indice de type `(color:…)` est explicite à dessein : `border-l-` porte deux
 * familles d'utilitaires chez Tailwind — `border-l-4` est une largeur,
 * `border-l-red-500` une couleur. Vérifié sur Tailwind 4.3.3, la forme nue
 * `border-l-(--section-accent)` compile bien elle aussi en `border-left-color` ;
 * l'indice ne corrige donc pas un bug, il évite juste au lecteur d'avoir à
 * connaître l'heuristique.
 *
 * ⚠️ L'ordre compte : `FORM_SECTION_CARD_CLASS` pose `border-0`, et c'est
 * `border-t-4` qui doit gagner sous `md`. Vérifié dans le CSS compilé — Tailwind
 * émet bien `.border-t-4` APRÈS `.border-0`, donc la règle du haut s'applique.
 */
export const FORM_SECTION_ACCENT_CLASS =
	"border-t-4 border-t-(color:--section-accent) md:border-t-0 md:border-l-4 md:border-l-(color:--section-accent)";
