# Passage en code — consignes consolidées de la série

> Tout ce que la maquette (`landing.pen`) exige du code, extrait des entrées « en code : … »
> de `NOTES.md` (la source de détail : chaque item cite son tour) et des champs `context`
> posés dans le `.pen`. Écrit le 2026-08-17 à l'audit du dossier. Compagnons : `SHOOTING.md`
> (photos), `AUDIT-MAQUETTE-2026-08-17.md` + `-17b.md` (backlogs statués), `ETAT.md` (état
> courant et arbitrages ouverts), `11-livraison-au-code.md` (les 24 critères que la maquette ne
> peut que spécifier), et les deux grilles pour re-noter le site rendu :
> `docs/LANDING-BEST-PRACTICES.md` § 9 (conformité /100) et `_signature.md` (désirabilité /20).
> État des notes de la maquette : **82/100 en conformité, 18/20 en signature** (re-notée sur
> pièce le 2026-08-19 après application des propositions — rapport au carnet ; plus aucun
> arbitrage ouvert, cf. `ETAT.md`).

## Avant le moindre token — les arbitrages bloquants

1. ~~**Franco de port**~~ — **TRANCHÉ le 2026-08-18 : le franco est ABANDONNÉ.** Le placeholder
   `{franco}` n'avait aucune source dans le code (`shipping-rates.ts`) ; il est retiré de toute
   la maquette. **Ne pas réintroduire `{franco}` sans que Léane crée l'offre en base.**
   ⚠️ **Le bandeau livraison lui-même est RETIRÉ le 2026-08-19** (Adrien, pendant le passage en
   code avorté : « pas de bandeau livraison ») : la barre haute est la rangée principale seule,
   comme dans le code actuel — ne rien y ajouter. `{frais}` et `{délai}` vivent dans le bloc
   « En pratique » de la FAQ et la réassurance du pied de page. Les deux nœuds bandeau des
   composants chrome sont conservés `enabled:false` dans la maquette (les rétablir est un
   arbitrage, pas un correctif).
2. **Tuiles du hero ENTIÈRES — dérogation assumée au § 1.5 (2026-08-18).** Adrien a demandé
   deux fois que les photos du hero ne soient pas coupées ; c'est tranché, les tuiles sont
   entières sur les deux formats. ⚠️ Cela déroge sciemment au critère « la section suivante est
   visiblement coupée par la flottaison » (illusion de complétude, NN/g) : le premier écran perd
   son signal de continuation et la grille retire 1 pt. Coût accepté. **Ne pas "corriger" en
   re-coupant les tuiles** — c'est une décision, pas une régression. Si un signal de scroll
   redevient souhaitable, le chercher AILLEURS que dans la coupe des photos (le carnet du
   2026-08-18 liste les pistes).
   Conséquence de forme : pour rester au ratio 4:5 imposé par la spec, les tuiles desktop
   passent de 184×230 à **148×185** (mobile inchangé, 168×210).
3. ~~**Système bicolore rose/or vs rotation lavande/menthe/soleil**~~ — **TRANCHÉ le
   2026-08-19 (Adrien) : BICOLORE rose/or.** En code : créer les tokens `or` `#ffe2a2` et
   `or-encre` `#896e2c` dans `globals.css` (avec leur test de contraste — or-encre/papier
   4,72:1) et **retirer la rotation `[data-accent]`** (`app/styles/section-accents.css`).
   Raison sur pièce (planches `00-systeme/accents-*`) : la rotation ne sait pas écrire
   (lavande 2,51:1, menthe 1,85, soleil 1,54, sans déclinaison encre).
4. **Arbitrages nº 2-4 tranchés le 2026-08-19 (Adrien)** : SIX sections (pas de fusion) ·
   sur-titres PARTOUT — à **réintroduire sur les 5 routes boutique** au handoff · « avec
   amour » remplacé par « les doigts encore pleins de peinture » (pas de purge systématique
   de la formule ailleurs). Le fond du hero est tranché aussi : **piste D** (filigrane animé
   à la pose — consigne au § Hero). Plus AUCUN arbitrage ouvert (liste : **`ETAT.md`**).
   Les trois propositions (grille respire · FAQ-message · pastilles gouttes) sont **prises et
   appliquées** le 2026-08-19 (délégation Adrien, réversible par Léane) — consignes de code
   dans les sections concernées ci-dessous.

## Valeurs dynamiques — rien de chiffré ne s'écrit en dur

- **« Voir les 14 créations »** (hero + section 2) : compte des créations actives en base,
  même valeur partout. (Tours 1-2.)
- **Comptes par collection** (6/5/3 dans la maquette) : inventés pour sommer à 14 — à lire en
  base. (Tour 3.) ⚠️ **Aucun compte par type sur les puces** — la mention « Colliers (3) » du
  tour 4 a été abandonnée et ne doit pas revenir : sur un catalogue de 14 pièces, des « (1) »
  et « (2) » afficheraient la minceur, pas la richesse (passe types du 2026-08-19, context
  posé sur les 4 frames de section).
- **« Voir les 4 collections »** (section 3, lien ×2) : compte des collections **actives** en
  base — même famille que le « 14 ». ⚠️ Le **chapô** de la section énumère les territoires
  RÉELS (« le jardin, le ciel de nuit, la pluie ou les musées ») : **copie ÉDITORIALE à réviser
  quand une collection naît ou meurt** — la structure survit à 9 (aucun compte en dur), la
  phrase, elle, est vivante. (Audit collections 2026-08-19, P3, contexts posés sur les 4
  en-têtes.)
- **Prix des 8 cartes** (38/26/29/28/24/42/18/14 €) : placeholders plausibles, la base fait
  foi. (Tour 2.)
- **Badges de rareté** (« PIÈCE UNIQUE », « IL EN RESTE 2 ») : lus en base, et tenus au test
  de la ligne claire — la phrase doit rester vraie si la visiteuse revient demain. (Tour 2.)
- **`{frais}`** = `SHIPPING_RATES`, **`{délai}`** = `PREPARATION_BUSINESS_DAYS` +
  `estimatedDays` (`modules/orders/constants/shipping-rates.ts`). ⚠️ **`{franco}` n'existe
  plus** — franco abandonné le 2026-08-18, et **le bandeau livraison n'existe plus non plus**
  (2026-08-19) : les deux placeholders ne vivent qu'en FAQ et pied de page, cf. arbitrage nº 1.

## Système

- `marge-page` desktop 144 de la maquette = en code **marge min 64 + `max-width` 1152**. (Tour 0.)
- Hauteurs de section en **`svh`/`dvh`, jamais `vh`**. (`synclune-systeme.md`.)
- Icônes : Phosphor via `@phosphor-icons/react/ssr` — house, storefront, heart, tote,
  magnifying-glass, plus, minus. (Tour 0.)
- Boutons : le **repli de libellé** se fait par `max-width` en code — Pencil ne sait pas
  l'exprimer ; dans la maquette, toute instance à largeur contrainte porte l'override de
  libellé (recette au tour 9).

## Chrome

- ~~**Bandeau livraison**~~ — **RETIRÉ le 2026-08-19** (cf. arbitrage nº 1 ci-dessus) : la
  barre haute du code ne change pas de structure. Le liseré 1 px encre = `border-bottom` de
  l'état flottant — jamais d'ombre floue. (Tour 10, frame `00-systeme/chrome-scrollee`.)
- **Badge compteur du panier : TRANCHÉ le 2026-08-19 — ROND rose à chiffre encre, 18×18**
  (pilule au-delà de 9 ; harmonisé sur les deux surfaces restantes à l'audit navbar). La goutte
  de la planche motion est archivée non retenue.
- **Chrome re-vérifiée contre la STRUCTURE du code le 2026-08-19** (`AUDIT-NAVBAR-2026-08-19.md`,
  appliqué — le « vérifier la chrome contre le code » du tour 0 est SOLDÉ, contexts posés) :
  - **Barre haute mobile = burger + lockup centré + nom de salle au scroll** — parité
    `navbar.tsx` / `navbar-room-label.tsx` : la dédup du 2026-08-04 est CONSERVÉE, aucune
    action dans la rangée sous `lg` (recherche/favoris/panier vivent dans la barre basse).
    Zéro changement de structure en code ; le nom de salle est déjà en `font-display` (parité),
    encre 70 %, aria-hidden, jamais un lien.
  - **Le lockup porte le MARK** (les deux barres, tailles code 48/40) : mêmes chemins que
    `logo-mark.paths.ts`, étincelles `escaping` (convention : navbar seule), animées au
    survol/focus (`group/logo`). ⚠️ Wordmark de la refonte = **Winky Sans 24/20** (décision
    tour 0) : remplace la typo Kalam de `LogoWordmark` au passage en code (c'est sa SSOT).
  - **Recherche desktop** : pilule « Rechercher ⌘K » = `QuickSearchTrigger variant="bar"`
    restylée papier + trait encre 1,5, radius pilule (structure et aria-label inchangés) ;
    icône seule sous `lg` inchangée.
  - **Méga-menu Créations CONSERVÉ** (types + nouveautés + collection vedette), restylé
    papier/encre ; caret 12 px ajouté au trigger. « Les collections » reste un lien simple
    (bento supprimé le 2026-08-08 — pas de caret, pas de panneau vide).
  - **Volet menu et méga-menu DESSINÉS dans la DA (lot 5, 2026-08-19)** — planches
    `00-systeme/chrome-volet-menu` et `00-systeme/chrome-mega-menu`, structure du code respectée.
    En code, quatre changements : (1) le volet perd les comptes « n pièces » par type (même motif
    que les puces de la section 4 : sur 14 pièces, « 1 pièce » affiche la minceur) ; (2) la 8ᵉ
    cellule « Voir tout » devient « Voir les 14 créations » (portée chiffrée, règle § 9, même
    source que le hero) ; (3) panneau et volet se détachent au TRAIT (encre 1, radius 16 / liseré
    de tranche), plus aucune ombre floue — le `shadow-premium-rose` du spotlight disparaît ;
    (4) tuiles et cellules sur fond gris (`$gris`), badge compteur rond 18 partout. Bloc admin,
    encart « atelier en pause » et fallback « À découvrir » : inchangés (contexts posés).
  - **États de la chrome** (planche `00-systeme/chrome-etats`) : lien de nav survol ET focus =
    **squiggle** (`SQUIGGLE_PATH` — remplace l'aplat d'accent d'`aria-current`) + anneau encre
    2 px au focus ; boutons icône : fond gris rond au survol, anneau au focus ; onglets barre
    basse : anneau au focus. Survol ⇒ focus partout, jamais d'anneau rose.
  - Barre basse à 320 px : libellés `text-xs + truncate` (déjà le code) ; si « Rechercher »
    tronque, raccourcir le libellé en « Recherche » plutôt que laisser l'ellipse.
  - Libellés de référence inchangés : nav « Les créations » / « Les collections », barre basse
    5 onglets (`e2e/shop-mobile.spec.ts`), médiateur CNPM (`shared/constants/consumer-law.ts`).
- **Pied de page sur `rose-pale` `#fdf0f8`** (2026-08-17 ; REFONDU à l'audit pied du
  2026-08-19) : créer le token (surfaces uniquement) ; filet interne `#06070b24` =
  `var(--foreground)` à 14 %. **Réassurance du pied** : « Expédié sous {délai} · Livraison
  France {frais} · Union européenne {frais-ue} · Retours et échanges sous 14 jours · Commande
  sans compte » — SSOT `PREPARATION_DELAY_LABEL` / `SHIPPING_RATES.FR` / `.EU`, la chaîne
  retours EXACTE de `ProductReassurance`, jamais de littéral. **Légal complet, 8 entrées** :
  CGV (libellé long assumé) · Mentions · Confidentialité · Rétractation · Cookies ·
  Accessibilité · Informations légales (le hub — l'anti-orphelin du 2026-08-06) · « Modifier
  mes préférences (cookies) » = BOUTON (`ManageCookiesButton`). **Email en clair**
  `contact@synclune.fr` + `CopyButton` (le libre-service reste AU-DESSUS, comme `footer.tsx`
  le réclame). **Lockup mark + wordmark = UN lien vers /** (parité `Logo`, viewTransitionName
  `shop-logo-footer`). **PAS de rail paiement** Stripe/Visa/MC/CB — assumé § 4.5 (la preuve
  porte sur le tunnel), divergence écrite en context. **© sans année** (cache `reference` 7 j —
  décision `footer.tsx`, ne pas la remettre). **Réserve barre basse** :
  `pb = --bottom-bar-height + 16` (parité `FOOTER_SHELL_CLASS`, 2.4.11 MESURÉ — la maquette
  dessine 72). Survol de lien = fond `$gris` arrondi (équivalent maquette du `bg-primary/5`),
  focus = anneau encre 2 px (planche chrome-etats, « Rangée pied ») ; cibles `min-h-11`.
  **Décision nº 8 sur les liens** : « L'atelier » ne se rend que quand `/a-propos` existe ;
  commande personnalisée → mailto ; « Suivi de commande » EXIGE un état sans token ;
  « Questions fréquentes » → ancre `#faq` À RECRÉER ; TikTok ajouté (parité `BRAND.social` ×2) ;
  le médiateur CNPM reste du TEXTE dans le pied, son URL en lien externe.
- **Transitions en dégradé entre sections** (assemblages) : papier→or avant les types ·
  or→rose-pale puis rose-pale→papier autour de l'atelier (qui prend un **bain `rose-pale`**
  depuis le 2026-08-19) · papier→rose-pale avant le pied — desktop 64 px, mobile 16 px
  (hauteurs réglées par le relevé des plis). Le papier→rose-pale est quasi invisible (1,08:1),
  c'est un raccord de surface assumé, pas un effet à reproduire en plus voyant.

## Carte produit

- **Toute la carte est UN SEUL lien** (`context` posé sur le composant) ; `aria-label`
  cohérent avec le texte visible. (Audit maquette P2.6.)
- **Survol** : squiggle sous le nom = `SQUIGGLE_PATH` de
  `shared/components/hand-drawn/paths.ts` — c'est déjà l'affordance de lien du code.
  **Focus** : le même squiggle + anneau encre 2 px, offset 2, sur la carte entière. Ajuster
  l'interlignage du nom sur deux lignes : dans la maquette le squiggle frôle les pastilles.
  (Tour 10.)
- **Sous 768** : favori en bas-droite de la photo (en haut, il chevauche le badge). (Tour 2.)
- **Favori actif** : touche rose (`ACCENT_SHAPE_PATHS.heart`) qui déborde DERRIÈRE le glyphe
  encre — jamais un cœur rose seul (1,55:1 ne signale rien). (Passe créative.)
- **Pastilles de variantes : RONDES.** La variante gouttes a été appliquée puis **rejetée** le
  2026-08-19 (Adrien : pas en color swatch) — ne pas la re-proposer.
- **Pastilles = les VRAIES variantes lues en base** (mêmes données que la boutique) : une
  pièce unique n'en montre AUCUNE (la Bague Nuit étoilée du tour 2 le montre), les 4
  pastilles uniformes des autres cartes sont un placeholder de composant. Coloris NOMMÉS
  dans l'accessible name (« Existe en framboise, turquoise, citron, lilas ») — l'anneau
  `$gris` reste décoratif, on ne fonce pas un trait pour un 3:1 qu'une pastille bonbon ne
  peut pas tenir. (Audit créations 2026-08-19.)
- Le lien texte de la carte vendue (~22 px de haut) est acceptable **si** toute la carte est
  cliquable — exception « lien en ligne » de WCAG 2.5.8. (Tour 2.)
- Carte vendue = une porte : « Commander une pièce comme elle » pointe vers la **commande
  personnalisée** — garder ce libellé. ⚠️ Tant qu'aucune page commande personnalisée n'existe,
  la cible est `mailto:BRAND.contact.email` — JAMAIS de lien mort (passe « 20/20 », context
  posé sur le composant). (Tour 2 + 2026-08-19.)

## Hero

- **Tuiles de la frise = photos des premières créations du catalogue**, choisies pour
  l'**étalement des types**, pas par récence (`context` posé sur les deux frises) — aucun
  shooting dédié. (Tour 1, audit maquette P1.2.)
- **Micro-balancement des pampilles** : ±2° autour du point d'attache, UNE fois au
  chargement, déphasé ~80 ms par tuile, ease-out ~1,2 s, désactivé sous
  `prefers-reduced-motion`. (Planche `00-systeme/motion`.)
- **Filigrane des marges (piste D, tranchée le 2026-08-19)** : 5 formes — 3 cœurs, 2 gouttes —
  au trait encre 10 % dans les marges desktop du bloc titre ; elles TOMBENT en place UNE fois
  au chargement (translateY −16 → 0, opacité 0 → 1, déphasage 60-120 ms, ease-out ~1 s), hors
  chemin du LCP ; `prefers-reduced-motion` : posées d'emblée. Jamais de boucle.
  (Spec sur la planche motion + `context` du groupe `filigrane-hero`.)
  **Depuis le 2026-08-19 (« D en couleur », prise)** : 2 des 5 formes portent un remplissage
  translucide — cœur `#f7a8d866`, goutte `#7fd8d866` — trait encre 10 % et animation inchangés.
  **Depuis la passe « 20/20 » (2026-08-19) : le MOBILE a son filigrane** — 2 formes seulement,
  LES DEUX colorées (cœur en haut-droite du bloc titre, goutte en marge gauche —
  `filigrane-hero-mobile` dans les deux heroes mobiles), mêmes règles de pose et de réduit.
- **Frange posée sur la barre basse (mobile)** : la frise se termine à ~789 pour une barre à
  788 — c'est le signal de continuation de l'écran 1 (le pli 1 du relevé), à REPRODUIRE en
  code. Le retrait du bandeau a été absorbé par les paddings du bloc titre (haut 64, bas 24
  desktop / haut 64, bas 12 mobile) — ne pas le rendre en « air en bas du hero ».

## Sections

- **Créations (desktop)** : les 8 cartes s'échelonnent — tops **0·24·8·32** par colonne
  (`nth-child`, desktop seulement, le 2 colonnes mobile reste aligné). Proposition « la grille
  respire », prise le 2026-08-19 ; coût accepté ~32 px par rangée. Au pli 2 (y 1600), une
  goutte de filigrane traverse la flottaison depuis la marge droite — en code : décor absolu
  au sommet de la rangée 2 (`nth-child(5)`, `translateY(-50%)`), même recette que la goutte
  du pli 1 du hero. Images de la grille en `loading="lazy"`, jamais `priority` (la section
  commence pile à la flottaison, le LCP vit au hero). (Audit créations 2026-08-19.)
- **Collections** : plafonner la section à ~6 cartes + lien (la grappe tient à 6 et 9, mais
  6 est la recommandation) ; visuels par carte = requête **partagée avec le méga-menu,
  plafond 4** ; une collection sans photo se rend en état `sans-visuel` — qui porte depuis la
  passe « 20/20 » une note manuscrite « bientôt ! » (cursive = ponctuation, la ligne « En
  préparation — reviens bientôt » reste le texte porteur). **Recette de grappe (desktop)** :
  3 colonnes remplies en tourniquet (carte 1→col 1, 2→col 2, 3→col 3, 4→col 1…), offsets de
  tête **0·64·32** par `nth-child` ; mobile : pile, collage en **miroir** (`scaleX(-1)`) un
  rang sur deux, sur le collage SEUL. **Survol/focus** : squiggle sous le nom ; focus = même
  squiggle + anneau encre 2 px sur la carte (planche États d'interaction de la section
  carte-collection — l'état vide est un lien aussi). **À 4 collections, le vide bas-droit de
  la grappe est une respiration ASSUMÉE** (arbitrage audit collections — ne pas re-répartir
  sans décision) ; les cellules photo restent des emprunts aux produits, la polychromie vient
  des photos elles-mêmes. Images `loading="lazy"`, JAMAIS `priority` (section entièrement
  sous la flottaison, le LCP vit au hero) ; grappe = `<ul>` de cartes-liens, accessible name
  du sans-visuel « <nom> — en préparation ». (Tour 3 + audit collections 2026-08-19.)
- **Types** : les puces SONT les liens vers les pages de type ; hauteur de puce **44 px**
  (relevée dans la maquette à la passe « 20/20 » — `min-h-11` en code, plus rien à corriger).
  (Tour 4 + 2026-08-19.)
- **FAQ** : ⛔ **ne pas ré-émettre le JSON-LD `FAQPage`** avec le retour visuel de la FAQ
  (`context` posé ; rich result retiré, verrouillé par
  `catalogue-single-breadcrumb.regression.test.ts`). La rangée d'accordéon ENTIÈRE est le
  bouton (58 px) — l'icône seule fait 20 px. (Tour 6, audit maquette P1.3.) **La réponse
  dépliée est une bulle de message signée** (fond gris, rayons 20/20/20/4 — coin-queue en
  bas-gauche —, padding 16/24, signature « — Léane » en cursive rose-encre : de la
  ponctuation, pas un texte porteur). Proposition prise le 2026-08-19.
- **Atelier** : « Lire l'histoire de l'atelier » pointe vers la future page atelier/à-propos
  (`ROUTES.SHOP.ABOUT`, `/a-propos`) — garder ce libellé, mais **ne rendre le lien que quand la
  page existe** : d'ici là la section se termine sans bouton, le débord de la FAQ est la sortie
  (passe « 20/20 », contexts posés sur les 4 sorties). (Tour 5 + 2026-08-19.) **Bain `rose-pale` sur toute la section** (proposition prise le
  2026-08-19, desktop + mobile) : fond `--color-brand-rose-pale` en code, texte encre (18,21:1),
  transitions d'assemblage ajustées (cf. § Chrome).
- **Dessins en couleur (proposition prise et appliquée le 2026-08-19, réponse au « site un peu
  blanc » de Léane)** : les tracés du décor dessiné portent des remplissages bonbon SOUS le trait
  encre 1,5 — vignettes des 8 types (desktop + mobile), gouttes de l'état `sans-visuel` des
  collections, touche du geste d'atelier. Couleurs de CONTENU en **hex littéraux** (#f7a8d8
  #ffb26b #ffe066 #a8e063 #7fd8d8 #c7a8e8 #8ab6f0 #f28aa2), **jamais un token** — le balayage
  « une seule couleur d'accent par section » doit rester propre. En code : `fill` sur les paths
  existants, 2 à 6 par dessin, jamais un coloriage complet. Réversible (veto Léane) en retirant
  les fills.

## Bannière cookies & toast panier

- **Texte de la bannière** : la finalité « mesurer les visites » est une HYPOTHÈSE — vérifier
  contre le store `cookie-consent` avant d'écrire le texte définitif. Elle recouvre le
  contenu (pas de poussée), s'empile sur `--bottom-bar-height`, parité stricte
  accepter/refuser (deux pilules identiques, un clic chacune). (Tour 7.)
- **Toast d'ajout au panier** — surface qui manque au code : papier + trait encre 1,5 +
  rayon 20 (grammaire de la bannière), goutte rose cerclée d'encre, « C'est dans ton
  panier » + lien « Voir le panier » ; mobile 8 px au-dessus de la barre basse ; glissement
  d'entrée < 0,1 s, jamais d'`opacity: 0` au repos, disparition seule ~4 s. (Planche motion.)

## Carte de partage (OG)

- La carte de la maquette est celle de l'ACCUEIL ; décliner les 3 routes dynamiques
  (produit/collection/famille : photo + mêmes hex). **100 % hex explicites** — le moteur
  ignore `oklch()` et les variables en silence. Le rendu satori réel (chargement Winky
  Sans/Onest, rendu des paths) n'a jamais été vérifié — à tester au passage. (Tour 7.)

## Photos

- `SHOOTING.md` : 9 photos, toutes 4:5 — le portrait de Léane est une **vraie photo**,
  obligatoire (ni illustration, ni banque d'images). Hero et collections n'ont **aucun
  shooting dédié** (photos empruntées aux produits).
- Depuis la passe « 20/20 » (2026-08-19), **chaque placeholder annonce son sujet** (grappe,
  cabochon, cascade, volute, anneau, cadre de musée, cœur pour le portrait…) au lieu d'une
  goutte uniforme : c'est un enrichissement de la checklist de shooting, PAS un décor à
  reproduire en code — en code, ces emplacements sont des photos réelles. Seuls restent
  dessinés en code : l'état `sans-visuel` des collections (avec sa note « bientôt ! »), les
  vignettes de types, le geste d'atelier, les puces de la FAQ et le filigrane du hero.
