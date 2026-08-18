# Passe § 9 sur la maquette — 2026-08-17, seconde passe (état post-tour-10)

Seconde passe de la grille (`docs/LANDING-BEST-PRACTICES.md` § 9) sur `landing.pen`. La première
(`AUDIT-MAQUETTE-2026-08-17.md`, **79/100**) notait l'état de fin de tour 9 ; celle-ci note
l'état **après** la passe correctifs, la passe créative, le tour 10 — **et une passe non
documentée** découverte pendant l'audit (voir § État audité). Mêmes régimes de verdict :
✓ / ✗ / ◐ / → code. Le backlog de la première passe n'est pas ré-instruit : chaque item y est
repris par son statut.

**Note maquette : 77/100 — 1 P0 (réapparu).** La maquette a gagné le tour 10 et la planche
motion, mais une passe tardive a défait trois acquis mesurés du carnet.

## État audité — à lire avant les notes

- **État = la mémoire de l'app Pen du 2026-08-17** (session MCP). Le fichier sur disque est
  byte-identique à `bak-10` (fin de tour 9, 10:21) : **Cmd+S jamais fait depuis**, et le `.pen`
  est **toujours untracked dans git** alors que README/`.gitignore` le disent versionné. Tant
  que ces deux gestes manquent, tout ce que cette passe note peut disparaître avec l'app.
- **Une passe non journalisée** a eu lieu après le tour 10 (aucune entrée dans `NOTES.md`) :
  pied de page redessiné (encre → `rose-pale`, nouvelle variable `#fdf0f8`, goutte or, filet
  `#06070b24` en dur), **3 frames de transition en dégradé** insérées dans chaque assemblage
  (papier↔or, papier→rose-pale ; 64 px desktop, 48 px mobile — assemblages 6585/9894 px),
  **bandeau livraison retiré** des deux barres hautes, et frise du hero mobile remontée
  (fin à 761 px). C'est ce lot qui porte l'essentiel des écarts ci-dessous.
- Vérifications de cette passe : inventaire des 21 frames racine, balayage hex/fills sur tout
  le document, contrastes recalculés depuis les hex, relevé des 11 plis mobiles refait sur
  9894 px, exports PNG des 21 frames (`Export`, jamais `TakeScreenshot`), zéro mutation
  (inventaire identique en fin de passe).

## Le P0 — médiateur redevenu faux

Les deux pieds de page (composants `NAapJ`, `LIf3N`) portent à nouveau **« CM2C — cm2c.net ·
14 rue Saint-Jean, 75017 Paris »**, et « CNPM » n'existe plus nulle part dans le document ;
la note doc `SpFVf` est elle aussi revenue à l'état d'avant correction. La correction
d'orchestration post-tour-8 (CNPM, 27 avenue de la Libération, 42400 Saint-Chamond —
cnpm-mediation-consommation.eu, SSOT `shared/constants/consumer-law.ts`) a été **écrasée par
la refonte du pied**. Ligne opposable de la grille (art. L612-1) : des coordonnées fausses
sont pires qu'absentes — un design validé avec ce pied embarquerait l'erreur au passage en
code.

## Notes par bloc

### Premier écran — 12/18 (était 13)

| Verdict | Critère | Note |
| --- | --- | --- |
| ◐ | Test des 5 secondes | Inchangé — après le shooting (P1.4 de la 1ʳᵉ passe). |
| ◐ | 40-50 % des types visibles | Inchangé — consigne d'étalement posée en `context`, à l'implémentation. |
| ◐ | Section suivante visiblement coupée | **Régression mobile.** Desktop : tuiles coupées par le pli 800 ✓. Mobile : la frise remontée finit à **761**, au-dessus de la barre basse (788) — plus rien n'est coupé au premier écran, et le pli 1 de l'assemblage (844) est un faux fond (frise 761, en-tête créations 940). Le tour 9 avait 199 px de tuiles traversant le pli. |
| ✓ | Pas de flèche de scroll | Inchangé. |
| ✓ | Pas de carrousel | Inchangé. |
| ✓ | Pas de promo au détriment de la marchandise | Le bandeau a disparu ; hero sous bannière cookies re-vérifié (contenu fini à 488 < bannière 570). |
| ◐ | Pièces choisies pour l'étalement | Inchangé (hero → code). |
| ✓ | Aperçu social | Inchangé — 100 % hex re-vérifié au balayage (29 encre, 10 rose, 1 rose-encre, 1 papier). |

### Copie et liens — 10/12 (inchangé)

Zéro superlatif (balayage lexical : seule occurrence sensible = « avec amour », étape 4 —
arbitrage nº 5), tutoiement, liens de sortie avec portée (« Voir les 14 créations », « Voir
les 4 collections », « Écris-moi un message », « Lire l'histoire de l'atelier »), sur-titres =
contexte seul. ◐ CTA de carte : spécifié en `context` (carte entière = UN lien), reste → code.

### Structure — 6/8 (inchangé)

✗ Six sections vs ≤ 4 : arbitrage nº 3, inchangé. Les nouvelles transitions en dégradé font
un liant visuel entre sections mais ne changent pas le compte — et elles ont un coût sur les
plis (voir Mobile).

### Confiance et légal — 13/18 (était 16)

| Verdict | Critère | Note |
| --- | --- | --- |
| ✗ **P0** | Coordonnées du médiateur | **CM2C réintroduit** — voir en tête. |
| ◐ | Coût de port et délai | **Régression.** Le bandeau « Livraison {frais} · offerte dès {franco} » (P1.1, tranché et fait) a été retiré des barres hautes : frais, franco et délai ne vivent plus QUE dans la FAQ — dernière section, < 15 % d'audience, soit exactement le défaut que P1.1 corrigeait. Incohérences si le retrait est voulu (exécution de l'arbitrage nº 1 par abandon de l'offre) : la FAQ promet toujours « offerte dès {franco} », `chrome-scrollee` documente un bandeau disparu, HANDOFF/carnet pas mis à jour. |
| ✓ | Le reste du bloc | Retours atteignables, « Commande sans créer de compte » écrit (graisse medium, bloc « En pratique »), contact, fait main affirmé, zéro photo de stock, portrait = priorité shooting, pas d'avis, pas de logo, pas de badge sécurité, zéro lien RLL/ODR (re-vérifié), pages légales au pied, parité cookies re-vérifiée (2 pilules 163×50 identiques, 1 clic chacune). |

### Cartes et grille — 11/12 (inchangé)

Prix permanents, variantes visibles, image partout, vendu = porte (« Commander une pièce
comme elle »), favoris sans compte, favori mobile bas-droite (re-vérifié en capture).
◐ Échelle : consigne `SHOOTING.md`, inchangé.

### Rareté et loyauté — 6/6 (inchangé)

Badges vrais-demain, zéro compteur, aucun prix barré. ⚠️ Vigilance liée à l'arbitrage nº 1 :
« offerte dès {franco} » (FAQ) promet une offre qui n'existe pas dans le code — tant que c'est
un placeholder d'arbitrage c'est propre, au passage en code ce serait une promesse fausse.

### Performance — 4/10 (était 3, le reste → code)

Acquis de la 1ʳᵉ passe inchangés (placeholders au ratio exact, interdit `opacity: 0`, LCP
identifiable). **+1 : la planche motion** spécifie les quatre micro-interactions dans les
termes exacts de la grille (démarrage < 0,1 s, transform/opacity seuls, jamais d'`opacity: 0`
au repos, `prefers-reduced-motion`, balancement UNE fois).

### Accessibilité — 6/10 (inchangé, le reste → code)

Contrastes recalculés depuis les hex de cette passe : encre/papier 19,59 · encre/or 15,97 ·
encre/rose-pale 18,21 · rose-encre/papier 5,15 · or-encre/papier 4,72 — tout ce qui écrit
passe ; onglet actif barre basse en `rose-encre` ✓ ; zéro texte encré `$rose`/`$or` (balayage
complet). États survol/focus du tour 10 : squiggle + anneau encre 2 px sur la carte ENTIÈRE
(2.4.7 tenu), 35/35 instances intactes. Le squiggle frôle les pastilles (~4 px) — consigne
d'interlignage déjà au HANDOFF.

### SEO — 2/8 (inchangé, le reste → code)

Territoire dans le titre, aucun balisage inventé, `context` anti-`FAQPage` posé.

### Mobile — 7/8 (était 6)

**+1 : barre basse alignée** sur le code (5 onglets Accueil · Créations · Rechercher ·
Favoris · Panier, badge rose à chiffre encre) — P2.7 soldé. Le point perdu : la **nav desktop
du composant barre-haute porte toujours « Boutique · Collections · À propos »** alors que le
code réel dit « Les créations · Les collections » (00-bootstrap corrigé le 2026-08-17, le
composant jamais) — même famille de divergence que les 4 onglets d'avant.

⚠️ **Relevé des 11 plis refait (assemblage mobile 9894 px) — le réglage du tour 9 est
défait** : les transitions insérées et le retrait du bandeau ont décalé toute la chaîne.
Plis 2-5, 10 ✓ (cartes/questions coupées en pleine chair) · pli 6 ◐ (aplat or continu,
gouttière de 24 px) · pli 11 ✓ (dans le pied). **Faux fonds : pli 1** (rien entre 761 et
940), **pli 7** (seul le dégradé or→papier traverse, 22 px), **pli 8** (33 px de vide,
l'étape 1 commence 15 px sous le pli), **pli 9** (120 px de vide entre atelier et FAQ).

## La passe non documentée — jugement de design

À arbitrer, pas à défaire d'office :

- **Pied `rose-pale`** : joli geste (le pied encre était le seul aplat sombre de la page), tout
  le texte en encre (18,21:1), goutte or décorative. Mais : 8ᵉ variable couleur non documentée
  (le système dit « pas de troisième couleur d'interface » — `rose-pale` est une teinte du
  rose, à écrire dans `synclune-systeme.md` si retenue), filet `#06070b24` en dur (première
  entorse au « zéro valeur libre » hors carte OG), et la règle « sur fond encre, focus papier »
  devenue caduque sans remplaçante.
- **Transitions en dégradé** : grammaire nouvelle (le système prévoyait « blanc + filets gris
  1 px »). Celles vers/depuis l'or fonctionnent ; papier→rose-pale est à 1,08:1 — quasi
  invisible, l'effet n'existe pas. Et le dégradé or→papier au pli 7 fait un signal de FIN de
  section à l'endroit exact où il faudrait un signal de continuation.
- **Retrait du bandeau** : si c'est l'exécution de l'arbitrage nº 1 (abandon du franco), il
  est incomplet (FAQ, chrome-scrollee, HANDOFF) ; si c'est un accident de refonte, la recette
  de restauration est au carnet (tour 9 + passe correctifs). Dans les deux cas le specimen
  « Livraison France 4,99 € · Union européenne 9,50 € » apparu dans la planche styles
  (`zmU3f`) suggère une piste : un bandeau aux **vrais tarifs, sans franco** — compatible avec
  le code actuel sans créer d'offre.

## Backlog — appliqué le 2026-08-18 (sauf le geste manuel)

**P0 :**

1. **Rétablir le CNPM** dans `NAapJ`, `LIf3N` et la note `SpFVf` (verbatim de
   `shared/constants/consumer-law.ts`), puis re-balayer « CM2C » = 0 occurrence.
   **[2026-08-18 — fait]** Balayage final : CM2C = 0, CNPM = 3 (2 pieds + note).

**P1 :**

2. **Trancher le bandeau** (lié à l'arbitrage Léane nº 1) : restaurer « Livraison {frais} ·
   offerte dès {franco} » (recette carnet), OU acter le retrait et purger la promesse franco
   de la FAQ + mettre à jour `chrome-scrollee`/HANDOFF, OU bandeau aux vrais tarifs sans
   franco (piste `zmU3f`).
   **[2026-08-18 — fait, option restauration]** Bandeau tour 9 rebâti dans `M6cFW`/`CX8Rg`
   (hauteurs re-mesurées 91/83, propagation par refs partout), overrides `enabled:false`
   re-posés sur les 2 démos `chrome-scrollee` (64/56 vérifiés). L'arbitrage franco nº 1
   reste **ouvert** — le bandeau porte le placeholder, comme la FAQ.
3. **Rendre au hero mobile son signal de scroll** : la frise doit redescendre sous la barre
   basse (recette tour 1 : tuiles coupées à 788), ce qui re-soldera le pli 1.
   **[2026-08-18 — fait]** Tuiles rendues à 168×210 (4:5), reposées à 615/641 → coupées par
   la barre basse (788) et le cadre (844) ; pli 1 de l'assemblage traversé à 203 px.
4. **Re-régler les plis 7-8-9** en intégrant les transitions dans le calcul (les faire
   traverser par du contenu, ou réduire les paddings de frontière comme au tour 9).
   **[2026-08-18 — fait]** Transitions mobiles 48 → 16, créations bas 32 → 4, atelier haut
   24 → 4 (tout sur l'échelle). Relevé refait (assemblage 9 828) : **11/11 plis coupent du
   contenu** — 7 : h2 atelier (29 px) · 8 : étape-1 (97 px) · 9 : h2 FAQ (27 px) ·
   10 : question fait-main (76 px) · 11 : 350 px dans le pied.

**P2 :**

5. Aligner la nav desktop de `M6cFW` sur le code : « Les créations · Les collections »
   (« À propos » → soit retiré, soit « L'atelier » vers la future page) ; cohérence de la
   colonne « BOUTIQUE » du pied avec le renommage « Créations ».
   **[2026-08-18 — fait]** Nav = « Les créations · Les collections », « À propos » retiré
   (l'atelier a déjà sa colonne au pied) ; colonnes pieds renommées « LA BOUTIQUE »
   (le titre du footer réel).
6. Documenter la passe tardive : entrée `NOTES.md`, `rose-pale` + filet + dégradés dans
   `synclune-systeme.md` (ou retrait), nouvelle règle de focus du pied.
   **[2026-08-18 — fait]** `synclune-systeme.md` (table + § ajouts 2026-08-17),
   `HANDOFF.md` § Chrome, entrée carnet « Passe d'application ».
7. **Cmd+S dans l'app, puis commit du `.pen`** — le fichier est untracked et le disque a
   7 h de retard sur la mémoire de l'app ; c'est le seul exemplaire de l'état final.
   **[en attente — geste manuel d'Adrien]** Toujours vrai, et plus urgent encore : la passe
   d'application vit elle aussi en mémoire d'app.

**P3 :**

8. Maître `accordeon-question` : « Colissimo » et « 3 à 5 jours » en dur sur la planche
   (les instances des sections sont propres) — cosmétique de planche.
   **[2026-08-18 — fait]** Réponse du maître alignée sur la section ({délai}/{frais}/{franco}).
9. Dégradé papier→rose-pale invisible (1,08:1) : assumer l'invisibilité ou passer par `gris`.
   **[2026-08-18 — assumé par écrit]** Documenté comme raccord de surface
   (`synclune-systeme.md`).

**Note effective après application : 82/100 — 0 P0.** Premier écran remonte à 13 (signal de
scroll mobile restauré), Confiance à 16 (CNPM + bandeau), Mobile à 8 (nav alignée) ; le reste
inchangé. Les ~19 points « → code » restent la limite de l'exercice maquette.

**Arbitrages Léane — inchangés (6)** : franco (nº 1, maintenant lié au P1.2 ci-dessus) ·
bicolore rose/or vs rotation (nº 2) · six sections (nº 3) · sur-titres (nº 4) · « avec
amour » (nº 5) · gouttes de marge hero (nº 6).

Chaque verdict porte la date de cette passe (2026-08-17, état app en mémoire) ; la passe sur
le **site rendu** avec les vérifications `test`/`inspect` reste due au passage en code.
