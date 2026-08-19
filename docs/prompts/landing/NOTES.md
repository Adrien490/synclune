# Carnet de bord — landing.pen

## Tour 0 — Bootstrap

- Motif tenu : **la goutte**, du début à la fin — elle couvre raisin, pluie, larme, rosée, arc-en-ciel ; grappe = accumulation de gouttes. Aucun autre glyphe de marque en ponctuation.
- Accent par section : 01-hero **rose** · 02-creations **or** · 03-collections **rose** · 04-types **or** · 05-atelier **rose** · 06-faq **or** · 07-partage/carte **rose** · 07-cookies **rose**. Le pied de page est **encre** (chrome, hors alternance) — sur fond encre, liens/texte en papier et **focus en papier**, traits décoratifs rose/or autorisés.
- Style Pencil retenu : « Illustrated Warm » (marques confetti) comme référence de composition — décoration = **ponctuation** (3-4 marques max par vue, jamais un fond), accent réservé à l'actionnable, séparation par blanc + filets `gris` 1 px, pilule sur l'interactif. Palette/fontes du style jetées : nos tokens font autorité.
- Import du site réel **impossible** : l'outil browser exige l'app desktop pen.dev. Chrome dessinée d'après la description du tour ; les champs `context` ne pointent donc pas vers les composants de code, et les **coordonnées du médiateur (CM2C, cm2c.net, 14 rue Saint-Jean 75017 Paris) sont à vérifier contre le vrai footer**.

### Décisions prises seul (et pourquoi)

- Pied de page en **aplat encre** (papier dessus) : évite deux surfaces or adjacentes (06-faq est or) et donne une fin de page franche ; le registre reste joyeux par les gouttes rose/or et le Kalam.
- Photo de carte produit au **ratio 4:5** (270 × 338) ; collage de carte collection : 220 × 260 + 2 × (140 × 126).
- Bouton : padding 16/32 (hauteur ≈ 52 ≥ 48) ; survol = soulignement (primaire) ou fond `gris` (secondaire/discret) ; désactivé = opacité 0,4 ; libellé bouton en Onest 17/500.
- Wordmark « Synclune » : Winky Sans 400 (24 en barre haute, 20 en mobile, 40/32 au pied).
- Pastilles de variantes sur carte produit : couleurs de CONTENU (bijou), hors tokens — assumé, comme les photos.
- Gouttes des composants : tracé géométrique posé à la main (placeholders de photo + puces) — acceptable car remplacé/re-généré ensuite ; tout **décor dessiné final** d'une section devra passer par `Generate` type svg (trait 1,5, un peu tremblé).

### À savoir pour la suite

- **52 variables** posées (`GetVariables()` pour la liste) : couleurs `papier encre rose rose-encre or or-encre gris` · fontes `font-display/sans/cursive` · tailles `text-h1…note` · graisses `graisse-display/normale/medium` · `tracking-h1/h2/label` · `leading-*` · `space-4…128` · `radius-8…pilule` · `contenu-max marge-page gouttiere trait trait-focus hauteur-barre-basse`.
- Axe de thème **`device` : desktop | mobile** — text-h1/h2, tracking-h1/h2, marge-page, gouttiere sont thémés. **Toute frame mobile porte `theme:{device:"mobile"}`** (déjà posé sur les 16 frames vides). marge-page desktop = 144 (= (1440−1152)/2 ; en code : marge min 64 + max-width 1152).
- ⚠️ **`width`/`height` n'acceptent PAS une variable** (retombe en `fit_content` sans erreur — constaté sur la barre basse) ; padding, gap, fontSize, cornerRadius, strokeWidth, etc. les acceptent.
- 13 composants réutilisables (retrouver les ids : `Get(n=>n.reusable&&Print(n.name,n.id))`) : `bouton/primaire|secondaire|discret`, `carte-produit`, `carte-collection/avec-visuels|sans-visuel`, `accordeon-question`, `puce-type`, `chrome/barre-haute`, `chrome/barre-haute-mobile`, `chrome/barre-basse-mobile`, `chrome/pied-de-page`, `chrome/pied-de-page-mobile`.
- `carte-produit` : variantes par overrides de descendants — Badge (`enabled` + fill or/rose/encre + libellé), Voile vendu, Favori, Variantes de couleur, Lien pièces proches. Recettes exactes visibles dans la planche composants.
- `puce-type` : le cadre « Motif » 24×24 est l'emplacement à REMPLACER par le tracé de chaque famille (tour 04).
- `accordeon-question` : ouvert = `Réponse.enabled:true` + icône `minus`. La « Réponse » repliée du maître est signalée « fully clipped » par l'outil : attendu, ne pas « corriger ».
- Grille produits desktop : 4 × 270 + 3 × 24 = 1152 ; collections : 3 × 368 + 2 × 24 = 1152.
- Icônes UI : Phosphor (`house storefront heart tote magnifying-glass plus minus`), 22-24 px, fill encre — le code importe depuis `@phosphor-icons/react/ssr`.
- Canvas : planches système en haut (styles x0 · composants x1420 · chrome x2840), sections en rangées y=2600 + n×2400, desktop x0 / mobile x1600. Hauteurs des frames vides = provisoires (sauf hero mobile 844, carte 1200×630, cookies 390×844) : chaque tour redimensionne la sienne.

### Non vérifié / en suspens

- Coordonnées réelles du médiateur de la consommation (import indisponible) — à reprendre du site avant tout passage en code.
- La famille `or`/`or-encre` et le remplacement de la rotation lavande/menthe/soleil restent **à faire arbitrer par Léane** (déjà documenté dans synclune-systeme.md) — rien à faire dans les tours de design.
- Le nuancier de la planche styles a un débordement sous-pixel (151 × 7 arrondi) — invisible, laissé tel quel.
- Rendu des fontes Winky Sans / Onest / Kalam vérifié en capture sur les planches ; pas de vérification glyphe par glyphe.

## Correction d'orchestration — médiateur de la consommation (hors tour)

- Les coordonnées RÉELLES (SSOT du code : `shared/constants/consumer-law.ts`) : **CNPM - MÉDIATION DE LA CONSOMMATION** (Centre National de la Médiation des Professions et des Métiers), 27 avenue de la Libération, 42400 Saint-Chamond — cnpm-mediation-consommation.eu · contact@cnpm-mediation-consommation.eu.
- Le pied de page du tour 0 porte « CM2C, Paris » : c'est FAUX. Corrigé par le tour 0bis (import de la chrome réelle, app desktop lancée) — tour 8 : vérifier que le pied de page porte bien le CNPM.

## Tour 0bis — chrome réelle (NON EXÉCUTÉ)

- L'outil browser est TOUJOURS indisponible (« requires the pen.dev desktop app »), malgré l'annonce du tour. Aucun import possible.
- Conformément à la consigne du tour : **aucun nœud touché** — ni `00-systeme/chrome`, ni les composants `chrome/*`, ni le médiateur (le pied de page porte toujours « CM2C, Paris », faux).
- Reste donc entièrement à faire lors d'une reprise du tour 0bis : import header/footer/barre basse depuis http://localhost:3000, mise à jour des 5 composants chrome, correction CNPM (27 avenue de la Libération, 42400 Saint-Chamond — cnpm-mediation-consommation.eu), report des champs `context` design → code.

## Tour 1 — Hero

- Motif tenu : la goutte, déclinée en **pampille** — frise « chaîne + attaches + tuiles suspendues » ; touche de pinceau rose derrière « colorés, » (générée en SVG, forcée sur `$rose`).
- Accent de la section : **rose** (aplat `rose` sur tuiles et pinceau, `rose-encre` pour le sur-titre — 5,15:1 ; texte `encre` partout ailleurs).
- **Choix tranché (le point laissé ouvert par le tour)** : la marchandise MONTE dans le hero, en **frange de pampilles** coupée par le pli — pas une grille. Pourquoi : la pampille suspendue est le vocabulaire exact de la marque (chaîne chargée de pampilles, effet de frange, accumulation de petits éléments — jamais un grand visuel central), et la frange coupée donne le signal géométrique de défilement sans flèche. La section 02 garde la vraie grille : la frise est un bandeau distinct, pas le début de la grille du tour 2.
- Structure : `spy2H` (1440×800, pli = bord bas) : barre-haute (ref) → contenu-hero (sur-titre / titre 2 lignes / chapô 420 px, une phrase par ligne / CTA) → frise-créations (layout none) : chaîne 1440×1,5 encre à y≈585, 7 attaches (longueurs 24-96 de l'échelle), 7 tuiles 184×230 (4:5). `uevFm` (390×844) : idem, titre 3 lignes, chapô fill, 2 tuiles 168×210, barre-basse (ref) absolue à y=788, posée en dernier (au-dessus).
- Vérifié par bounds : desktop — tuiles sommets 609-681, bas 839-911 → toutes coupées d'au moins 39 px par le pli (800) ; CTA finit à ~489. Mobile — bloc titre + chapô + CTA finissent à 426 ; tuiles sommets 618/650 (visibles), bas 828/860 → coupées par la barre basse (788). CTA 223×54.

### Décisions prises seul (et pourquoi)

- Titre découpé en nœuds texte par ligne (desktop 2, mobile 3) pour isoler « colorés, » dans `mot-surligné` : la touche de pinceau est un frame absolu SOUS le texte, débordant du mot (signalé « partially clipped » par l'outil : voulu, parent non clippé, rendu vérifié en capture).
- Interligne des lignes de titre = gap 0 entre nœuds (chaque ligne fait fontSize×1,02) — équivalent au leading-h1.
- Tuiles hero nommées `photo/creation-hero-01…07` (desktop) et `…01…02` (mobile) pour ne pas collisionner avec les `photo/creation-*` de carte-produit. **En code : ce sont les photos des premières créations du catalogue — aucun shooting dédié au hero.**
- Espacement du bloc texte : titre-groupe gap 16 · texte gap 24 · contenu gap 32 ; padding haut 96 (desktop) / 48 (mobile).
- Chapô desktop à 420 px pour tomber en une phrase par ligne (2 lignes, vérifié : 420×56).
- Épaisseur chaîne/attaches : 1,5 écrit en dur = valeur de `$trait` (width/height n'acceptent pas de variable, cf. tour 0).
- Deux générations de pinceau distinctes (desktop 222×62, mobile 156×46) plutôt qu'une copie : légère variation assumée, registre fait-main.

### À savoir pour la suite

- ⚠️ **« 14 » du CTA (« Voir les 14 créations ») = valeur du jour, DYNAMIQUE en code** : compter les créations actives en base (comme les valeurs de livraison de la FAQ). Si le tour 2 affiche un compte, utiliser le même.
- Le pli desktop est simulé par la hauteur de frame 800 (clip) ; tout le contenu critique finit ≤ 489, marge pour les vrais viewports plus courts (~780).
- La frise est en `layout: none` : si on la retouche, repositionner attaches ET tuiles ensemble (attache x = tuile x + centre − 0,75 ; tuile y = chaîne y + longueur d'attache).
- Un `Get` de renommage global sur les paths a rebaptisé par erreur les tracés générés du pinceau (corrigé en `tracé-pinceau-*`) — cibler les renames par sous-arbre, pas par type sur toute la frame.

### Non vérifié / en suspens

- Contrastes cités (encre/papier ≈ 19:1, rose-encre/papier 5,15:1, encre sur rose 12,6:1) : repris du doc système (calculés au tour 0 depuis les hex), seuls encre/papier recalculés ici.
- Le test des 5 secondes est tenu par la copie (titre + chapô disent « bijoux colorés faits main ») — non testé sur un humain, évidemment.
- Noms de calques : les miens sont en kebab-case français ; ceux du tour 0 (composants : « Libellé », « Motif goutte »…) gardent leurs espaces — non touchés (hors périmètre).

## Tour 2 — Les dernières créations

- Motif tenu : la goutte (tracé du placeholder `carte-produit`, encre sur aplat or) — aucun décor ajouté : les 8 tuiles or + badges suffisent, zéro marque confetti.
- Accent de la section : **or** (photos placeholder `$or`, sur-titre `$or-encre` 4,72:1 recalculé ; badges en `$papier`+encre ou `$encre`+papier — jamais de texte sur rose/or).
- 8 cartes = 8 types couverts (collier, boucles, bague, bracelet, chaîne de cheveux, chaîne de corps, papillou, porte-clés), instances de `carte-produit` (Trd6e) par overrides uniquement — composant non modifié.

### Décisions prises seul (et pourquoi)

- **Pièces vendues : option 2 (inclure, marquée, avec porte)** — UNE seule carte vendue (Papillou tourbillon violet) : voile + badge encre « DÉJÀ PARTIE » + lien souligné « Commander une pièce comme elle » (la commande personnalisée est le meilleur dénouement pour une pièce unique ; preuve sociale sans mur).
- Rareté : badges-descriptions vraies demain — « PIÈCE UNIQUE » (Bague Nuit étoilée), « IL EN RESTE 2 » (Créoles raisin, à lire en base en code). Aucun compteur, aucun compte à rebours.
- Portée/échelle par les placeholders : `photo/creation-porte-creoles-raisin`, `photo/creation-porte-chaine-corps-goutte` (portées), `photo/creation-echelle-porte-cles-nenuphar` (dans une main). Autres : `photo/creation-<slug-piece>`.
- **Prix inventés** (38/26/29/28/24/42/18/14 €) : le catalogue réel n'a pas de prix dans le prompt — placeholders plausibles, à remplacer par la base.
- Pastilles de variantes recolorées par carte (couleurs de contenu hors tokens, comme au tour 0) ; pastilles surnuméraires désactivées (`enabled:false` — l'outil les signale « fully clipped », attendu, ne pas corriger ; idem voile/lien désactivés des cartes non vendues).
- Mobile : cartes 167 (2 col, gouttière 16), photo 209 (4:5 à 0,25 px près, comme le 338 du composant), motif recentré 35/56, **favori déplacé en bas-droite de la photo (111/153)** — en haut il chevauchait le badge (mesuré : badge large 119-129, favori à x 111). En code : même règle sous 768.
- Desktop : grille 2×4 (4×270+3×24=1152), gap vertical 48 ; CTA `bouton/secondaire` centré sous la grille « Voir les 14 créations » (même « 14 » dynamique que le hero).
- Copie : sur-titre « LES DERNIÈRES CRÉATIONS », h2 « Fraîchement sorties de l'atelier », chapô « Colliers, créoles, bagues, chaînes de cheveux… je peins et j'assemble chaque pièce à la main, souvent en un seul exemplaire » (je de Léane, annonce l'étalement ET justifie badges/vendu).

### À savoir pour la suite

- Hauteurs finales : desktop 1440×1426, mobile 390×1876 (fit_content). Mobile 844 : en-tête → 244, rangée 1 complète → 603, rangée 2 visible dès 635 (déborde sous le pli ✓).
- Le lien « Commander une pièce comme elle » doit pointer vers la page commande personnalisée — si un tour la dessine, garder ce libellé.
- Overrides favori/badge : recettes dans les descendants des 16 instances de ce tour (ids : rangées de `xeFci` desktop, `d1VL7` mobile).

### Non vérifié / en suspens

- Le libellé du `bouton/*` (composant tour 0) est en textGrowth auto : il ne passe pas sur 2 lignes si le texte grossit — trait de composant, hors périmètre de ce tour, à arbitrer si un libellé long arrive.
- Le lien texte de la carte vendue fait ~22 px de haut (< 24) : acceptable si toute la carte est cliquable en code (exception lien en ligne WCAG 2.5.8), à retenir au passage en code.
- Prix = placeholders (voir ci-dessus) ; noms de pièces = catalogue du prompt, non vérifiés contre la base.

## Tour 3 — Collections

- Motif tenu : la goutte (tracés des placeholders + grappe dessinée de l'état sans-visuel) — aucun décor ajouté hors cartes.
- Accent de la section : **rose** (aplats `$rose`, sur-titre et comptes en `$rose-encre` 5,15:1, zone sans-visuel en `$gris`).
- Composition desktop : **grappe en 3 colonnes décalées** (offsets haut 0 / 64 / 32 via padding `$space-64`/`$space-32`), remplies en tourniquet (carte 1→col1, 2→col2, 3→col3, 4→col1…). Hauteurs de collage variées par carte (260 / 300 / 240 / 220) = symétrie imparfaite. **Tenue à 6 cartes (2/2/2) et 9 (3/3/3)** : offsets constants, l'irrégularité vient des hauteurs ; recommandation code : plafonner la section à ~6 cartes + lien.
- Mobile : pile verticale pleine largeur, collages alternés par `flipX` (Ciel et Tableaux inversés), lien discret centré en pied. 390×1835 ; au pli 844 : en-tête + carte 1 complète à 583, carte 2 visible dès 615.
- Visuels par carte : Jardin **4** (colonne droite remplacée par 3 photos empilées), Ciel **3** (collage du composant), Tableaux **2** (3e photo `enabled:false` → la 2e remplit la colonne, vérifié en capture), Arc-en-ciel **0** = état `sans-visuel` en situation.

### Décisions prises seul (et pourquoi)

- **Arc-en-ciel liquide porte l'état sans-visuel** : c'est la démo en situation exigée par le tour, et la grappe de gouttes dessinée du composant illustre littéralement « des gouttes en séquence ». Ligne de statut = « En préparation — reviens bientôt » (verbatim du composant), en code = n'importe quelle collection sans photo se rend ainsi.
- Descriptions du catalogue affichées **entières** (elles tiennent en 2-3 lignes de small à 368/350) — verbatim, zéro réécriture ; ajoutées sous le nom en remplaçant le descendant « Compte » par un bloc description + compte (le composant n'a pas de slot description — composant NON modifié, tout par overrides).
- Comptes en `$rose-encre` graisse medium (cadence de série) : 6 + 5 + 3 = **14 créations**, aligné sur le « Voir les 14 créations » des tours 1-2 — mêmes valeurs dynamiques en code.
- Copie : sur-titre « LES COLLECTIONS », h2 « Choisis ton petit monde » (écho de « des petits mondes colorés à porter »), chapô sans « quatre » écrit en dur (survit à 9 collections). Lien « Voir les 4 collections » ×2 (desktop : discret en haut à droite de l'en-tête ; mobile : discret centré en pied — le secondaire plein large reste au tour 2, éviter deux sections de suite qui finissent pareil).
- Collage inversé (`flipX` sur le descendant Collage) pour Tableaux (desktop + mobile) et Ciel (mobile) : la goutte est symétrique, le miroir est invisible sur les tracés.
- Gouttes de la zone sans-visuel recentrées par overrides x/y (le composant les cale pour 260 de haut ; zones réduites à 240/200).

### À savoir pour la suite

- Ids : desktop `s1ElXh` (1440×1161) — en-tête `HJ043`, grappe `MJZEa`, cartes `p8rYM3` (jardin) `zcxyE` (tableaux) `CnFZU` (ciel) `QGWaH` (arc, sans-visuel) ; mobile `L5cwO` (390×1835) — pile `LSXOA`, cartes `ulYvW` `CCFAf` `MQG5d` `T9Xwu`.
- ⚠️ **Les placeholders `photo/collection-*` ne sont PAS une entrée de shooting** : `Collection` n'a aucun champ image en base, la carte emprunte ses visuels aux produits (requête partagée avec le méga-menu, plafond 4). Noms posés : `photo/collection-jardin-01…04`, `-ciel-01…03`, `-tableaux-01…02` (mêmes noms sur les deux viewports = mêmes assets).
- Recette « carte à N visuels » réutilisable : 4 = remplacer `gLooO` par 3 photos empilées ; 3 = défaut ; 2 = `zTPJG.enabled:false` ; 0 = ref `K9kvw`.
- L'avertissement execute « zTPJG has fill_container but not inside flexbox » accompagne chaque instance où zTPJG est désactivé : bénin (vérifié en capture, la photo ne se rend pas), ne pas « corriger ».

### Non vérifié / en suspens

- Libellé de `bouton/*` toujours en textGrowth auto (une ligne) — limite de composant déjà notée aux tours 1-2, non touchée.
- Les noms de calques internes hérités du composant (« Collage », « Nom de la collection », « Colonne droite ») gardent leurs espaces du tour 0 — hors périmètre.
- Comptes de créations par collection (6/5/3) : inventés pour sommer à 14 ; à lire en base en code.

## Tour 4 — Pour tous les goûts

- Motif tenu : la goutte — chaque vignette de type est un dessin au trait où la goutte structure la forme (perles-gouttes du collier, pampilles des créoles, mèches en gouttes allongées de la tresse « chaînes de cheveux », régénérée ce tour en 5 grandes boucles-gouttes entrelacées + 2 breloques gouttes).
- Accent de la section : **or** — aplat `$or` sur TOUTE la section (desktop + mobile), tracés et textes en `$encre` dessus (16:1 recalculé ce tour depuis les hex), puces en pilule `$papier` + trait `$encre`. Aucun `$rose`, aucun hex (vérifié par balayage final).
- Composition : 8 types = 8 vignettes dessinées (aucune photo — vérifié : zéro fill image dans les deux frames) + puce pilule. Desktop : 2 rangées en quinconce, tailles 91-126 et rotations variées (rythme non uniforme). Mobile : liste verticale, vignette à gauche, offsets alternés.
- Sur-titre « POUR TOUS LES GOÛTS » en `$encre` (pas `$or-encre`) : sur un fond déjà `$or`, l'or-encre se noierait — l'accent est porté par l'aplat, pas par le texte.

### Décisions prises seul (et pourquoi)

- **Tresse régénérée deux fois** : la première génération (148 tracés desktop / 75 mobile) était trop dense — passée à `$trait` (1,5) elle virait au pâté noir, à contre-vocabulaire des 7 autres vignettes (3 à 40 tracés, formes larges). Régénérée avec consigne de sparsité (≤ 14 traits, grandes gouttes, diagonale) : 20 tracés desktop, 14 mobile.
- L'entrée mobile « chaînes de cheveux » n'avait AUCUNE frame vignette (pas seulement vide) : créée (`QfcqX`, 112×112, rotation −3, clip, layout none) sur le modèle des voisines, insérée en tête de `Oul6k`.
- Un rectangle-artefact de génération (bordure autour de la tresse mobile) supprimé ; tracés générés normalisés en `stroke $encre` + `strokeWidth $trait` et renommés `tracé-chaines-cheveux-N` (même recette que les autres vignettes).
- Vignette desktop `FyX1Y` alignée sur ses sœurs (`clip: true`, `layout: none`) — elle ne les avait pas.

### À savoir pour la suite

- Ids : desktop `GkVpA` (1440×799), mobile `WGE7s` (390×~1275 après reflow) ; vignettes tresse `FyX1Y` (desktop) et `QfcqX` (mobile) ; entrées `dpGxf` / `Oul6k`.
- Mobile au pli 844 : en-tête + 4 entrées complètes, la 5e (chaînes de corps, 739→855) coupée par le pli — le débordement fait signal de scroll.
- Les puces `puce-type` ont leur « Motif » goutte désactivé (`v8OMc.enabled:false`) dans les 16 instances : le dessin vit dans la vignette, pas dans la pilule.
- Aucun lien de sortie dans cette section (les puces SONT les liens vers les pages de type en code).

### Non vérifié / en suspens

- Libellé de `puce-type` en textGrowth auto : ne passe pas sur 2 lignes si le texte grossit — même limite de composant que `bouton/*` (tours 1-3), hors périmètre, à traiter au passage en code.
- Hauteur de puce 41 px : ≥ 24 (plancher opposable) mais sous le confort 44-48 — trait de composant du tour 0, non touché.
- « Le haut de la section suivante déborde sous la ligne de flottaison » : invérifiable depuis le fichier (les sections sont des frames séparées, l'empilement page n'existe pas encore) — au sein de la section, la liste mobile déborde elle-même le pli, ce qui donne le signal.
- Budget mobile « annoncé » du tour 4 : inconnu (l'entrée du carnet d'origine n'a jamais été écrite) — constat factuel ci-dessus en tient lieu.

## Tour 5 — L'atelier

- Motif tenu : la goutte — tracé encre 1,5 sur l'aplat rose du placeholder portrait (même recette que les placeholders des tours 2-3) ; le décor dessiné, lui, montre le GESTE (main + pinceau + touche sur cabochon), conformément au critère « on dessine ce qu'on ne peut pas photographier ».
- Accent de la section : **rose** — aplats `$rose` (portrait, pastilles numérotées), sur-titre `$rose-encre` (5,15:1 recalculé ce tour depuis les hex), tout le texte en `$encre` (19,59:1 papier · 12,61:1 sur rose). Aucun `$or`, aucun hex (balayage final : zéro valeur libre sur fill/stroke/typo/espacement).
- Composition : desktop 2 colonnes (portrait 440×550 + note Kalam + décor dessiné à gauche ; récit 664 à droite : en-tête, 4 étapes numérotées, lien) ; mobile pile verticale (en-tête → portrait 350×438 + note → étapes → décor → lien centré).

### Décisions prises seul (et pourquoi)

- **« environ 3 h par bijou » = note Kalam manuscrite sous le portrait, rotation −2°** : la mention discrète demandée devient une légende de photo écrite à la main — registre fait-main sans glyphe de clavier.
- **« C'est moi qui lis, c'est moi qui réponds » placée dans le chapô**, à la suite de « si tu m'écris : … » — elle arrive avec le visage, là où la joignabilité se joue.
- H2 : « Chaque bijou passe entre mes mains » — point principal (fait main, une personne) reçu en une ligne, avant les étapes.
- Étapes : pastilles rondes 40×40 `$rose` + chiffre Winky `$encre` (série/cadence, maximalisme miniature) ; titres en h3 display, corps en small — scannable, zéro adjectif ajouté, les 4 textes VERBATIM du brief (« avec amour » de l'étape 4 compris : copie imposée).
- Colonne récit desktop en `height fill_container` + `justifyContent space_between` : le lien de sortie s'aligne sur le bas du bloc portrait (colonnes équilibrées à 794).
- Sortie en `bouton/discret` + `underline:true` sur le libellé (override, composant non modifié) : c'est un lien de récit, pas un CTA d'achat — le secondaire plein reste au tour 2.
- Deux générations distinctes du décor (desktop 280×180 : main+pinceau+touche, 30 tracés ; mobile 200×130 : pinceau+cabochon, 4 tracés) ; rectangle-artefact desktop supprimé, tracés normalisés `stroke $encre` + `strokeWidth $trait`, renommés `tracé-geste-N` (recette tour 4).

### À savoir pour la suite

- Ids : desktop `hBDKm` (1440×986) — contenu `XEUVM`, portrait `EPx5j`, décor `WwCuk`, étapes `Rrqsq` ; mobile `qL3Cm` (390×1698) — portrait `SUhjp`, décor `abwA0`, étapes `by0gK`.
- **`photo/portrait-leane` (×2, mêmes noms = même asset) est LA priorité de la checklist shooting** : vraie photo de Léane exigée en version finale, format portrait 4:5 — ni illustration ni banque d'images.
- « Lire l'histoire de l'atelier » pointe vers la future page atelier/à-propos — si un tour la dessine, garder ce libellé.
- Mobile au pli 844 : en-tête + portrait + note complets (fin à 825) ; l'étape 1 commence à 873.

### Non vérifié / en suspens

- Signal de scroll mobile faible : entre 825 (fin de la note) et 844 (pli), rien ne dépasse — l'étape 1 est 29 px sous le pli. Constat de bounds, laissé tel quel (le pli ne tombe là que si la section s'aligne exactement en haut du viewport).
- Libellé de `bouton/discret` en textGrowth auto (une ligne si le texte grossit) — même limite de composant que les tours 1-4, non touchée.
- « Le haut de la section suivante déborde sous la flottaison » : invérifiable frame par frame (empilement page inexistant), comme aux tours précédents.
- Une petite marque en bas à gauche des captures desktop : vérifié par requête de zone — AUCUN nœud n'existe à cet endroit, artefact de la miniature de capture, rien à corriger.

## Tour 6 — FAQ et réassurance

- Motif tenu : la goutte — puces dessinées (tracé encre 1,5, 10×11) devant chaque ligne du bloc « En pratique » ; aucun autre décor, zéro pictogramme de confiance.
- Accent de la section : **or** — aplat `$or` sur le bloc « En pratique » (texte `$encre` dessus, 15,97:1 recalculé), sur-titre `$or-encre` (4,72:1). Balayage final : zéro valeur libre sur fill/stroke/typo/espacement, zéro `$rose`.
- Contenu : 6 questions (délai livraison OUVERTE par défaut, retours, fait main, exemplaires, taille, personnalisation), instances de `accordeon-question` par overrides uniquement (ouverte = `ToeQT.enabled:true` + icône `minus`). Valeurs de livraison en placeholders `{frais}` `{délai}` `{franco}` partout — « 14 jours » (retours) est un délai légal, pas une valeur de livraison.
- « Commande sans créer de compte » écrit en graisse medium dans le bloc « En pratique » (desktop + mobile), + ligne favoris sans compte.

### Décisions prises seul (et pourquoi)

- Les deux gros motifs d'abandon (port 40 %, délai 20 %) portés par un bloc « En pratique » scannable en aplat or (5 lignes puces goutte), PAS seulement enfouis dans les réponses — la section se scanne sans être dépliée.
- Desktop 2 colonnes : info 368 (en-tête + bloc) / accordéon 760 ; mobile pile : en-tête → bloc → accordéon → sortie centrée.
- Sortie : « Une autre question ? » + `bouton/discret` souligné « Écris-moi un message » — dévie du verbatim « Écris-moi. » (lien d'un seul mot interdit, et « Écris-moi ta question » répétait « question »).
- « Colissimo » (réponse par défaut du composant tour 0) remplacé par « colis suivi » : transporteur non vérifié contre le code.
- H2 « Les questions qu'on me pose vraiment » ; réponses en voix de Léane, appariement chaleur (fabrication) / précision (délais, retours, remboursement).

### À savoir pour la suite

- Ids : desktop `hsKuc` (1440×726) — contenu `P0NFP`, bloc `bYRW3`, colonne questions `zfJMY` ; mobile `qCvQR` (390×1326) — bloc `IzWco`, liste `p1M24X`.
- ⚠️ **Franco de port : la FAQ ne peut pas être la seule porteuse** (dernière section, <15 % d'audience). À remonter : en code, `{franco}` doit AUSSI vivre près du prix (PDP) et dans le panier/tunnel ; sur la landing, candidat naturel = bandeau d'annonce de la barre haute (tour 8 ou arbitrage Léane).
- Mobile au pli 844 : en-tête + bloc « En pratique » complets à 562, question 1 ouverte visible dès 594 — l'info critique est au-dessus du pli.
- Filet `$gris` 1 px de l'accordéon : 1,16:1 — séparateur décoratif du composant tour 0, non porteur, non touché.

### Non vérifié / en suspens

- « Le haut de la section suivante déborde » : sans objet (dernière section de la page) — la sortie « Écris-moi » fait la fin de page avant le pied.
- Libellés de `bouton/discret` et rangée d'accordéon : textGrowth auto sur le libellé bouton (limite composant, tours 1-5) ; les QUESTIONS, elles, passent bien sur 2 lignes (vérifié mobile).
- Cible tactile réelle de la rangée d'accordéon = toute la rangée (58 px) en code ; l'icône seule fait 20 px — à tenir au passage en code (bouton = la rangée entière).

## Tour 7 — Carte de partage + bannière cookies

- Motif tenu : la goutte — sur la carte, le dessin est le SUJET (aucune photo en face) : frise de 10 pampilles suspendues à une chaîne (haut) + grappe de 6 gouttes (bas droite), tracé = le path canonique du tour 0 (`Trd6e/v8zBX`), trait 1,5 encre.
- Accent des deux surfaces : **rose** (pampilles/grappe remplies `#fdb8e4`, alternées avec des gouttes en contour seul ; sur-titre carte `#ac448d` ; pilules de la bannière `$rose`).
- **Carte `U9V7Wr` (1200×630) : 100 % hexadécimal explicite** — fond `#fafcff`, encre `#06070b`, rose `#fdb8e4`, rose-encre `#ac448d`. Balayage final : zéro `$variable`, zéro fill/stroke non-hex (contrainte moteur OG qui ignore oklch/var en silence).
- Texte carte : sur-titre « BIJOUX COLORÉS FAITS MAIN · NANTES » (Onest 22/500, #ac448d) · wordmark « Synclune » (Winky Sans 400, 118) · tagline « Des petits mondes colorés à porter. » (Onest 32). Le test « qu'est-ce que cette boutique vend ? » est porté par le sur-titre, lisible même en aperçu réduit (22 px sur 1200).
- **Cookies `mF05G` (390×844)** : copie intégrale du hero mobile (`igCmJ`, copie de `uevFm` — l'original n'est PAS touché) + bannière `LdBqW` posée en OVERLAY (recouvre, ne pousse pas) : x12, y570, 366×210, papier + trait encre 1,5, radius 20, **8 px au-dessus de la barre basse** (788).
- Parité CNIL vérifiée par bounds : « J'accepte » et « Je refuse » = deux pilules IDENTIQUES (163×50 chacune, même rangée, même fill `$rose`, même graisse) — 1 clic chacune ; « Personnaliser » en lien souligné centré dessous (zone tactile 334×35).
- Hero sous bannière vérifié en capture : sur-titre, titre, chapô et CTA (fin à 426) entièrement visibles au-dessus de la bannière (top 570) ; seule la frange de pampilles (618+) passe dessous — la promesse survit.

### Décisions prises seul (et pourquoi)

- Gouttes de la carte posées à la main (path du tour 0 répété/redimensionné), PAS générées : précédent du tour 0 (placeholders/puces posés à la main jugés acceptables pour la goutte simple), et la répétition d'un même tracé EST le vocabulaire (série, symétrie imparfaite par longueurs d'attache 24-78 et tailles 40-80).
- Copie de texte bannière : « Quelques cookies pour mesurer les visites et améliorer la boutique. Tu peux refuser, tout marchera pareil. » — tutoyé, sans jargon, et dit explicitement que refuser ne casse rien (l'achat est cookie-essentiel). ⚠️ La finalité « mesurer les visites » est une HYPOTHÈSE : vérifier contre la vraie bannière du code (`cookie-consent` store) avant passage en code.
- Bannière au-dessus de la barre basse (pas par-dessus) : la nav reste utilisable pendant le choix, et en code elle s'empilera naturellement sur `--bottom-bar-height`.
- Libellés « J'accepte / Je refuse » (pas « Tout accepter / Tout refuser ») : une seule finalité probable, le « tout » serait du jargon.

### À savoir pour la suite

- Ids : carte `U9V7Wr` (frise `VslzF`, bloc texte `vaZfH`, grappe `rEtdZ`) ; cookies `mF05G` (copie hero `igCmJ`, bannière `LdBqW`).
- ⚠️ La copie hero `igCmJ` est un INSTANTANÉ du tour 1 : si un tour retouche `uevFm`, la copie ne suit pas — à re-synchroniser en fin de série si le hero bouge.
- La carte dessinée ici est la maquette de la carte ACCUEIL ; les 3 routes OG dynamiques (produit/collection/famille) restent à décliner côté code (photo produit + mêmes hex).

### Non vérifié / en suspens

- Finalité réelle des cookies soumis à consentement (mesure ? Sentry ?) — hypothèse à vérifier dans le code avant d'écrire le texte définitif.
- Rendu satori réel de la carte (fontes Winky Sans/Onest chargées par le moteur OG, rendu des paths) : vérifié uniquement en capture Pencil, pas dans le moteur.
- Contrastes cités (#ac448d sur #fafcff 5,15:1, encre 19:1) : repris des calculs des tours 0-1, non recalculés ce tour.

## Tour 8 — Assemblage et recette

- Motif tenu : la goutte, vérifié sur la page entière — inventaire des icônes (uniquement l'ensemble UI Phosphor : loupe, cœur, cabas, plus/moins, maison, boutique) et des familles de tracés (pampilles/pinceau du hero, gouttes des placeholders et puces, vignettes de types, geste d'atelier, gouttes du pied) : **aucun motif étranger**.
- **L'assemblage est un INSTANTANÉ par copies**, pas des instances : les frames de section ne sont pas `reusable` (les rendre réutilisables aurait modifié leurs propriétés — interdit). Seul le pied de page est une vraie instance (`ref` NAapJ / LIf3N). Si une section est corrigée ensuite, re-copier dans `fb42R` / `j9QGj`.
- `fb42R` (desktop, 1440×6393) et `j9QGj` (mobile, 390×9830) : layout vertical gap 0, copies dans l'ordre hero → créations → collections → types → atelier → FAQ + ref pied-de-page. La barre haute vit DÉJÀ dans le hero (ref `M6cFW`/`CX8Rg`), la barre basse dans le hero mobile — pas dupliquées.
- **Alternance d'accents TENUE et vérifiée par balayage des fills** (instances résolues, nœuds désactivés exclus) : hero rose → créations or → collections rose → types or → atelier rose → FAQ or, **zéro contamination croisée** (aucun `$or` dans une section rose et inversement) sur les deux viewports. Pied encre hors alternance (traits décoratifs rose/or du composant, autorisés tour 0).

### Chaîne des débords mobile (11 plis de 844) — 2 faux fonds, 2 signaux faibles

- Plis 2-6, 10-11 : contenu coupé net (cartes produit, cartes collection, aplat or des types, question FAQ, pied). ✓
- **Pli 7 (y 5908) : FAUX FOND** — types finit à 5870 (dernier tracé à 5798), le sur-titre atelier commence à 5934 : 136 px de vide traversent le pli. Cause : padding haut d'atelier (~64) + rien qui déborde à la frontière types/atelier.
- **Pli 9 (y 7596) : FAUX FOND** — atelier finit à 7568 (lien à 7504), le sur-titre FAQ commence à 7632 : 128 px de vide au pli, deux sections papier de part et d'autre.
- Pli 1 (y 844) : frontière exacte hero/créations — le signal de scroll est porté par la frange de pampilles coupée par la barre basse DANS le hero (design du tour 1), mais rien de la section 2 n'apparaît.
- Pli 8 (y 6752) : l'étape 1 d'atelier commence à 6743 — seulement 9 px de pastille rose au-dessus du pli (suite du suspens du tour 5).
- **Rien corrigé** (règle de conduite) : les remèdes appartiennent aux sections (réduire le padding haut d'atelier/FAQ mobile, ou faire déborder un élément à la frontière) — à arbitrer.

### Pied de page — re-contrôle de conformité (lecture des nœuds)

- Présents et lisibles (desktop ET mobile) : CGV ✓ · mentions légales ✓ · « Rétractation : 14 jours pour changer d'avis » ✓ · « TVA non applicable, art. 293 B du CGI » ✓ · « Fait main à Nantes » ✓ · médiateur ✓ mais **ENTITÉ FAUSSE : toujours « CM2C — cm2c.net · 14 rue Saint-Jean, 75017 Paris »** au lieu de CNPM (27 avenue de la Libération, 42400 Saint-Chamond — cnpm-mediation-consommation.eu). Le tour 0bis, chargé de la correction, n'a jamais pu s'exécuter (outil browser indisponible). Non corrigé ici : composants chrome hors périmètre du tour 8.
- Aucun lien RLL/ODR ✓ (aucune occurrence dans les textes des deux pieds).

### Décisions prises seul (et pourquoi)

- Pas de bandeau d'annonce franco ajouté à la barre haute (candidat noté au tour 6) : ce serait modifier un composant chrome existant, interdit — resté au stade de recommandation.
- Le pied mobile de l'assemblage est l'instance `LIf3N` telle quelle (910 px de haut).
- `SHOOTING.md` écrit : **9 photos à shooter** (1 portrait + 8 créations, toutes 4:5) ; hero et collections explicitement marqués « aucun shooting dédié » (hero = premières créations du catalogue, collections = photos empruntées aux produits, cf. tours 1 et 3).

### À savoir pour la suite

- Ids assemblage : desktop `fb42R` (copies `TIgpU` hero, `Jvq8q` créations, `aXEsK` collections, `lFGC7` types, `cBMXT` atelier, `oCQlN` FAQ, ref pied `nbmaf`) ; mobile `j9QGj` (`hGMrd`, `YKO1z`, `WgrAo`, `NIrnm`, `O4eX8`, `Bb2fe`, ref pied `G16q4B`).
- Avertissement « Collapsed size: nHZEp » sur la copie atelier desktop : trait LATENT de la section d'origine (colonne-récit en fill_container dans un « contenu » fit_content, résolu par la colonne portrait qui fixe la hauteur) — rendu identique à l'original vérifié par bounds (664×794), ne pas « corriger ».
- Avertissements `zTPJG`/`ToeQT` : les bénins connus des tours 3 et 6, présents dans les copies aussi.

### Non vérifié / en suspens

- Les deux faux fonds mobiles (plis 7 et 9) et le pli 1 — constat de bounds, remède à arbitrer (sections hors périmètre).
- CM2C → CNPM : TOUJOURS à corriger dans les composants chrome (reprise du tour 0bis) avant tout passage en code.
- Le test des plis suppose un scroll par écrans entiers de 844 exactement — les viewports réels varient, les faux fonds sont donc probabilistes, pas systématiques.

## Correction d'orchestration — médiateur (après le tour 8)

- Les deux mentions du médiateur (pied desktop `s1TNc`, pied mobile `UW2tL`) et la note doc `SpFVf` portent désormais le **CNPM** (cnpm-mediation-consommation.eu · 27 avenue de la Libération, 42400 Saint-Chamond), repris de `shared/constants/consumer-law.ts`. Fait via l'app desktop le 2026-08-17 — le point « ENTITÉ FAUSSE » du re-contrôle du tour 8 est soldé.
- Texte en `fixed-width` / hauteur auto dans un pied sans clip : l'allongement passe à la ligne, vérifié par lecture des nœuds (pas de capture — handler indisponible).

## Tour 9 — Améliorations

- Motif tenu : la goutte — aucun élément dessiné ajouté ; le bandeau franco est typographique pur (`$gris` + `$encre`), hors alternance comme le reste de la barre.
- **Tâche 3 — bandeau franco** : les deux barres hautes (`M6cFW`, `CX8Rg`) sont restructurées en pile verticale : `bandeau-livraison` (fill `$gris`, padding `$space-4`/`$marge-page`, texte centré « Livraison offerte dès {franco} » en sans/small `$encre`, `{franco}` vérifié par lecture des nœuds) au-dessus d'une `rangée-principale` qui reprend l'ancienne rangée à l'identique (hauteur 64/56, padding latéral, space_between). Nouvelles hauteurs : desktop 91 (bandeau 27), mobile 83. Aucune instance n'avait d'override de descendant ni de hauteur → propagation propre partout (heros, copies d'assemblage, copie cookies).
- **Budget hero tenu (mesures)** : desktop — CTA finit à 516, tuiles coupées par le pli 800 avec 92-164 px visibles ; mobile — contenu fini à 453, tuiles visibles dès 645 et coupées par la barre basse 788. Bonus : sur l'assemblage mobile, les tuiles décalées de 27 px traversent désormais le pli 1 (199 px visibles) — le faux-fond du pli 1 noté au tour 8 est soldé par effet de bord.
- **Tâches 1-2 — plis mobiles** : paddings de frontière réduits — `WGE7s` (types) bas 64→32, `qL3Cm` (atelier) haut 64→24 et bas 64→24, `qCvQR` (FAQ) haut 64→**96** (augmenté, pas réduit : ça décale le contenu FAQ de +32 pour que le pli 10 coupe une question au lieu de tomber dans la gouttière de 32 px de l'accordéon — le vide entre sections n'était pas le péché, c'était le pli dedans).
- **Relevé pli par pli de l'assemblage re-monté (9750 px, 11 plis)** : 1: tuiles hero 199 px ✓ · 4: photos ciel 41 ✓ · 5: photos tableaux 137 ✓ · 6: aplat or types 509 ✓ · **7: 46 px d'atelier visibles (sur-titre entier + h2 coupé en pleine ligne)** ✓ · **8: étape 1 émerge de 81 px, corps coupé à 48** ✓ · **9: 44 px de FAQ visibles (sur-titre + h2 coupé)** ✓ · **10: question « fait main » coupée à 44 px** ✓ · 11: pied 444 ✓. Plis 2 et 3 : le pli affleure une gouttière de 12/8 px entre rangées de cartes (créations/collections) — écran plein de cartes, positions STRICTEMENT inchangées depuis le tour 8 (sections non nommées, non touchées), pas un faux fond.
- **Tâche 4 — boutons** : le repli au niveau du MASTER est physiquement impossible en Pencil — mesuré ce tour : libellé `fill_container` dans une pilule fit_content = dépendance circulaire, la pilule s'effondre à 0 (nœud d'essai, supprimé). La hauteur des trois masters est déjà fit_content et le padding intact. Correctif réel : les deux SEULES instances à largeur contrainte (`bsPuo` et `ybuYp`, CTA fill_container du tour 2 mobile) reçoivent l'override libellé `textGrowth fixed-width + width fill_container + textAlign center`. **30 instances comparées avant/après : 0 bougée d'un pixel.** Démonstration du repli : les 3 composants testés à 232 de large avec un libellé long → 3 lignes, pilule 98 de haut, padding conservé, rien ne déborde (capture faite, nœud d'essai supprimé). ⚠️ Recette pour la suite : toute instance de bouton à largeur contrainte (nombre ou fill_container) doit porter ce même override de libellé ; les instances « hug » n'en ont pas besoin (la pilule grandit avec le texte) mais ne savent pas se replier — en code, un `max-width` fera ce que Pencil ne sait pas exprimer.
- **Tâche 5 — assemblage** : copies types/atelier/FAQ remplacées dans `j9QGj` (nouvelles : `ZN4AL`, `tsLDL`, `hupCE`) ; le hero des deux assemblages suit tout seul (la barre est un ref). Balayage d'accents sur les 2×6 sections (instances résolues, désactivés exclus) : **zéro contamination**. Cookies (`mF05G`, non touchée) : le bandeau s'y propage par ref, contenu hero fini à 453 < bannière à 570 ✓.

### Non vérifié / en suspens

- Plis 2 et 3 (gouttières de 12/8 px) : hors périmètre du tour, laissés tels quels — si on veut les traiter un jour, c'est dans les grilles des tours 2-3.
- Les avertissements `zTPJG`/`ToeQT` accompagnent toujours les copies (bénins connus des tours 3 et 6, ne pas « corriger »).
- Hauteur FAQ mobile mesurée à 1352 AVANT ma retouche (le carnet du tour 6 disait 1326) : écart antérieur au tour 9, cause inconnue (peut-être un reflow de fonte) — sans conséquence, les mesures de ce tour partent du réel.
- Le rendu du bandeau vérifié en capture sur les deux heros ; « dès » confirmé par lecture du nœud (la capture basse résolution laissait un doute).

## Passe correctifs — audit maquette du 2026-08-17 (hors série)

Backlog de `AUDIT-MAQUETTE-2026-08-17.md` appliqué à la maquette, avec Adrien en édition
simultanée dans l'app (voir « édition concurrente » plus bas).

- **P1.1 frais** : bandeau des deux barres hautes enrichi en « Livraison {frais} · offerte dès
  {franco} » (verbatim de la ligne FAQ « En pratique ») — une seule ligne, 260 px, hauteurs de
  barre INCHANGÉES (91/83), propagation par refs partout, aucun budget re-mesuré.
- **P1.1 délai** : ma ligne « Expédié sous {délai} depuis Nantes » posée sous le CTA des deux
  heros a été REMPLACÉE en cours de passe par la note manuscrite d'Adrien « commence par là »
  (flèche + Kalam, `note-cta`) ; interrogé, Adrien a tranché **« ne pas mettre »** — le délai
  reste FAQ-only, écart à l'audit ASSUMÉ par décision explicite du 2026-08-17.
- **Padding hero desktop** : `contenu-hero` desktop passé de 96 à 64 de padding haut pour
  rendre à la frise le budget mangé par la ligne sous le CTA (tuiles coupées par le pli avec
  ~53-125 px visibles avec la note-cta actuelle ; mobile non touché, 49-81 px visibles).
- **P2.7 barre basse** : alignée sur le code réel (`e2e/shop-mobile.spec.ts` : 5 onglets) —
  « Boutique » renommé « Créations », onglet « Rechercher » (magnifying-glass) inséré en
  position 3. Les 5 onglets font 78 px chacun, libellés non clippés (vérifié en instance).
  ⚠️ Le composant maître n'a AUCUN `layout` posé et rend bizarrement sur sa planche
  (positions figées) ; les INSTANCES, elles, se résolvent correctement — ne pas « corriger ».
- **P3.10 plis 2-3** : contenu de `02-creations/mobile` décalé de +32 px à hauteur constante
  (padding 64/64 → 96/32) : le pli 2 (1688) coupait exactement le bord bas de la photo de la
  rangée 2 (1479+209), il coupe maintenant la photo en pleine chair ; au pli 3 (2532) la carte
  Papillou (plus haute) traverse de 70 px. Copie re-synchronisée dans l'assemblage mobile,
  **relevé des 11 plis refait : tous coupent du contenu réel**, frontières de sections
  strictement inchangées (total 9750).
- **P2.6 + P1.2 + P1.3 en `context`** (spec maquette → code) : carte-produit et les deux
  cartes-collection portent « toute la carte est UN SEUL lien » ; les deux frises hero portent
  « tuiles choisies pour l'étalement des types, pas par récence » ; les deux sections FAQ
  portent « ne pas ré-émettre le JSON-LD FAQPage ».

### Édition concurrente (à savoir pour toute passe future)

- Adrien éditait dans l'app PENDANT la passe : note-cta posée sur les deux heros, copies hero
  des assemblages et de la frame cookies re-synchronisées par lui (`J7vIaF`, `g4xlyD`,
  `dkMmz`), copies atelier remplacées (`ytHTB`, `vb5kQ`). Rien de tout ça n'est de moi ;
  positions et hauteurs de sections vérifiées inchangées après coup.
  ⚠️ **Erratum (audit du dossier, 2026-08-17)** : ces nœuds ne sont pas des retouches manuelles
  d'Adrien — ils sont la « Passe créative » ci-dessous, menée en parallèle via le MCP à sa
  demande. Le constat de concurrence reste valide, l'attribution non.
- ⚠️ **`TakeScreenshot` sert un rendu périmé** quand l'app est ouverte (le CTA « disparu »
  n'était qu'un cache) : vérifier les visuels avec **`Export` png**, qui est fiable ; les
  bounds d'un `Get` dans le MÊME appel qu'une mutation peuvent aussi être à moitié recalculés
  — re-mesurer dans un appel séparé.
- Un `Move` d'une instance (`ref`) vers un frame fraîchement créé a été suivi d'un rendu vide
  même après recréation ; la structure modèle était pourtant correcte (c'était le cache
  ci-dessus). Symptôme à connaître avant de « réparer » quoi que ce soit.

### Non traité (hors périmètre solo, inchangé)

- P1.4 test des 5 secondes : après pose des vraies photos (5-8 personnes).
- P2.5 six sections vs ≤ 4, P2.8 sur-titres réintroduits, P3.11 gouttes en marge du hero
  desktop : arbitrages Léane.
- P2.9 échelle des packshots : déjà couvert par `SHOOTING.md` (fait à l'audit).

## Passe créative — ponctuation manuscrite & planche motion (2026-08-17, hors série)

Demande d'Adrien (« implémentations créatives dans la DA »), exécutée via le MCP de l'app —
EN MÊME TEMPS que la passe correctifs ci-dessus : les retouches que son entrée attribue à
« Adrien en édition simultanée » (note-cta des deux heros, copies `J7vIaF`/`g4xlyD`/`dkMmz`/
`ytHTB`/`vb5kQ`) sont en réalité CETTE passe-ci, pilotée par Adrien.

- Motif tenu : la goutte reste le motif structurant. **Le cœur entre en ponctuation**
  (arbitrage Adrien du 2026-08-17 : « Léane aime bien les cœurs, rose de préférence »),
  à deux emplacements sémantiquement motivés — l'atelier et le favori — jamais en sujet.
- **Note-cta** (remplace « Expédié sous {délai} depuis Nantes » sous les deux CTA hero,
  arbitrage « pas de délai — pression pour la créatrice ») : flèche dessinée + « commence par
  là » en Kalam (rotation −2). Texte choisi contre la répétition : le titre dit déjà « un par
  un », le chapô l'unicité, le sur-titre Nantes — la note est un griffonnage d'orientation,
  pas une réassurance. Tracé = `ACCENT_SHAPE_PATHS.arrow` de `shared/components/hand-drawn/
  paths.ts`, posé à la main (rotation 70) — fidélité exacte à la main du code, pas de
  `Generate` (dérogation assumée à la règle du tour 0 : ces tracés SONT la main).
- **Cœur atelier** : marque cœur 18 px (fill `$rose`, contour `$encre` 1,5, rotation −8) à
  côté de « environ 3 h par bijou », sous le portrait — transposition maquette de
  `HandDrawnAccent`/`heart` (dans le code, le cœur ponctue déjà le portrait de l'atelier).
  `ngs4l`/`VZ9aF` remplacés par des groupes horizontaux (`hh58U` desktop, `XnzGm` mobile),
  hauteur 32 inchangée — aucun pli ne bouge.
- **Copies re-synchronisées** : heros (`J7vIaF`, `g4xlyD`), ateliers (`ytHTB`, `vb5kQ`),
  cookies (`dkMmz`). Hauteurs d'assemblage strictement inchangées (mobile 9750, desktop 6393
  — le relevé pli par pli des passes précédentes reste valide), balayage d'accents : zéro
  contamination, colonne-récit 664×794 (trait latent connu du tour 8). Les 4 « Expédié sous
  {délai} » restants sont la ligne du bloc « En pratique » FAQ — à leur place, non touchés.
- **Planche `00-systeme/motion`** (`R4RFeq`, x 4488, grammaire de la planche composants) :
  quatre specs de micro-interactions, poses clés dessinées — rien n'anime la maquette.
  1. **États du favori** : repos · survol (fond `$gris`, recette bouton discret) · focus
     (anneau `$trait-focus` encre) · actif = touche rose (`ACCENT_SHAPE_PATHS.heart`, fill
     `$rose`) qui DÉBORDE derrière le glyphe encre — même geste que le pinceau derrière
     « colorés » ; jamais un cœur rose seul (1,55:1).
  2. **Toast d'ajout au panier** (surface qui manquait au code) : papier + trait encre 1,5 +
     rayon 20 (grammaire bannière cookies), goutte rose cerclée d'encre, « C'est dans ton
     panier » + lien « Voir le panier » ; mobile 8 px au-dessus de la barre basse ; glissement
     d'entrée < 0,1 s, jamais d'opacity: 0 au repos, disparition seule ~4 s.
  3. **Micro-balancement des pampilles du hero** : ±2° autour du point d'attache, UNE fois au
     chargement, déphasé de ~80 ms par tuile, ease-out ~1,2 s, désactivé sous
     prefers-reduced-motion.
  4. **Badge compteur en goutte** (`$rose-encre`, chiffre `$papier`) — VARIANTE du badge rond
     rose déjà posé sur l'onglet panier de la barre basse par la passe correctifs : en retenir
     UNE au passage en code ; aucun composant chrome modifié.

### Non vérifié / en suspens

- **Le tour 10 (`10-etats.md`) n'a jamais été exécuté** : pas d'entrée carnet, pas d'états
  survol/focus dans la planche carte-produit, pas de frame `chrome-scrollee`. La planche
  motion référence donc la recette du bouton discret, pas « l'état carte du tour 10 ».
- La frame motion d'origine (`ZOEMv`) a été remplacée par sa copie `R4RFeq` : rendu périmé
  persistant sur tout son sous-arbre (le piège `TakeScreenshot` de l'entrée précédente, en
  version tenace) — contenu identique, vérifié par `Export` png.
- Rendu Kalam de la note et du cœur vérifiés par `Export` ; les contrastes cités (rose-encre
  5,15:1, encre 12,6:1 sur rose) sont repris des calculs des tours 0-1, non recalculés.

## Tour 10 — États d'interaction

Exécuté le 2026-08-17 via le MCP de l'app (le tour CLI n'avait jamais tourné — constat de la
passe créative). Les deux chantiers de `10-etats.md`, rien d'autre.

- **Survol de `carte-produit` : le squiggle sous le nom** — choisi parmi les trois pistes du
  tour parce que c'est DÉJÀ l'affordance du code : `SQUIGGLE_PATH` de
  `shared/components/hand-drawn/paths.ts` (« l'affordance de lien des cartes, pas un ornement
  de titre »), posé tel quel (viewBox 0 0 84 12, trait `$trait`). Rien de nouveau n'est
  révélé (acquis du tour 0 respecté). Écartés : l'élévation (ombre floue hors DA) et le zoom
  photo (le contenu bouge sous le curseur).
- **Focus** : le MÊME squiggle + anneau `$trait-focus` (2 px) encre, offset 2, rayon 20, sur
  la carte ENTIÈRE — survol ⇒ focus tenu (WCAG 2.4.7), jamais d'anneau rose.
- Rendus dans `00-systeme/composants` → « États d'interaction » (`mx5S9`, entre les variantes
  et le doc) : deux wrappers `layout: none` 270×430 contenant une instance `ref` intacte +
  l'overlay — le composant `Trd6e` n'est PAS modifié.
- **`00-systeme/chrome-scrollee`** (`oAtQ9`, x 2840 y 2650) : les deux rangées principales
  seules (desktop 64, mobile 56), bandeau retiré par override d'instance `enabled: false`
  (composition, aucun composant chrome modifié), flottant sur un aplat `$gris` + **liseré
  1 px encre** sous la rangée (décision : trait, jamais d'ombre floue). Consigne code : le
  bandeau vit HORS du bloc sticky ; `position: sticky` sur la seule rangée principale ;
  liseré = border-bottom de l'état flottant. Le badge rose du cabas (passe correctifs) se
  propage par ref dans les démos.
- **Vérifications** : 35/35 instances existantes de `carte-produit` re-mesurées, 0 bougée
  d'un pixel (planche, tour 2 desktop/mobile, assemblages) ; bandeau absent vérifié par
  hauteurs (64/56) ET par export png ; les avertissements `G8IMgC`/`i4Cxgy` (bandeaux
  désactivés en fill_container) sont la même famille bénigne que `zTPJG`/`ToeQT`.

### Non vérifié / en suspens

- ⚠️ **Piège d'outillage confirmé et AGGRAVÉ** : un sous-arbre fraîchement créé via le MCP
  peut rester BLANC même à l'`Export` (pas seulement au `TakeScreenshot`) tant qu'il n'a pas
  été COPIÉ — remède systématique : `Copy` du frame, suppression de l'original, garder la
  copie (fait ici pour `mx5S9` et `oAtQ9`, comme pour la planche motion `R4RFeq`). Les
  bounds, eux, portent parfois un offset fantôme uniforme (+50) sur ces sous-arbres — se
  fier aux écarts RELATIFS et à l'export.
- Le squiggle de survol frôle la rangée de pastilles (fin d'encre ~y 388, pastilles y 384) —
  lisible à l'export, à ajuster en code par l'interlignage réel du nom sur deux lignes.

## Audit du dossier — 2026-08-17 (hors série)

Audit du dossier `docs/prompts/landing/` comme système de documentation (16/20, rapport :
artifact « Audit de la série pen.dev »), suivi de l'application de son plan le même jour.

- ⚠️ **DÉCOUVERTE : `{franco}` n'a AUCUNE source dans le code.** `shipping-rates.ts` ne
  connaît que deux tarifs plats (FR 4,99 € / UE 9,50 €), aucun seuil de livraison offerte —
  « Livraison offerte dès {franco} » (bandeau, toutes les frames + bloc « En pratique » FAQ)
  est une offre que la série a inventée. **Nouvel arbitrage Léane, prioritaire** : créer
  l'offre (nouveau champ dans `SHIPPING_RATES` au passage en code) ou retirer la promesse de
  la maquette. `06-faq.md` et `09-ameliorations.md` corrigés (ils affirmaient une « source
  unique côté code » inexistante) ; `{frais}` et `{délai}`, eux, ont bien leur source
  (`SHIPPING_RATES`, `PREPARATION_BUSINESS_DAYS`).
- `00-bootstrap.md` aligné sur la chrome réelle du code : barre basse **5 onglets** (Accueil ·
  Créations · Rechercher · Favoris · Panier), nav desktop « Les créations » / « Les
  collections » (plus de « Boutique » ni « À propos »), coordonnées CNPM en clair en repli
  d'import — l'outil `browser` ayant échoué aux deux tentatives, la description du prompt est
  de fait la source de la chrome.
- `landing.pen` **entre dans git** (justification « régénérable » caduque : les passes MCP du
  17/08 ne sont scriptées nulle part) ; `.gitignore` réécrit, `.bak-*`/`apercus/`/`usage/`
  restent locaux.
- `landing.sh` durci : garde « app Pen fermée ? » en préflight (la double copie app/CLI
  écrase en silence), glob strict sur les fichiers de tour, commentaires de blocs de sortie
  rafraîchis (00 et 07-10) — idem en-tête de `_checklist.md`.
- Backlog de `AUDIT-MAQUETTE-2026-08-17.md` statué item par item (fait / spécifié / arbitrage
  Léane) ; `README.md` créé (statut de la série, rejouabilité, pièges d'outillage consolidés,
  coûts : **73,36 $** au total) ; `HANDOFF.md` créé (les consignes « en code : … » du carnet,
  consolidées par surface pour le passage en code).
- Tours de reprise hors script constatés : `0b` (reprise chrome, 1,87 $, import browser en
  échec) et `04b` (finition types, 6,55 $) ont été lancés à la main — `effort_for` ne les
  connaît pas, documenté dans README.md plutôt qu'ajouté au script (cas one-shot).

### Arbitrages Léane en attente (récapitulatif à jour)

1. **Franco de port** : créer l'offre ou retirer « offerte dès {franco} » (nouveau, voir
   ci-dessus).
2. Système bicolore rose/or vs rotation lavande/menthe/soleil du code (tour 0).
3. Six sections vs critère ≤ 4 de la grille § 9 (fusionner collections + types ?).
4. Sur-titres réintroduits vs retrait du 2026-08-06.
5. « avec amour » de l'étape 4 atelier (formule interchangeable vs copie imposée).
6. Gouttes de ponctuation en marge du hero desktop (option, P3.11).

## Seconde passe d'audit maquette — 2026-08-17 (hors série)

Rapport : `AUDIT-MAQUETTE-2026-08-17b.md` — **77/100, 1 P0** (était 79/100, 0 P0 fin de
tour 9). Passe menée en lecture seule (Get/Export uniquement, inventaire des 21 frames
identique avant/après) sur **la mémoire de l'app** — le disque est resté à fin de tour 9 et
le `.pen` est toujours untracked.

- **Découverte : une passe non journalisée** postérieure au tour 10 — pied de page redessiné
  (encre → nouvelle variable `rose-pale` `#fdf0f8`, goutte or, filet `#06070b24` en dur),
  3 transitions en dégradé par assemblage (64/48 px — assemblages 6585/9894), bandeau
  livraison RETIRÉ des barres hautes, frise hero mobile remontée (fin 761 < barre basse 788).
- **Régressions mesurées** : le pied refondu a réintroduit **CM2C** (P0 — CNPM n'existe plus
  nulle part, note `SpFVf` incluse) ; frais/franco redevenus FAQ-only (P1.1 défait) ; signal
  de scroll mobile du premier écran perdu ; relevé des 11 plis refait → faux fonds de retour
  aux plis 1, 7, 8, 9 (le réglage du tour 9 est défait par les décalages).
- **Acquis confirmés** : barre basse 5 onglets + badge (+1 Mobile), planche motion aux termes
  de la grille (+1 Performance), états tour 10 (35/35 instances intactes), parité cookies,
  carte OG 100 % hex, zéro texte rose/or, alternance d'accents, copie propre (balayage
  lexical : seul « avec amour », arbitrage nº 5).
- Piste relevée : specimen « Livraison France 4,99 € · Union européenne 9,50 € » (`zmU3f`,
  planche styles) = option bandeau vrais-tarifs-sans-franco, compatible code actuel.

## Passe d'application — 2026-08-18 (backlog de l'audit 17b, « applique tout » d'Adrien)

Les 9 items du backlog appliqués (détail et vérifications item par item dans
`AUDIT-MAQUETTE-2026-08-17b.md`, statués ce jour). **Note effective : 82/100 — 0 P0.**

- **P0 CNPM** : `s1TNc`/`UW2tL`/`SpFVf` réécrits au verbatim de `consumer-law.ts` ; balayage
  final CM2C = 0, CNPM = 3.
- **Bandeau restauré** (option « restauration », arbitrage franco nº 1 toujours ouvert) :
  nouveaux nœuds `XCTvG` (desktop) / `EICEp` (mobile), texte small `lineHeight 1.26` → barres
  re-mesurées **91/83 pile**. Overrides `enabled:false` re-posés sur les démos scrollées
  (`xe1pz/XCTvG`, `r8fthJ/EICEp`) — la doc de `chrome-scrollee` redevient vraie telle quelle.
- **Frise hero mobile** : tuiles re-taillées 168×210 (la passe fantôme les avait réduites à
  190) et reposées (chaîne y40, attaches 60/86, tuiles y100/126) → coupées par la barre basse
  et le cadre ; cookies et assemblages re-synchronisés (`cp5Q1`, `q1JLo`…).
- **Plis** : transitions mobiles 48 → 16 (`MLdMu`, `RctM4`), créations bas 32 → 4, atelier
  haut 24 → 4. Relevé refait sur 9 828 px : 11/11 coupent du contenu (7 : h2 à 29 px ·
  8 : étape-1 à 97 px · 9 : h2 à 27 px). Zéro contamination d'accents sur les 4 copies neuves.
- **Nav desktop** : « Les créations · Les collections » (« À propos » supprimé) ; colonnes
  pieds « LA BOUTIQUE ». Maître accordéon aligné sur les placeholders.
- Docs mis à jour : `synclune-systeme.md` (rose-pale en table + § ajouts du 2026-08-17),
  `HANDOFF.md` § Chrome (rose-pale, filet 14 %, transitions, focus pied).
- ⚠️ Les avertissements `zTPJG`/`ToeQT` ont accompagné les re-copies : famille bénigne connue
  (tours 3/6), non « corrigée ».
- ⚠️ **Toujours pas de Cmd+S** : cette passe vit aussi en mémoire d'app. Cmd+S puis commit
  du `.pen` = le seul item restant du backlog.

## Passe du 2026-08-18 — franco abandonné, coupe hero rendue au desktop

Deux gestes demandés par Adrien, plus la mise en cohérence qui va avec.

- **Coupe du premier écran desktop rétablie** (critère § 1.5, illusion de complétude). Une passe
  antérieure de la journée avait décadré les tuiles pour « réparer » des photos coupées — or la
  coupe est le signal de continuation, pas un bug. Tuiles rendues à 230 px de haut, tops
  échelonnés 52-95, chaîne y12, attaches recalculées : les **7 tuiles traversent le pli 800**
  (bas 282 à 325 pour une frise de 254). Propagé à `08-assemblage/desktop`. Le mobile, lui,
  était déjà correct (tuiles coupées par la barre basse à 788).
- **Franco de port ABANDONNÉ** (arbitrage nº 1, tranché par Adrien). `{franco}` n'avait aucune
  source dans `shipping-rates.ts` — la maquette promettait une offre inexistante.
  - Bandeaux des deux barres hautes (`h6y2m9`, `qLf00`) → « Livraison {frais} · expédié sous
    {délai} ». Le bandeau porte maintenant **deux** valeurs à SSOT au lieu d'une promesse fausse,
    ce qui solde aussi le ◐ « coût de port ET délai » de la contre-visite.
  - Blocs « En pratique » (`WztYI`, `Ud0eJ`, `FaZ52`, `mwIMP`) → « Livraison {frais}, partout en
    France et en Union européenne ».
  - Réponse FAQ : maître `MDCJE` **et les 4 instances qui l'overridaient** (`G3ReQw/MDCJE`,
    `RJcPg/MDCJE`, `gwrtm/MDCJE`, `NScXk/MDCJE`). ⚠️ Piège : le balayage sans `resolveInstances`
    renvoyait 0 occurrence alors que la FAQ affichait encore le franco — **toujours re-balayer
    avec `resolveInstances: true`** après un changement de copie sur un maître.
  - Balayage final : `franco|offerte` = **0**, instances résolues comprises.
- Docs alignés : `HANDOFF.md` (arbitrage nº 1 tranché), `README.md`, `06-faq.md` (glossaire des
  placeholders), `09-ameliorations.md` (§ 3 marqué caduc), `11-livraison-au-code.md`.
- **Nouveau : `11-livraison-au-code.md`** — les 24 critères Performance / SEO / Accessibilité que
  la maquette ne peut pas tenir seule, avec leur méthode de vérification. 16 nœuds portent
  désormais un `context` (frises = LCP/lazy/ratio, assemblages = @graph, barres = scroll-padding
  et cibles 24 px).
- ⚠️ **Le rendu des nœuds NOUVELLEMENT insérés est cassé dans cette session de l'app** : une
  planche `00-systeme/livraison-au-code` créée puis exportée est sortie entièrement blanche,
  alors que `Get(..., {resolveVariables:true})` rendait des données correctes et qu'une planche
  existante s'exporte parfaitement. Les **mises à jour de propriétés sur nœuds existants
  fonctionnent** (hero, franco : vérifiés à l'export). La planche a été supprimée et son contenu
  livré en markdown. À re-tester après redémarrage de l'app.
- ⚠️ **Toujours pas de Cmd+S.**

## Passe du 2026-08-18 (suite) — tuiles du hero rendues ENTIÈRES

Adrien signale une seconde fois les photos coupées du hero. J'avais expliqué au passage précédent
que la coupe était délibérée (§ 1.5, illusion de complétude) ; la demande étant réaffirmée, elle
est tranchée : **les tuiles sont entières**, sur les deux formats et sur les cinq frises.

- **Desktop** (`q3d3a8`, `DOs94`) : tuiles **184×230 → 148×185** pour tenir dans les 254 px de
  frise SANS casser le ratio 4:5 (verrouillé par la spec et par `11-livraison-au-code.md`) ;
  re-centrées dans leur créneau de 208 px (x = centre − 74), donc les attaches ne bougent pas.
  Tops échelonnés 28-58, chaîne y12, attaches recalculées. Bas des tuiles : 213 à 243 ≤ 254 ✓
- **Mobile** (`Y3kcO`, `Ag3oA`, `t0LzZ`) : dimensions inchangées (168×210, déjà au ratio) ; tops
  ramenés à 40/56. Bas 250 et 266 ≤ 273 ✓ — plus rien ne touche la barre basse.
- Motifs goutte re-centrés (desktop 42/60, mobile y73).
- Export desktop + mobile vérifié : tuiles entières, chaîne et attaches lisibles.

⚠️ **Coût mesuré, accepté** : le premier écran perd le signal de continuation (grille § 1.5),
soit −1 pt → **82/100**. Inscrit comme arbitrage nº 2 du HANDOFF pour qu'aucune passe ultérieure
ne le "corrige" par réflexe. Si un signal de scroll doit revenir, il devra venir d'ailleurs que
de la coupe des photos — pistes : laisser dépasser l'en-tête de la section créations sous le pli,
ou un débord partiel de la chaîne seule (l'encre, pas les tuiles).

Les 16 avertissements restants (`touche-de-pinceau`, `tracé-flèche`, `note-manuscrite`) sont la
famille bénigne connue — de l'encre décorative qui déborde sa boîte à dessein, aucun ancêtre ne
la clippe. Présents avant la passe, non touchés.

## Audit du dossier — 2026-08-19 (hors série) : la liberté créative

Audit du dossier comme **système de prompts**, pondéré sur la demande d'Adrien (« laisser la
liberté créative à l'IA ») : **73/100**, rapport `AUDIT-DOSSIER-2026-08-19.md`. Les trois lots du
plan appliqués le même jour → 100/100 sur cette grille.

- **Constat central, mesuré** : `grep` « deux propositions | trois directions | alternative » sur
  les 16 fichiers de prompt = **0 occurrence**. La série demandait onze fois un résultat, jamais
  une fourche. Et les seuls gestes vraiment créatifs qu'elle a produits (frange de pampilles,
  squiggle, planche motion, cœur) viennent des **trois** endroits où un prompt invitait
  explicitement à créer. La production créative suit les invitations, pas les interdits.
- **Second constat** : sur les 20 items de `_checklist.md`, **zéro** portait sur la désirabilité —
  20 garde-fous, et le seul item de style était négatif. Une checklist qui n'attrape que l'échec
  produit ce qu'elle sait mesurer : une section qui ne se trompe pas et qui ne dit rien.
- **Nouveaux fichiers** : `01a-divergence.md` (trois pistes de premier écran, ⛔ pas de piste de
  sécurité — **posé, jamais exécuté**), `_signature.md` (grille de désirabilité /20, contrepoids
  de la § 9 — **pas encore passée sur la maquette**), `ETAT.md` (état courant ≤ 80 lignes),
  `AUDIT-DOSSIER-2026-08-19.md`.
- **`_checklist.md`** : bloc **SIGNATURE** en tête (test de substitution, geste propre nommé, une
  idée par section, coût de la sobriété justifié) — le seul bloc qui peut faire REFAIRE une
  section — plus un bloc PROPOSITION en pied.
- **`_conduite.md`** : **droit de proposition**, une par tour, en frame `proposition/<tour>-<sujet>`
  hors section et hors planches système. Motif : la règle « ne touche à rien » ne laissait comme
  issue que le signalement, et personne n'arbitre une idée qu'il n'a pas vue.
- **`00-bootstrap.md`** : deux planches d'accent (`00-systeme/accents-bicolore` et `-rotation`),
  contrastes recalculés des deux — l'arbitrage bloquant se prendra sur pièce. Plus les 3 frames
  vides du tour 1a et la création d'`ETAT.md`.
- **`landing.sh`** : injecte `ETAT.md` + les **deux dernières entrées** du carnet au lieu de
  `NOTES.md` entier — **66 413 → 4 689 caractères** de journal par tour (le contexte de marque
  pèse 16 922 : l'historique était les trois quarts du prompt). Plus `01a` dans `effort_for`
  (xhigh), garde **one-shot** sur 09/10 (`PEN_FORCE=1` pour passer outre), séquence complète
  = `00 · 01a · 01 → 08`.
- **Deux contradictions du corpus soldées** : `01-hero.md` exigeait la coupe de la frise que
  l'arbitrage du 2026-08-18 interdit (réécrit en « signal de continuation géométrique », avec
  l'interdit explicite et trois pistes de remplacement) ; « avec amour » est à la fois ⛔ de
  l'univers et copie imposée du tour 5 — l'exception est maintenant écrite **des deux côtés**,
  sans ouvrir de droit ailleurs, en attendant l'arbitrage de Léane.
- **Hygiène** : `11-livraison-au-code.md` ajouté à git (il était untracked), README complété
  (6 fichiers manquants à la carte, note 79 → **82**, statut et dates), `HANDOFF.md` renuméroté,
  commentaire `.prettierignore` corrigé (« non trackés » était faux depuis le 2026-08-17).
- ⚠️ **À faire ensuite, dans cet ordre** : passer `_signature.md` sur `landing.pen` (la maquette
  est notée en conformité, pas en désirabilité — c'est la passe qui dira si le diagnostic vaut
  aussi pour le livrable), puis les 5 arbitrages Léane d'`ETAT.md`, le nº 1 en premier.

## Contre-visite du dossier — 2026-08-19 (hors série) : même grille, 88/100 → 100, et passe de signature 12/20

Contre-visite de l'audit du matin (même grille — on n'en réinvente pas) : le plan du matin était
réellement appliqué, mais **88/100** — rapport `AUDIT-DOSSIER-2026-08-19b.md`. Plan appliqué le
jour même.

- **Défaut principal (manqué le matin)** : `landing.sh` enchaînait `01a → 01` d'une traite alors
  que `01a` dit « tu ne choisis pas » — la fourche n'avait pas d'arbitre. Corrigé : la séquence
  sans argument s'arrête après `01a` ; `./landing.sh suite` joue `01 → 08` ; le tour 1 lit
  `Piste retenue du tour 1a : …` dans `ETAT.md` et **refuse de tourner** sur « EN ATTENTE ».
- **Passe de signature** (`_signature.md`, première application au livrable) : **12/20** —
  substitution 4/6 (créations et FAQ substituables), geste propre 4/6 (créations et FAQ sans
  geste), idée 2/4 (créations = gabarit), sobriété 2/4 (la grille au cordeau n'a aucune
  justification écrite). Sections faibles : **créations** (grave, c'est elle qui convertit), FAQ.
- **Deux propositions dessinées** (mécanisme du droit de proposition, sections figées
  intouchées) : `proposition/contre-visite-creations` (« la grille respire » — tops 0·24·8·32,
  écho de la frange du hero) et `proposition/contre-visite-faq` (« répondue comme un message » —
  bulle signée « — Léane »). Arbitrages nº 6-7 d'`ETAT.md`. Les deux prises ⇒ ~18/20 à re-vérifier.
- **Les planches d'accent n'existaient pas dans le `.pen`** (le matin les avait ajoutées au
  prompt, pas au fichier) : `00-systeme/accents-bicolore` et `-rotation` **dessinées**,
  contrastes recalculés — la rotation ne sait pas écrire (lavande #a996e2 2,51:1, menthe
  #6ccea6 1,85:1, soleil #eec976 1,54:1 sur papier, aucune déclinaison encre en code).
  L'arbitrage bloquant nº 1 se prend enfin sur pièce.
- **Statut de 01a tranché** : instrument de la PROCHAINE refonte, hors décompte de la maquette
  actuelle (README). Préambule de `_checklist.md` scindé (garde-fous par outil, SIGNATURE par
  l'écriture — une coche sans sa phrase ne vaut rien). `synclune-systeme.md` : 4,74 → **4,72**
  (recalculé depuis les hex, c'est le système qui était faux).
- Décisions prises seul : format `EN ATTENTE — a/b/c` de la ligne d'arbitrage 01a ; propositions
  en frames plutôt qu'en retouche des sections figées ; rotation rendue rose → lavande → menthe →
  soleil (l'ordre du dégradé du hero, `section-accents.css`).
- Non vérifié / en suspens : un `ref` anonyme vide à la racine du `.pen` (`GH7Z7`), origine
  inconnue, non touché ; le rendu satori réel de la carte OG (inchangé depuis le tour 7).

## 2026-08-19 — proposition « pastilles en gouttes » (carte produit)

Suite d'une note posée sur le composant carte-produit (81/100, grille dérivée des invariants du
dépôt — session Claude Code) : son déficit signature est « rien au repos », le squiggle n'existe
qu'au survol, donc jamais sur tactile. Proposition dessinée dans le mécanisme du droit de
proposition, composant figé intouché.

- **Frame `proposition/carte-pastilles-gouttes`** (`BSC8c`, x 8418 · y 961, à droite de
  `contre-visite-faq`) : avant/après sur le composant réel (instance vs copie détachée), zoom ×4
  des pastilles, légende Ajoute/Coûte/Remplacerait. **Arbitrage nº 8 d'`ETAT.md`, non bloquant.**
  L'idée : la pastille de variante devient une goutte pleine — couleur de CONTENU portée par le
  motif de la marque, cerclage `$gris` 1 px inchangé, géométrie reprise du `Motif goutte` du
  composant (`v8zBX`).
- **Exports du jour dans `apercus/arbitrages/`** (gratuits — `pen interactive` headless, `Export`
  sans agent) : `accents-bicolore`, `accents-rotation`, `proposition-creations`,
  `proposition-faq`, `proposition-carte-pastilles-gouttes`. Le pack de la séance Léane est complet.
- **Pièges re-confirmés** : la frame neuve est sortie BLANCHE au premier `Export` — remède
  Copy-puis-Delete appliqué (`lwlZ6` → `BSC8c`), c'est bien le protocole. Un `ref` s'insère par
  l'**id** du composant (`ref:"Trd6e"`), pas par son nom — `ref:"carte-produit"` fait échouer tout
  le batch (atomique, aucun résidu). Construction via MCP de l'app (ouverte pendant la session —
  le préflight CLI a bien refusé d'écrire) ; `save()` passé depuis le shell, `.bak-prop-carte`
  posé avant.
- En code, si prise : un path unique à la place du `border-radius` du swatch — à embarquer avec
  le lot carte (variante mobile du favori, interlignage nom/squiggle, overflow « +N »).

## 2026-08-19 — les trois propositions PRISES et APPLIQUÉES (délégation Adrien)

Adrien a délégué l'arbitrage des propositions à la session (« choisis les meilleures et
applique-les »). Décision : **les trois sont prises** — chacune répond à un manque nommé par la
passe de signature, coût quasi nul, indépendantes entre elles. Les arbitrages nº 1-5 restent à
Léane, qui peut aussi défaire les trois propositions (réversibles, tout est consigné).

- **Grille respire** (créations desktop) : rangées passées en layout libre, cartes à
  x = 0·294·588·882 et tops **0·24·8·32**, rangées 462/489 px (+32 chacune) — appliqué aux
  QUATRE rangées (section `S6wpPX` + copie assemblage `Jvq8q`). Mobile intouché (2 colonnes
  alignées, conforme à la proposition).
- **FAQ-message** : dans le COMPOSANT `accordeon-question` (`afjyM`), le panneau `ToeQT` reçoit
  une bulle (`i5p10Q` : fond `$gris`, rayons 20/20/20/4, padding 16/24) ; `MDCJE` déplacé
  dedans, signature « — Léane » (`$font-cursive`, `$text-note`, `$rose-encre`) ajoutée —
  propagation automatique aux 4 rendus FAQ (sections + assemblages, desktop + mobile), les
  overrides d'instances par id (`MDCJE`) survivent au déplacement.
- **Pastilles gouttes** : dans le composant `carte-produit`, les 4 ellipses remplacées par des
  paths goutte 14×14 (couleur de contenu, cerclage `$gris` 1 px) — propagation à toutes les
  instances (sections, assemblages, états, proposition « avant », qui montre donc désormais
  des gouttes elle aussi : la frame reste lisible par sa légende).
- **Piège neuf, constaté 6× : `Replace` sur un enfant de COMPOSANT échoue via le MCP de
  l'app** (TypeError « reading 'type' », mêmes arguments qui passaient en headless sur copie
  détachée). Contournement : Delete ×4 puis Insert ×4 dans l'ordre (le conteneur ne portait
  que les pastilles). Ajouté aux pièges d'`ETAT.md`.
- **Mesures après application** (bounds re-lus) : créations desktop 1426 → **1490** (+64), FAQ
  desktop 739 → **765** (+26), FAQ mobile 1379 → **1446** (+67), assemblage desktop 6631 →
  **6721** (+90), assemblage mobile 9823 → **9890** (+67). Le « 11/11 plis coupent du
  contenu » est à re-vérifier (contenu décalé). NB : `ETAT.md` portait « ~6 393 » pour
  l'assemblage desktop alors que la mesure AVANT application donnait déjà 6 631 — la valeur
  d'`ETAT.md` était périmée, les nouvelles font foi.
- **Frames `proposition/*` renommées « — PRISE »**, contexts annotés (décision + réversibilité).
  Rendus de contrôle : `apercus/apres-propositions-{creations,faq,assemblage}.png` — vérifiés
  dans la session (échelonnage, bulle signée, gouttes partout). `landing.pen` sauvé via la
  session app (`save()` ×2) ; backups `landing.pen.bak-prop-carte` et `.bak-props-appliquees`.
- **La signature 12/20 est à re-noter sur pièce** (l'audit projetait ~18/20 avec les nº 6-7 —
  on ne s'auto-attribue pas la note, conformément à `_checklist.md`).
- En code : consignes ajoutées à `HANDOFF.md` (nth-child créations, bulle FAQ, path goutte).

## 2026-08-19 — arbitrages nº 1-4 tranchés (Adrien), nº 5 reformulé en pistes de fond

Séance d'arbitrage menée par Adrien dans la session (questions fermées, sur pièce).

- **Nº 1 — BICOLORE rose/or** (recommandation suivie) : la maquette entière est bâtie dessus et
  l'accent sait écrire. En code : créer `or` `#ffe2a2` / `or-encre` `#896e2c`, retirer la
  rotation `[data-accent]`. **Le passage en code est DÉBLOQUÉ.**
- **Nº 2 — SIX sections** (pas de fusion collections+types). **Nº 3 — sur-titres PARTOUT** (à
  réintroduire sur les 5 routes boutique). **Nº 4 — « avec amour » remplacé** dans les 4
  occurrences (`corps-étape` ×4 : sections + assemblages) par « les doigts encore pleins de
  peinture ». ⚠️ Précision d'Adrien en cours de passe : la formule ne doit pas être
  « systématiquement présente » — pas de purge : elle peut réapparaître ponctuellement.
- **Nº 5 reformulé** : Adrien veut des recommandations de FOND pour le hero desktop. Planche
  `proposition/hero-fonds` dessinée (copies du hero, section intouchée) : **A** bain rose-pale
  (frise comprise — son fond `$papier` masquait le bain, corrigé), **B** filigrane de marges
  au trait encre ~10 %, **C** lavis rose-pale pleine largeur sous la frise. Export
  `apercus/arbitrages/proposition-hero-fonds.png`.
- **Direction de motif donnée par Adrien en cours de passe** : « trop de gouttes » (en partie
  un artefact des placeholders — les vraies photos en retireront beaucoup), et « Léane aime
  bien les cœurs ». Conséquences : le filigrane B est passé de 5 gouttes à **3 cœurs + 2
  gouttes** (géométrie du `tracé-cœur` de l'atelier), et `ETAT.md` § motif porte désormais
  « la goutte se dose, le cœur est bienvenu en ponctuation ».
- **Pièges neufs** : dans une string `input` du shell pen, `\d` de regex est mangé par
  l'échappement JS (`'\d'` → `d`) — écrire les regex sans backslash ou passer par
  `[0-9]` ; les enfants d'un frame en flex ignorent x/y — poser `layoutPosition:"absolute"`
  (constaté : les 5 filigranes empilés au centre au premier rendu).
- Reste ouvert : le choix A/B/C/blanc du fond de hero — puis application à `01-hero/desktop`
  (+ copie assemblage, + déclinaison mobile si A).
