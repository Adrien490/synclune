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

## KI-004 — Rate limit : panier, favoris et codes promo partagent encore un seul compteur

**Trouvé le** 2026-07-30 (audit checkout Stripe Elements, F3).
**Où** `shared/lib/rate-limit.ts` → `checkRateLimitInMemory`, construction de la clé.
**Sévérité** moyenne — plus aucun effet sur le paiement (corrigé), mais un blocage croisé reste possible entre panier, favoris et codes promo.

`checkRateLimit` indexe son compteur sur le **seul** identifiant :

```ts
const key = `ratelimit:${identifier}`;
```

Ni le nom de l'action ni sa config n'entrent dans la clé. Deux actions qui passent le même identifiant partagent donc littéralement un compteur — et la **fenêtre appartient à l'entrée**, pas à l'appelant : c'est la première requête de la fenêtre qui fixe `resetAt`, les suivantes héritent de cette échéance quelle que soit leur propre `windowMs`.

Restent sur un identifiant nu (`user:<id>` / `session:<id>` / `ip:<ip>`), donc sur un compteur commun :

- toutes les actions panier — `modules/cart/lib/cart-rate-limit.ts`
- toutes les actions favoris — `modules/wishlist/actions/*.ts`
- `validateDiscountCode` — `modules/discounts/actions/validate-discount-code.ts`

Conséquence concrète : 15 ajouts au panier consomment le budget des favoris et celui de la validation de code promo, avec la fenêtre de celui qui a créé l'entrée. Un client peut donc se voir refuser un code promo pour avoir manipulé son panier.

**Ce qui a été corrigé** : les 4 actions de paiement passent par `modules/payments/utils/payment-rate-limit-id.ts`, qui préfixe l'identifiant par l'action (`checkout-init:`, `checkout-confirm:`, `update-amount:`, `cancel-orphan:`). C'était le cas grave : une visite sur `/paiement` plantait une fenêtre d'1 h que 15 opérations quelconques épuisaient, après quoi le bouton « Commander et payer » répondait « Trop de tentatives » pour le reste de l'heure — sur une commande au montant déjà verrouillé. Verrouillé par `payment-rate-limit-id.regression.test.ts`.

**Pourquoi le reste est différé.** Le correctif de fond est de rendre le nom d'action **obligatoire** dans `checkRateLimit` et de dériver la clé côté bibliothèque, plutôt que de laisser chaque appelant préfixer à la main. Ça touche ~35 call sites (cart, wishlist, admin, auth, uploads), et chacun a des tests qui assertent l'identifiant exact — donc une passe transverse à part, pas un effet de bord d'un lot checkout. Attention en la faisant : le préfixe casse deux comportements implicites de `rate-limit.ts` — l'extraction automatique de l'IP depuis un identifiant `ip:…` (dont dépendent whitelist/blacklist et plafond global, à compenser en passant l'IP en 3ᵉ argument) et le masquage `startsWith("user:")` dans les logs (généralisé le 2026-07-30 en masquage par segment, qui couvre au passage l'email invité qui partait en clair).

---

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
