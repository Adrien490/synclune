# Known issues

Constats reproduits et localisés, **volontairement non corrigés** : chacun demande une décision ou une conception qui dépasse le lot où il a été trouvé. Une entrée sort d'ici quand elle est corrigée (avec son test de régression) ou quand on décide de l'assumer définitivement — dans ce dernier cas, la déplacer dans `CLAUDE.md` comme parti pris.

Chaque entrée porte un commentaire `@see docs/KNOWN-ISSUES.md` au site exact du code, pour être trouvable depuis les deux bouts.

---

## KI-001 — ~~Une resoumission de checkout peut expédier à une adresse non corrigée~~ (CORRIGÉ le 2026-07-30)

> **Fermé** par l'audit checkout Stripe Elements du 2026-07-30, option 2 de la liste ci-dessous.
> `resolveIdempotentHit` répercute désormais la correction sur le snapshot via
> `modules/orders/services/update-pending-order-shipping-snapshot.service.ts`, sous quatre gardes :
> `paymentStatus === "PENDING"` re-lu **sous** l'advisory lock `orderPaid` (donc sérialisé avec la
> transition PAID du webhook), aucun champ de montant touché, et entrée `OrderHistory`
> `ADDRESS_UPDATED` obligatoire — avec `authorName: "Client"` et `changedFields` seuls, jamais de
> valeur d'adresse (la table survit à l'effacement RGPD).
>
> La surface de fraude qui motivait le report (« réécrire la destination d'une commande déjà
> autorisée ») supposait une commande autorisée : une commande PENDING n'est ni encaissée, ni
> facturée, ni numérotée — CLAUDE.md le dit déjà à propos de l'absence d'`OrderHistory` à la création.
> Verrouillé par `update-pending-order-shipping-snapshot.regression.test.ts` + l'allowlist de
> `order-address-snapshot-immutability.regression.test.ts`.
>
> Conservé ici comme trace du raisonnement : les options 1 et 3 restent les mauvaises réponses.

**Trouvé le** 2026-07-26 (audit UI/UX paiement, hors périmètre).
**Où** `modules/payments/actions/confirm-checkout.ts` → `resolveIdempotentHit`, calcul de `destinationDiverges`.
**Sévérité** moyenne — pas de perte financière, mais un colis peut partir à la mauvaise rue sans aucun signal.

`resolveIdempotentHit` refuse une resoumission dont les données divergent de la commande déjà liée au PaymentIntent. La comparaison de destination ne porte que sur **`country` et `postalCode`** :

```ts
const destinationDiverges =
	order.shippingCountry !== v.shippingAddress.country ||
	normalizePostalCode(order.shippingPostalCode) !==
		normalizePostalCode(v.shippingAddress.postalCode);
```

Donc une resoumission qui corrige `addressLine1`, `addressLine2` ou `city` — même code postal, même pays — est **acceptée**. La commande conserve son snapshot d'adresse figé (invariant 5, volontaire et correct sur le plan comptable), si bien que le client croit avoir corrigé son adresse alors que l'étiquette porte encore l'ancienne. Aucun log, aucune alerte, aucun signal côté client.

Le scénario réel : faute de frappe dans le numéro ou la rue → carte refusée pour une raison quelconque → l'utilisateur corrige la rue en réessayant → paiement accepté → colis expédié à l'adresse fautive.

**Pourquoi c'est différé.** Trois issues, toutes structurantes :

1. **Refuser aussi ces divergences** — cohérent avec l'invariant, mais transforme une faute de frappe en cul-de-sac total (le client ne peut plus rien corriger et doit passer par le support). Il faut d'abord un chemin de sortie.
2. **Mettre à jour le snapshot quand le montant est inchangé** — ce qui est ce que le client attend, mais ouvre une surface fraude (réécrire la destination d'une commande déjà autorisée) et touche un snapshot que l'invariant 5 déclare figé.
3. **Une action « abandonner cette commande »** explicite, qui annule le PI et repart propre. Sans doute la bonne réponse, mais c'est une conception à part entière (statuts, stock réservé, séquence de facture).

**En attendant**, l'Alert « Montant verrouillé » dit désormais la vérité — l'adresse ne peut plus changer, et il faut écrire au support — au lieu de promettre « Actualise la page si tu veux modifier ta livraison ». Voir `modules/payments/components/checkout-form-body.tsx`.

---

## KI-002 — Un invité perd tout son formulaire de checkout à chaque rechargement

**Trouvé le** 2026-07-26 (audit UI/UX paiement, hors périmètre).
**Où** `modules/payments/utils/checkout-form.utils.ts` (docblock) et `modules/payments/hooks/use-checkout-form.ts` (absence).
**Sévérité** faible en soi, **aggravante** pour tout le reste.

Le docblock de `getCheckoutFormOptions` affirme :

> localStorage draft is NOT read here to avoid hydration mismatch (server has no localStorage). Draft restoration happens in useCheckoutForm via useEffect.

`use-checkout-form.ts` ne contient **ni cet effet, ni aucun accès à `localStorage`**. La fonctionnalité n'existe pas ; seul son commentaire subsiste (corrigé le 2026-07-26 pour ne plus décrire du code absent).

Conséquence : un invité qui recharge `/paiement` — y compris via le bouton « Recharger la page » que l'on vient d'ajouter au verrou de montant, ou après un retour arrière — repart d'un formulaire vide. Un utilisateur connecté est partiellement sauvé par le préremplissage depuis son adresse par défaut ; un invité n'a rien.

**Pourquoi c'est différé.** Ce n'est pas un bug à réparer mais une fonctionnalité à concevoir, avec deux questions non triviales :

- **Quoi persister.** Une adresse de livraison complète en `localStorage` est de la donnée personnelle stockée sans expiration côté client : durée de vie, purge au succès de commande et mention RGPD à arbitrer.
- **Comment hydrater sans mismatch.** Le motif « champ vide au SSR puis rempli au montage » est précisément celui que le docblock actuel cherchait à éviter. Il demande soit un rendu client-only du bloc adresse, soit une hydratation en deux temps.

Alternative plus légère à évaluer d'abord : `sessionStorage` (portée onglet, purge automatique), qui couvre le cas « rechargement » — le seul qui compte ici — sans rétention longue.

---

## KI-003 — Rate limit : libellés encore vouvoyants

**Trouvé le** 2026-07-26 (audit UI/UX paiement, F7).
**Où** une vingtaine d'occurrences de « Trop de tentatives. Veuillez réessayer plus tard. » dans `modules/payments` et `modules/discounts` (le compte est passé de ~26 au retrait du système d'avis le 2026-07-30).
**Sévérité** cosmétique.

La convention de voix du repo est le tutoiement (cf. `CLAUDE.md` § Conventions). Le tunnel de paiement a été aligné et est verrouillé par `checkout-voice-tutoiement.regression.test.ts`, mais ces libellés-là sont partagés entre modules et chacun a un test qui assert la chaîne exacte. Les traiter un par un créerait une incohérence temporaire pire que l'état actuel : à faire en une passe transverse, avec un SSOT de messages de rate limit.

---

## KI-004 — ~~Rate limit : panier, favoris et codes promo partagent encore un seul compteur~~ · **CORRIGÉ le 2026-07-31**

**Trouvé le** 2026-07-30 (audit checkout Stripe Elements, F3).
**Corrigé le** 2026-07-31 (audit « Rate limiting »).
**Où** `shared/lib/rate-limit.ts` → `checkRateLimitInMemory`, construction de la clé.
**Sévérité réelle** — élevée, et non « moyenne » comme annoncé ici jusqu'au correctif : le défaut ne se limitait pas à un blocage croisé panier/favoris, il **verrouillait la connexion de l'administratrice** (voir ci-dessous).

`checkRateLimit` indexait son compteur sur le **seul** identifiant :

```ts
const key = `ratelimit:${identifier}`;
```

Ni le nom de l'action ni sa config n'entraient dans la clé. Formulation exacte du défaut : pour un identifiant donné, **la limite effective de chaque action était le MINIMUM des limites de toutes celles qui le partageaient**, et la fenêtre était celle de la première entrée créée.

**Ce que l'entrée initiale avait manqué — le verrouillage de la connexion.** `signInEmail` appelle `enforceRateLimitForCurrentUser(AUTH_LIMITS.LOGIN)` ; hors session, cela produit un `ip:<ip>` nu, partagé avec toutes les actions publiques. `AUTH_LOGIN` ayant la limite la plus basse du lot (5/15 min), n'importe quelles 5 requêtes publiques préalables l'épuisaient :

1. un visiteur consulte 5 fiches produit → `addRecentProduct` (`PRODUCT_COOKIE_ACTION`, 30/min) crée `ratelimit:ip:X` à `count: 5` ;
2. l'administratrice se connecte depuis cette IP → `count 5 >= limit 5` → 429 sur des identifiants pourtant valides.

Pire variante : une entrée créée par un passage sur `/mot-de-passe-oublie` (fenêtre **1 h**) gelait la connexion pour l'heure entière. Depuis le retrait de l'espace client (2026-07-31), c'est le seul compte capable d'administrer la boutique. `/api/csp-report` (20/min) aggravait le tableau : les rapports CSP sont émis **automatiquement par le navigateur**, donc le compteur pouvait être épuisé sans aucune action de l'utilisateur.

Le commentaire de `AUTH_LOGIN_LIMIT` a d'ailleurs contribué à masquer le défaut : il annonçait un identifiant composite `login:${email}:${ip}` qui n'a jamais existé.

**Correctif.** Le `name` du preset entre désormais dans la clé, dérivée côté bibliothèque :

```ts
const key = buildRateLimitKey(name, identifier); // ratelimit:<name>:<identifier>
```

`name` est un champ **requis** de `RateLimitConfig` : un preset qui l'oublierait retomberait en silence sur le compteur partagé, donc c'est `tsc` qui l'impose, pas une convention. Les 118 presets SSOT le portent (convention : identifiant du const sans `_LIMIT`, en kebab-case).

⚠️ **Aucun call site n'a changé.** L'estimation « ~35 call sites, chacun avec des tests assertant l'identifiant exact » mesurait l'autre approche — préfixer chez l'appelant. En mettant le nom dans l'objet de config (déjà passé en 2ᵉ argument par les 140 call sites), l'identifiant fourni par l'appelant reste nu : l'extraction automatique de l'IP depuis un `ip:…` et le masquage par segment dans les logs continuent de fonctionner inchangés. Seul `app/api/csp-report/route.ts`, unique porteur d'un littéral inline, a dû être touché.

**Ce qui reste volontairement partagé.** Deux appelants d'un **même** preset partagent toujours une entrée — et c'est correct : ils ont par construction les mêmes `limit`/`windowMs`, donc l'anomalie « la fenêtre appartient à la première entrée » est structurellement impossible entre eux. C'est le cas des 14 actions de commande admin (`ADMIN_ORDER_SINGLE_OPERATIONS`) et du couple facture/avoir (partage de budget explicitement voulu).

**`buildPaymentRateLimitId` est conservé tel quel**, et reste porteur : `PAYMENT_LIMITS.CREATE_SESSION` est partagé par `initializePayment` **et** `confirmCheckout`. Le nom de config seul les ferait re-collisionner, ré-introduisant le bug F3 — une visite sur `/paiement` brûlant le budget de l'encaissement. Le double préfixe qui en résulte (`ratelimit:checkout-create-session:checkout-init:user:x`) est redondant mais sûr.

**Verrouillé par** `shared/lib/__tests__/rate-limit-preset-naming.regression.test.ts` (nom présent, kebab-case, unique **entre références distinctes** — la déduplication par identité d'objet est indispensable, `WISHLIST_LIMITS.ADD/REMOVE/TOGGLE` étant le même objet) et par deux cas dédiés dans `rate-limit.test.ts` (isolation des compteurs, non-héritage de fenêtre).

## KI-005 — Le numéro d'avoir a deux SSOT : `Order.creditNote*` et `Refund.creditNote*`

**Trouvé le** 2026-07-30 (audit `schema.prisma`).
**Où** `prisma/schema.prisma` → `Order.creditNoteNumber` et `Refund.creditNoteNumber` ; séquence dans `modules/invoices/services/credit-note-sequence.service.ts`.
**Sévérité** faible en exploitation, élevée en maintenance — rien ne dysfonctionne, mais cinq mécanismes tiennent ensemble ce qu'une colonne unique rendrait trivial.

La séquence `A-YYYY-NNNNN` est **partagée** entre deux tables : `Order.creditNoteNumber` porte l'annulation totale d'une facture (`voidInvoice`, Art. 272-I CGI) et `Refund.creditNoteNumber` l'avoir partiel par remboursement (`issueCreditNoteForRefund`). Les contraintes `@unique` étant per-table, aucune ne voit un doublon entre les deux. La cohérence repose donc sur cinq garde-fous cumulés :

1. l'advisory lock `2_000_000 + year`, qui sérialise la génération par année ;
2. le lookup `MAX` sur l'**UNION** des deux colonnes ;
3. le trigger DB `check_credit_note_cross_table_unique` (filet contre une écriture SQL manuelle contournant le lock) ;
4. deux index `@unique` per-table ;
5. deux CHECK de format `^A-[0-9]{4}-[0-9]{5}$`.

Le schéma le documentait déjà comme « cible (ticket futur) : migrer full-void vers `Refund.creditNoteNumber` puis dropper ces colonnes `Order` ».

**Pourquoi c'est assumé, et non planifié.** La migration toucherait simultanément la numérotation séquentielle gap-free (Art. 286 CGI), le trigger d'unicité cross-table et l'archivage PDF des avoirs — soit le cœur réglementaire, à quelques semaines du lancement, pour un gain de propreté et zéro gain fonctionnel. Le rapport risque/bénéfice est défavorable : les cinq mécanismes sont en place, testés (dont un test d'intégration dédié au trigger) et n'ont produit aucun incident.

**À quelle condition rouvrir.** Si l'un de ces trois signaux apparaît : (a) un doublon de numéro d'avoir constaté en production ; (b) un troisième émetteur d'avoir devient nécessaire (à ce moment la duplication devient une triplication, et le lookup UNION une jointure à trois branches) ; (c) une refonte des remboursements touche déjà `issue-credit-note.service.ts` — auquel cas la migration devient un effet de bord peu coûteux plutôt qu'un chantier propre.

**Ne pas** ajouter d'écriture sur `Order.creditNote*` depuis un nouveau chemin de code : cela renforcerait la duplication au lieu de la contenir. Tout nouvel avoir passe par `Refund`.
