# Passage en code — consignes consolidées de la série

> Tout ce que la maquette (`landing.pen`) exige du code, extrait des entrées « en code : … »
> de `NOTES.md` (la source de détail : chaque item cite son tour) et des champs `context`
> posés dans le `.pen`. Écrit le 2026-08-17 à l'audit du dossier. Compagnons : `SHOOTING.md`
> (photos), `AUDIT-MAQUETTE-2026-08-17.md` + `-17b.md` (backlogs statués), `ETAT.md` (état
> courant et arbitrages ouverts), `11-livraison-au-code.md` (les 24 critères que la maquette ne
> peut que spécifier), et les deux grilles pour re-noter le site rendu :
> `docs/LANDING-BEST-PRACTICES.md` § 9 (conformité /100) et `_signature.md` (désirabilité /20).
> État des notes de la maquette : **82/100 en conformité, 12/20 en signature** (passe du
> 2026-08-19, détail dans `AUDIT-DOSSIER-2026-08-19b.md` — deux propositions à arbitrer).

## Avant le moindre token — les arbitrages bloquants

1. ~~**Franco de port**~~ — **TRANCHÉ le 2026-08-18 : le franco est ABANDONNÉ.** Le placeholder
   `{franco}` n'avait aucune source dans le code (`shipping-rates.ts`) ; il est retiré de toute
   la maquette (bandeaux, blocs « En pratique », réponse FAQ, y compris les overrides
   d'instances). Le bandeau des deux barres hautes porte désormais
   « Livraison {frais} · expédié sous {délai} » — deux valeurs qui ont, elles, une SSOT.
   **Ne pas réintroduire `{franco}` sans que Léane crée l'offre en base.**
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
- **Comptes par collection** (6/5/3 dans la maquette) et **par type** (« Colliers (3) ») :
  inventés pour sommer à 14 — à lire en base. (Tours 3-4.)
- **Prix des 8 cartes** (38/26/29/28/24/42/18/14 €) : placeholders plausibles, la base fait
  foi. (Tour 2.)
- **Badges de rareté** (« PIÈCE UNIQUE », « IL EN RESTE 2 ») : lus en base, et tenus au test
  de la ligne claire — la phrase doit rester vraie si la visiteuse revient demain. (Tour 2.)
- **`{frais}`** = `SHIPPING_RATES`, **`{délai}`** = `PREPARATION_BUSINESS_DAYS` +
  `estimatedDays` (`modules/orders/constants/shipping-rates.ts`). ⚠️ **`{franco}` n'existe
  plus** — franco abandonné le 2026-08-18, cf. arbitrage nº 1.

## Système

- `marge-page` desktop 144 de la maquette = en code **marge min 64 + `max-width` 1152**. (Tour 0.)
- Hauteurs de section en **`svh`/`dvh`, jamais `vh`**. (`synclune-systeme.md`.)
- Icônes : Phosphor via `@phosphor-icons/react/ssr` — house, storefront, heart, tote,
  magnifying-glass, plus, minus. (Tour 0.)
- Boutons : le **repli de libellé** se fait par `max-width` en code — Pencil ne sait pas
  l'exprimer ; dans la maquette, toute instance à largeur contrainte porte l'override de
  libellé (recette au tour 9).

## Chrome

- **Bandeau livraison HORS du bloc sticky** ; `position: sticky` sur la seule rangée
  principale ; le liseré 1 px encre = `border-bottom` de l'état flottant — jamais d'ombre
  floue. (Tour 10, frame `00-systeme/chrome-scrollee`.)
- **Badge compteur du panier : deux variantes coexistent** dans la maquette (rond rose sur la
  barre basse, goutte `$rose-encre` sur la planche motion) — en retenir UNE. (Passe créative.)
- **Vérifier la chrome contre le code** : l'import `browser` n'a jamais eu lieu, les champs
  `context` de la chrome ne pointent pas vers les composants réels. Libellés de référence :
  nav « Les créations » / « Les collections », barre basse 5 onglets
  (`e2e/shop-mobile.spec.ts`), médiateur CNPM (`shared/constants/consumer-law.ts`). (Tour 0,
  corrigé les 2026-08-17 ; nav desktop et médiateur re-alignés dans la maquette le 2026-08-18,
  audit 17b.)
- **Pied de page sur `rose-pale` `#fdf0f8`** (passe du 2026-08-17, documentée à l'audit 17b) :
  si la maquette est retenue, créer le token (teinte du rose, surfaces uniquement) ; le filet
  interne `#06070b24` = `var(--foreground)` à 14 % ; focus des liens du pied = anneau encre
  2 px standard (la règle « focus papier sur fond encre » est morte avec l'aplat encre).
- **Transitions en dégradé entre sections** (assemblages) : papier↔or autour des types,
  papier→rose-pale avant le pied — desktop 64 px, mobile 16 px (hauteurs réglées par le relevé
  des plis). Le papier→rose-pale est quasi invisible (1,08:1), c'est un raccord de surface
  assumé, pas un effet à reproduire en plus voyant.

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
- Le lien texte de la carte vendue (~22 px de haut) est acceptable **si** toute la carte est
  cliquable — exception « lien en ligne » de WCAG 2.5.8. (Tour 2.)
- Carte vendue = une porte : « Commander une pièce comme elle » pointe vers la **commande
  personnalisée** — garder ce libellé. (Tour 2.)

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
  chemin du LCP ; `prefers-reduced-motion` : posées d'emblée. Jamais de boucle. Desktop
  seulement. (Spec sur la planche motion + `context` du groupe `filigrane-hero`.)

## Sections

- **Créations (desktop)** : les 8 cartes s'échelonnent — tops **0·24·8·32** par colonne
  (`nth-child`, desktop seulement, le 2 colonnes mobile reste aligné). Proposition « la grille
  respire », prise le 2026-08-19 ; coût accepté ~32 px par rangée.
- **Collections** : plafonner la section à ~6 cartes + lien (la grappe tient à 6 et 9, mais
  6 est la recommandation) ; visuels par carte = requête **partagée avec le méga-menu,
  plafond 4** ; une collection sans photo se rend en état `sans-visuel`. (Tour 3.)
- **Types** : les puces SONT les liens vers les pages de type ; hauteur de puce 41 px — sous
  le confort 44-48, à relever en code. (Tour 4.)
- **FAQ** : ⛔ **ne pas ré-émettre le JSON-LD `FAQPage`** avec le retour visuel de la FAQ
  (`context` posé ; rich result retiré, verrouillé par
  `catalogue-single-breadcrumb.regression.test.ts`). La rangée d'accordéon ENTIÈRE est le
  bouton (58 px) — l'icône seule fait 20 px. (Tour 6, audit maquette P1.3.) **La réponse
  dépliée est une bulle de message signée** (fond gris, rayons 20/20/20/4 — coin-queue en
  bas-gauche —, padding 16/24, signature « — Léane » en cursive rose-encre : de la
  ponctuation, pas un texte porteur). Proposition prise le 2026-08-19.
- **Atelier** : « Lire l'histoire de l'atelier » pointe vers la future page atelier/à-propos —
  garder ce libellé. (Tour 5.)

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
