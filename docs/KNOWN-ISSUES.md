# Known issues

Constats reproduits et localisés, **volontairement non corrigés** : chacun demande une décision ou une conception qui dépasse le lot où il a été trouvé. Une entrée sort d'ici quand elle est corrigée (avec son test de régression) ou quand on décide de l'assumer définitivement — dans ce dernier cas, la déplacer dans `CLAUDE.md` comme parti pris.

Chaque entrée porte un commentaire `@see docs/KNOWN-ISSUES.md` au site exact du code, pour être trouvable depuis les deux bouts.

---

## KI-001 — Une resoumission de checkout peut expédier à une adresse non corrigée

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
**Où** ~26 occurrences de « Trop de tentatives. Veuillez réessayer plus tard. » dans `modules/payments`, `modules/discounts`, `modules/reviews`.
**Sévérité** cosmétique.

La convention de voix du repo est le tutoiement (cf. `CLAUDE.md` § Conventions). Le tunnel de paiement a été aligné et est verrouillé par `checkout-voice-tutoiement.regression.test.ts`, mais ces libellés-là sont partagés entre modules et chacun a un test qui assert la chaîne exacte. Les traiter un par un créerait une incohérence temporaire pire que l'état actuel : à faire en une passe transverse, avec un SSOT de messages de rate limit.
