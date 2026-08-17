# Passe § 9 sur la maquette — 2026-08-17

La grille officielle (`docs/LANDING-BEST-PRACTICES.md` § 9) audite un site rendu ; ici elle est
passée sur **la maquette** (`landing.pen`, état de fin de tour 9). Trois régimes de verdict :

- ✓ / ✗ — jugeable sur la maquette (lecture de nœuds, mesures des tours, captures) ;
- ◐ — partiellement tenu, détail en note ;
- → code — le critère ne se juge qu'au rendu (tests du dépôt, HTML servi) ; la maquette est
  notée sur ce qu'elle **prépare** structurellement.

**Note maquette : 79/100** — aucun P0. Le détail bloc par bloc, puis le backlog.

## Premier écran — 13/18

| Verdict | Critère | Note |
| --- | --- | --- |
| ◐ | Test des 5 secondes | Porté par le texte seul (« Des bijoux colorés, faits un par un » + « ATELIER À NANTES ») — **à faire passer sur 5-8 personnes une fois les vraies photos posées** (§ 7.4), pas avant : les placeholders fausseraient le test. |
| ◐ | 40-50 % des types visibles au premier écran | ⚠️ Les 7 tuiles du hero sont « les premières créations du catalogue » (carnet, tour 1) — **rien ne garantit l'étalement des types**. La requête code doit choisir les tuiles pour la couverture, pas par récence. |
| ✓ | Section suivante visiblement coupée | Relevé pli par pli du tour 9 : 11/11 plis coupent du contenu. |
| ✓ | Pas de flèche de scroll | Débord géométrique seul. |
| ✓ | Pas de carrousel | Grilles statiques partout. |
| ✓ | Pas de promo au détriment de la marchandise | Bandeau franco = 27 px d'information ; hero sous bannière cookies vérifié (tour 7). |
| ◐ | Pièces choisies pour l'étalement | Vrai en section 2 (délibéré, tour 2), **pas dans le hero** (même défaut que la ligne 2). |
| ✓ | Aperçu social dit ce que vend la boutique, pas gris | Carte 100 % hex (contrainte Satori tenue), « BIJOUX COLORÉS FAITS MAIN · NANTES » lisible. |

## Copie et liens — 10/12

Tenu : zéro superlatif, point principal en tête, aucun lien d'un mot, portée chiffrée partout,
sur-titres = contexte seul, tutoiement.
◐ **CTA de carte** : la maquette ne dit pas si la carte entière est le lien — à spécifier (carte
entière cliquable, recommandé). → code : cohérence `aria-label` / texte visible.
⚠️ Note d'arbitrage : la maquette **réintroduit des sur-titres** alors qu'ils ont été retirés des
5 routes boutique le 2026-08-06 — conformes au critère (contexte, pas proposition de valeur),
mais la divergence avec la décision passée est à assumer sciemment.

## Structure — 6/8

✗ **Six sections, le critère dit quatre ou moins.** C'est le seul critère formellement échoué —
et c'est un choix de conception assumé par la série (sections basses légères et scannables,
budget d'attention rappelé à chaque tour). Deux issues : l'assumer par écrit (les sections 5-6
ne portent aucune information critique seule depuis que le franco est remonté — presque vrai,
cf. Confiance), ou fusionner collections + types en un bloc d'orientation unique. À arbitrer
avec Léane, pas en solo.
Tenu : récit après le périmètre, récit = accroche, aucune section sans sortie ni débord, aucun
CTA répété hors terminus.

## Confiance et légal — 16/18

Tenu (13 lignes) : retours atteignables, « Commande sans créer de compte » écrit, contact,
fait main affirmé, zéro photo de stock, portrait documenté (priorité 1 du shooting), pas
d'avis, pas de logo non mérité, pas de badge sécurité, **médiateur CNPM** (corrigé le
2026-08-17), **zéro lien RLL/ODR**, pages légales au pied, **parité cookies mesurée** (deux
pilules identiques, un clic chacune).
◐ **Coût de port et délai d'expédition** : le bandeau ne porte que le franco ; `{frais}` et
`{délai}` ne vivent que dans le bloc « En pratique » de la FAQ — **dernière section, < 15 %
d'audience**. Ce sont les motifs d'abandon nº 1 et 2 : les remonter (bandeau enrichi
« Livraison {frais} · offerte dès {franco} », ou ligne près du CTA hero).

## Cartes et grille — 11/12

Tenu : prix permanent, variantes visibles, image sur chaque carte (placeholders nommés,
`pickPrimaryImage()` au code), vendu = porte, pas de « prévenez-moi » seul, favoris sans compte.
◐ **Échelle** : 1 portée + 1 main sur 8 cartes — les 6 packshots sur fond simple laissent
l'échelle indéterminable carte par carte. Consigne ajoutée à `SHOOTING.md`.

## Rareté et loyauté — 6/6

Ligne claire tenue (badges vrais demain), zéro compteur, aucun prix barré.

## Performance — 3/10 (le reste → code)

Ce que la maquette prépare : placeholders au ratio final exact (anti-CLS), interdit système des
animations d'entrée à `opacity: 0`, une seule image candidate LCP identifiable (tuile 1 du
hero). Tout le reste (budget labo, size-limit, `loading=` dans le HTML servi, fallback de
police) ne se juge qu'au code.

## Accessibilité — 6/10 (le reste → code)

Ce que la maquette tient : contrastes recalculés depuis les hex à chaque tour (jamais estimés),
cibles ≥ 24 px de la checklist, focus système encre 2 px (+ états carte du tour 10), libellés
repliables (tour 9). → code : axe-core, 2.4.11 sous barres collantes (`scroll-padding`),
320 px / zoom 400 %, parcours clavier.

## SEO — 2/8 (le reste → code)

La maquette tient le territoire distinctif dans le titre (coloré + Nantes) et n'invente aucun
balisage. ⚠️ **Piège au passage en code** : la FAQ redevient visible — **ne pas ré-émettre le
nœud `FAQPage`** (rich result retiré, grille § 6.3, verrouillé par
`catalogue-single-breadcrumb.regression.test.ts`). `hasShippingService` /
`hasMerchantReturnPolicy` restent le meilleur rapport effort/valeur, hors maquette.

## Mobile — 6/8

Tenu : `svh`/`dvh` imposé par le système, pas de popup au chargement, nav desktop visible,
pas de scroll infini, pied atteignable, aucun champ de saisie sur la page.
◐ **Barre basse : 4 onglets dans la maquette** (Accueil · Boutique · Favoris · Panier), la
grille et `e2e/shop-mobile.spec.ts` en attendent **5** — vérifier ce que porte le 5ᵉ dans le
code actuel (Recherche ?) et aligner l'un ou l'autre sciemment.

---

## Backlog

**P0 — aucun.** (Médiateur corrigé, zéro RLL/ODR, parité cookies mesurée, aucun dark pattern.)

**P1 — perte de vente documentée ou garde-fou de code :**

1. Remonter `{frais}` et `{délai}` hors de la seule FAQ (motifs d'abandon nº 1 et 2 à 40 % et
   20 %) — bandeau enrichi ou ligne près du CTA.
   **[2026-08-17 — partiel, tranché]** `{frais}` remonté au bandeau (« Livraison {frais} ·
   offerte dès {franco} », passe correctifs) ; `{délai}` : « ne pas mettre » décidé par Adrien
   (pression pour la créatrice), reste FAQ-only — écart assumé. ⚠️ Découverte de l'audit du
   dossier (même jour) : **`{franco}` n'a aucune source dans le code** (aucun seuil dans
   `shipping-rates.ts`) — l'offre elle-même est un arbitrage Léane, ajouté à la file.
2. Requête des tuiles hero choisie pour l'**étalement des types** (40-50 % du catalogue au
   premier écran), pas par récence.
   **[2026-08-17 — spécifié]** Consigne posée en `context` sur les deux frises hero (passe
   correctifs) ; l'implémentation reste au passage en code.
3. Au passage en code : ne pas ré-émettre `FAQPage` avec le retour visuel de la FAQ.
   **[en attente — passage en code]** Consigne posée en `context` sur les deux sections FAQ.
4. Faire passer le test des 5 secondes (5-8 personnes) une fois les photos réelles posées.
   **[en attente — après le shooting]**

**P2 — friction ou divergence à arbitrer :**

5. Six sections vs critère ≤ 4 : assumer par écrit ou fusionner collections + types (Léane).
   **[arbitrage Léane — en attente]**
6. Spécifier la carte produit entière comme lien (CTA auto-descriptif).
   **[2026-08-17 — spécifié]** `context` posé sur carte-produit et les deux cartes-collection
   (passe correctifs) ; à tenir au passage en code (`aria-label` cohérent).
7. Barre basse 4 vs 5 onglets : aligner maquette et e2e sciemment.
   **[2026-08-17 — fait]** Maquette alignée sur le code : 5 onglets, « Boutique » renommé
   « Créations », « Rechercher » inséré (passe correctifs) ; `00-bootstrap.md` corrigé le même
   jour (audit du dossier).
8. Sur-titres réintroduits vs retrait du 2026-08-06 : trancher une fois pour toutes les routes.
   **[arbitrage Léane — en attente]**
9. Échelle des 6 packshots : consigne de shooting (fait — cf. `SHOOTING.md`).
   **[2026-08-17 — fait]**

**P3 — confort :**

10. Plis mobiles 2-3 affleurant des gouttières de cartes (12/8 px, grilles des tours 2-3).
    **[2026-08-17 — fait]** Contenu de `02-creations/mobile` décalé de +32 px à hauteur
    constante ; relevé des 11 plis refait, tous coupent du contenu réel (passe correctifs).
11. Hero desktop très aéré : 2-3 gouttes de ponctuation en marge, si Léane en veut plus.
    **[arbitrage Léane — en attente]** La passe créative a posé la note « commence par là »
    sous les CTA ; les gouttes de marge restent une option.

Chaque case cochée porte la date de cette passe (2026-08-17) et devra être re-passée sur le
**site rendu** avec les vérifications `test`/`inspect` de la grille — cette passe maquette ne
les remplace pas.
