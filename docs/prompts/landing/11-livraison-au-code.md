# 11 — Livraison au code : les critères que la maquette ne peut pas tenir seule

> Contrat d'implémentation de la landing. Trois blocs de la grille d'audit
> (`docs/LANDING-BEST-PRACTICES.md` § 9) se vérifient sur du **HTML servi** ou par un **test** :
> une maquette ne peut que les SPÉCIFIER. Chaque ligne porte sa méthode de vérification, reprise
> de la grille. Posé à la passe du 2026-08-18.
>
> Les lignes marquées ⟨pen⟩ sont **aussi** inscrites en `context` sur le nœud concerné de
> `landing.pen`, pour qu'elles voyagent avec la maquette.

## Performance — bloc 10 pts

| # | Règle | Vérification |
| --- | --- | --- |
| 1 | ⟨pen⟩ L'image LCP n'est jamais lazy-loadée — c'est la **première tuile** de la frise du hero | `inspect` dans le HTML SERVI : `curl -s localhost:3000 \| grep -o 'loading="[a-z]*"' \| head`. Jamais la console : les attributs sont réécrits à l'hydratation |
| 2 | ⟨pen⟩ **Une seule** image en priorité haute, et son `preload` va avec | `inspect` — aucune autre tuile n'est prioritaire |
| 3 | ⟨pen⟩ Toutes les images sous la flottaison sont en `lazy` | `inspect` — le seuil Chrome charge à 1250 px en 4G, bien avant la visibilité |
| 4 | ⟨pen⟩ Toute image porte `width`/`height` ou `aspect-ratio`. Tuiles hero et cartes produit : **4:5** ; vignettes de collection : **1:1** | `inspect` — 1ʳᵉ source de CLS. Les placeholders de la maquette sont déjà au ratio exact |
| 5 | ⟨pen⟩ Aucune animation d'entrée ne maintient le contenu LCP invisible | `inspect` — `fill-mode: both` tient le LCP à `opacity: 0`. Défaut **mesuré**. Déjà interdit par la planche `00-systeme/motion` |
| 6 | Les seules propriétés animées au chargement sont `transform` et `opacity` | `inspect` — `top`, `left`, `box-shadow` déclenchent du CLS |
| 7 | Le poids de la route reste sous budget | `test` — `pnpm size`, entrée `Homepage` de `.size-limit.json` |
| 8 | Fallback de police : **Winky Sans est hors table capsize**, la compensation de métriques est donc impossible — impossibilité documentée et datée, pas ignorée | `inspect` — la grille accepte l'impossibilité documentée comme conforme |

## SEO — bloc 8 pts

⟨pen⟩ L'ensemble est inscrit sur les deux frames `08-assemblage`.

| # | Règle | Vérification |
| --- | --- | --- |
| 1 | **Un seul** `<script>` JSON-LD sur l'URL, un `@graph` unique | `test` `catalogue-single-breadcrumb.regression.test.ts` |
| 2 | `Organization`, sous-type `OnlineStore`, présent sur la page d'accueil | `test` `structured-data.test.tsx` |
| 3 | `hasShippingService` + `hasMerchantReturnPolicy` déclarés **une fois** sur `Organization` | `inspect` — meilleur rapport effort/valeur du document ; source = `SHIPPING_RATES` + CGV |
| 4 | **Aucune `BreadcrumbList` sur `/`** : à un seul item, elle ne contient que l'élément que Google demande d'omettre | `inspect` — Google exige ≥ 2 items |
| 5 | Ne PAS ré-émettre `FAQPage` avec le retour visuel de la FAQ, ni `HowTo`, ni `SearchAction`. **Ne pas supprimer l'existant non plus** : valide, inerte | `inspect` — rich results retirés ; la suppression est aussi inutile que l'ajout |
| 6 | Aucun nœud de balisage ne survit à la section qu'il décrit | `test` `catalogue-single-breadcrumb.regression.test.ts` |
| 7 | Le titre porte le territoire distinctif — coloré, Nantes — pas seulement le générique | `test` `e2e/seo.spec.ts` ; vérifier que le repli global dit la même chose que la page |
| 8 | Si `LocalBusiness` est émis, son `address` **n'est pas un domicile privé** | `inspect` `BUSINESS_INFO.location` — décision de vie privée, pas un réglage SEO |

## Accessibilité — bloc 10 pts

Rappel § 6.2 : la conformité est **volontaire** ici (exemption micro-entreprise) — donc arbitrée, pas maximisée.

| # | Règle | Vérification |
| --- | --- | --- |
| 1 | ⟨pen⟩ Aucun élément focalisé masqué par la barre haute collante ou la barre basse mobile | `inspect` — WCAG 2.4.11 ; correctif CSS `scroll-padding-top` / `scroll-padding-bottom`, **jamais JS** |
| 2 | ⟨pen⟩ Toute affordance en icône seule ≥ **24 × 24 px**, cercles non sécants mesurés de centre à centre | `inspect` — WCAG 2.5.8. Concerne le favori des cartes et les 5 onglets de la barre basse |
| 3 | La page se replie proprement à **320 px** / zoom 400 % | `test` `e2e/a11y/zoom-a11y.spec.ts` — 320 px, pas 375 |
| 4 | La mise en page survit aux espacements de texte de 1.4.12 | `inspect` — suspects : cartes à hauteur fixe, badges dimensionnés sur leur texte. La maquette n'en pose aucun |
| 5 | Contraste 4,5:1 (3:1 au-delà de 24 px) — **mesurer en peignant en canvas** et en relisant le pixel | `inspect` — `getComputedStyle` rend l'`oklch()` : une lecture directe ne mesure rien |
| 6 | Aucune boucle d'animation infinie coexistant avec du contenu | `inspect` — WCAG 2.2.2 **niveau A**. Correctif proportionné : borner les itérations |
| 7 | `prefers-reduced-motion` honoré — moins de mouvement, pas zéro | `test` `e2e/a11y/` + `app/styles/animations.css` (le killswitch ne coupe que `animation`) |
| 8 | Parcours clavier complet re-testé **après le dernier changement** | `test` `e2e/a11y/keyboard-navigation.spec.ts` + passage humain |

## Ce qui reste hors de portée du code seul

- **Le shooting photo** débloque trois critères ◐ : test des 5 secondes (§ 1.2), étalement 40-50 % des types (§ 1.3), portrait de la créatrice (§ 4.4).
- **Un arbitrage de Léane** reste ouvert : le nombre de sections (6 vs ≤ 4, § 3.1).
- ✅ **Franco de port — tranché le 2026-08-18 : abandonné.** `{franco}` n'avait aucune source dans
  `shipping-rates.ts`. Le bandeau des deux barres hautes porte « Livraison {frais} · expédié sous
  {délai} », les deux avec une SSOT (`SHIPPING_RATES`, `PREPARATION_BUSINESS_DAYS`). Ne pas le
  réintroduire sans que l'offre existe en base.
