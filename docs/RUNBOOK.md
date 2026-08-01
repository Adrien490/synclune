# RUNBOOK.md — Opérations courantes (solo)

> Procédures manuelles pour piloter Synclune à ~20 commandes/mois sans sur-instrumentation. Complète `docs/BUSINESS.md`.

## Quotidien / à chaque connexion admin

1. **Dashboard « À traiter »** (`/admin`) — widget qui remplace les anciens crons d'alerte (audit §4.2). Surface en lecture seule :
   - litiges Stripe approchant leur deadline (`NEEDS_RESPONSE`, dueBy < 2 j) ;
   - commandes sur-facturées non résolues (`overbilledAmountCents` non nul, non résolu) ;
   - commandes bloquées : `PROCESSING` > 7 j, `SHIPPED` sans livraison > 14 j, facture manquante > 7 j, paiement `PENDING` orphelin > 14 j.
     → Agir directement depuis la commande concernée (les anciens e-mails d'alerte quotidiens ont été retirés).
2. **Commandes payées à préparer** : expédier, saisir le suivi.

## Hebdomadaire

- **Revue de stock** : Admin → Catalogue → filtrer les SKU à faible inventaire → réapprovisionner. (Pas d'alerte automatique : manuel à ce volume.)
- Coup d'œil au **dashboard Vercel** (logs/erreurs) et à **Sentry** (erreurs paiement/webhook). Sentry reste l'outil d'alerte temps-réel — vérifier qu'aucune capture critique (webhook échoué, divergence de hash facture) n'est apparue.

## Mensuel / trimestriel

- **TCO** : relever les factures (Vercel, Neon, Stripe, UploadThing) et recalculer le coût en % du CA (cf. `BUSINESS.md`). Attendu ≈ 40–52 €/mois, soit ~5 % du CA à 20 commandes/mois.
- **Quotas** : trois jauges à regarder, dont deux peuvent **couper le service**.
  - **Neon → compute-hours** : cible < 40 % de l'allocation. Au-delà de 100 %, la base est suspendue jusqu'au mois suivant = boutique KO. Si ça dérive sans hausse de trafic, chercher un cron trop fréquent (cf. § ci-dessous).
  - **Resend → envois du jour** : le marketing est plafonné à 40/jour dans le code ; si le total quotidien approche 100, c'est le transactionnel qui va sauter.
  - **Vercel → transformations d'images** : une hausse sans nouveau produit au catalogue signale un abus de `/_next/image` (cf. § ci-dessous).
- **Seuils fiscaux** : avec le comptable, vérifier le CA cumulé vs **85 000 €** (franchise biens) **et** vs **10 000 €** de ventes à distance **intra-UE** (seuil OSS — voir ci-dessous).
- Le bandeau dashboard de progression TVA (`get-vat-progress`) suit le seuil franchise national, **pas** le seuil OSS intra-UE.
- La carte affiche **deux** paliers, parce que les conséquences diffèrent : franchir le seuil **de base** (85 000 €) laisse la franchise acquise jusqu'au 31 décembre — c'est un signal à transmettre au comptable, pas une action du mois ; franchir le seuil **majoré** (93 500 €, dérivé × 1,1) rend la TVA due **dès le 1ᵉʳ jour du mois de dépassement**. Le CA de référence est celui de l'année civile en cours, **brut de remboursements** (choix conservateur : il ne peut qu'alerter trop tôt).

## § OSS — Ventes à distance intra-UE (seuil 10 000 €)

- **État actuel** : l'app facture **0 TVA** sur toutes les ventes (franchise art. 293 B). Conforme tant que les ventes intra-UE annuelles restent **< 10 000 €**.
- **Aucune logique TVA-destination / OSS n'est codée**, et plus aucune constante ne prétend le contraire : l'échafaudage (`EU_OSS_*`, `GetEuOssProgressReturn`, cache tag `EU_OSS_PROGRESS`) a été retiré à l'audit franchise TVA 2026-07-27 — il n'avait aucun consommateur alors que son JSDoc affirmait « on l'affiche au dashboard ». Le suivi du cumul intra-UE est **manuel/comptable**.
- **Si le seuil 10 000 € approche** : engager le comptable → inscription OSS + application de la TVA du pays de destination. Côté code, ce sera un chantier dédié (table de taux par pays + calcul au checkout + déclaration OSS). Ne pas franchir le seuil sans l'avoir préparé.

## § Mention TVA — migration CGI → CIBS (échéance 31/12/2027)

- Mention actuelle sur les factures : « TVA non applicable, art. 293 B du CGI » (`DEFAULT_FRANCHISE_VAT_MENTION`).
- L'ordonnance 2025-1247 migre la référence vers l'**art. L.223-3 du CIBS** au 1ᵉʳ sept. 2026, avec **période de tolérance jusqu'au 31/12/2027** (les deux libellés restent valides d'ici là).
- **Action** (avant fin 2027) : mettre à jour `DEFAULT_FRANCHISE_VAT_MENTION` (`shared/constants/vat-franchise.ts`). Toutes les surfaces en dérivent désormais — PDF de facture, PDF d'avoir, récapitulatif de paiement, CGV, mentions légales, pied d'email — et le test `@regression vat-mention-ssot` interdit toute copie littérale qui échapperait à la bascule. Jusqu'à l'audit franchise TVA 2026-07-27, quatre de ces surfaces portaient la chaîne en dur et l'email avait déjà dérivé (« article » au lieu de « art. »).
- L'env `VENDOR_VAT_EXEMPTION_TEXT` **override le PDF uniquement** (elle alimente `getVendorLegalInfo`) : utile pour un correctif d'urgence sans déploiement, mais elle ne suffit pas pour la bascule CIBS — la constante reste le chemin normal.
- ⚠️ Changer le libellé casse la parité bit-à-bit des **avoirs déjà archivés** (ils n'ont pas de snapshot de données et re-dérivent le vendeur à chaque rendu). La Passe 8 de `reconcile-invoices` le détectera et alertera plutôt que de réécrire un hash. Les **factures** ne sont pas concernées : leur `invoiceDataSnapshot` est figé.

## § Si la franchise était perdue un jour — ce qu'il faudrait toucher

Checklist consolidée (aujourd'hui dispersée en commentaires). Rien de tout ceci n'est amorcé : c'est un chantier, pas un interrupteur.

- **Régime** : `VENDOR_VAT_REGIME=NORMAL`. Les factures antérieures gardent `FRANCHISE_BASE` figé sur `Order.vendorVatRegime` et donc leur mention 293 B — c'est voulu.
- **TVA par ligne** : réintroduire `OrderItem.taxRate` / `taxCategoryCode` (colonnes supprimées par `20260528250000_simplify_b2c_einvoicing`) et les câbler dans **les deux** chemins, facture **et** avoir (`build-invoice-data.ts`, `build-credit-note-data.ts` — un seul des deux laisserait les avoirs à 0).
- **Contrainte DB** : le CHECK `Order_total_formula` exclut `taxAmount` du total. Toute formule incluant la TVA exige une migration (+ `down.sql`).
- **Export comptable** : `export-orders-csv.service.ts` n'a ni colonne TVA ni distinction HT/TTC — headers, `ExportableOrder` et le `select` à reprendre ensemble.
- **Suivi de seuil** : `get-vat-progress` agrège `Order.total`, exact tant que HT = TTC. Sous TVA, il faudrait basculer sur une base HT — au moment précis où le chiffre compte le plus.

## § e-reporting DGFiP — à construire pour le 1ᵉʳ sept. 2027

- **État : RETIRÉ du code le 2026-07-26** (right-sizing). Une implémentation complète existait —
  modèles `EReportingTransaction`/`Batch`/`Period`, hooks SALES/REFUND sur le hot path, DLQ,
  batching, contrôle de continuité, dashboard admin — mais elle tournait en **dry-run intégral**
  (flag jamais activé, aucune Plateforme Agréée branchée) et était écrite contre une **spec non
  figée** (arrêté à paraître). La maintenir 18 mois pour la réécrire au go-live n'avait pas de sens
  à ce volume d'activité.
- **Où la retrouver** : commit de retrait sur la branche `chore/remove-ereporting`
  (migration `20260726190000_drop_ereporting` + son `down.sql`). Utile comme point de départ, pas
  comme base à restaurer telle quelle.
- **Go-live (cible T1 2027, ~6 mois avant l'échéance)** :
  1. Choisir + contractualiser une **Plateforme Agréée (PA)** — c'est elle qui fixe le format réel.
  2. Récupérer l'**arrêté définitif** (catégories d'opération, ventilation TVA, cadence).
  3. Réimplémenter contre cette spec : modèle de transaction, agrégation périodique, transmission.
  4. Cadence attendue : **bimestrielle contenant le détail journalier** — surtout pas un dépôt par
     jour (l'ancienne implémentation avait ce défaut par prudence).
- **Prérequis distinct, plus proche** : la **réception** des factures fournisseurs est obligatoire
  au **1ᵉʳ sept. 2026** — c'est une démarche back-office (s'inscrire auprès d'une PA), sans code.

## § Compte admin compromis — révoquer les sessions

Il n'y a qu'un compte, et il administre toute la boutique. Deux chemins, dans cet ordre.

**1. Depuis l'application (cas nominal)** — `/admin/configuration/securite` → « Déconnecter tous
mes appareils ». Ferme toutes les sessions, y compris la vôtre, et vous renvoie sur `/connexion`.

**2. Si l'accès à l'application est déjà perdu** (mot de passe changé par l'attaquant, par
exemple) — en base, et **les deux requêtes**, pas une seule :

```sql
UPDATE "User" SET "suspendedAt" = now() WHERE email = '<email>';
DELETE FROM "Session" WHERE "userId" = (SELECT id FROM "User" WHERE email = '<email>');
```

⚠️ **La suspension seule ne coupe rien tout de suite.** Tant que le cookie-cache Better Auth est
valide, `getSession()` répond depuis le cookie signé **sans lire la base** : le plugin
`customSession`, celui qui dégrade le rôle à `USER` pour un compte révoqué, ne s'exécute même pas.
La latence est bornée par `AUTH_SESSION_CONFIG.cookieCache.maxAge` — **60 s** (`modules/auth/lib/auth-env.ts`).
Le `DELETE` des sessions ne raccourcit pas ce délai non plus ; il empêche la reprise _après_.

Pour rendre l'accès ensuite : remettre `suspendedAt` à NULL, et réinitialiser le mot de passe via
`/mot-de-passe-oublie` (la vérification d'email est conservée précisément pour ce cas).

⚠️ Ne pas relever `cookieCache.maxAge` « pour économiser des requêtes » : c'est cette valeur, et
elle seule, qui fixe la latence de révocation de toute l'application.

## Cron RGPD critique — `hard-delete-retention` (mensuel)

- Purge les PII des commandes à `paidAt + 10 ans` (RGPD Art. 5.1.e). Un échec silencieux = PII conservée trop longtemps (risque CNIL).
- Périmètre : ligne `Order` (opérationnel + billing + snapshot/PDF + identifiants Stripe), **avoirs partiels `Refund`** (PDF + note libre), **`OrderNote.content`**, + commandes jamais payées à 3 ans. SSOT : `modules/orders/constants/pii-scrub.ts`.
- Une **alerte admin** est désormais émise en cas d'échec (audit §4.3). Vérifier mensuellement qu'aucune alerte n'est remontée ; sinon, relancer manuellement le cron.

### Demande d'effacement RGPD d'un client (procédure manuelle — SEUL chemin)

⚠️ **Il n'y a plus aucun flux automatique.** Le cron `process-account-deletions` a été supprimé avec l'espace client (2026-07-31) : sans compte client, il n'y avait plus de demande de suppression à traiter. Cette procédure manuelle, qui ne couvrait auparavant que les achats invités, s'applique donc désormais à **tous** les clients — ils sont tous invités.

Conséquence pratique : une demande d'effacement arrive par **email** (adresse de contact publiée dans `/confidentialite`, qui renvoie tous les droits RGPD vers ce canal) et se traite à la main. Le délai légal de réponse est de 30 jours ; rien ne le rappelle automatiquement, donc **traiter la demande à réception**.

Si un client exerce son droit d'effacement (Art. 17) avant l'échéance des 10 ans :

1. Identifier ses commandes par email : `Order.customerEmail`.
2. **Vérifier que tout avoir émis est archivé** (EINV-CREDIT-020) : `Order.creditNoteNumber`/`Refund.creditNoteNumber` non NULL ⇒ `creditNotePdfUrl` doit être non NULL. Sinon, relancer le cron `reconcile-invoices` (Passes 3b/7 archivent les avoirs manquants) AVANT le scrub — un avoir matérialisé après scrub perdrait l'identité client (Art. 289 CGI).
3. Scrubber manuellement les surfaces **opérationnelles uniquement** (`customer*`, `shipping*`, `stripeCustomerId`) — reprendre les valeurs de `CUSTOMER_SHIPPING_PII_SCRUB` (`modules/orders/constants/pii-scrub.ts`).
4. NE PAS toucher `billing*`, `invoiceDataSnapshot`, PDF facture/avoir, `stripePaymentIntentId` : exemption Art. 17(3)(b) RGPD (obligation Art. 289 CGI), purgés automatiquement à `paidAt + 10 ans`.
5. Répondre au client en citant l'exemption pour la partie facture (délai légal de conservation).

## § Intégrité PDF archivés (Art. L102 B LPF)

- **Contrôles en place** : (a) hash SHA-256 re-vérifié à **chaque téléchargement** (routes facture/avoir, EINV-PDF-006) ; (b) passe **proactive** quotidienne (`reconcile-invoices` Passe 8, `verify-pdf-archive-integrity.service.ts`) — re-hash de chaque artefact archivé tous les ~30 j (curseur `pdfIntegrityCheckedAt`).
- **Auto-réparation** : si la copie UploadThing diverge du hash DB mais que la régénération (snapshot facture / SSOT rendu avoir) est **bit-identique** au hash, le fichier est ré-uploadé et l'URL remplacée — le hash DB n'est **jamais** réécrit.
- **Alerte `reconcile-invoices:pdf-integrity`** (email admin + Sentry `pdf-archive-integrity-mismatch`) : corruption NON réparable — la régénération diverge du hash d'origine (drift de template jsPDF, données mutées). Intervention manuelle : identifier la version du template à la date d'émission (`invoiceGeneratedAt` + historique git de `render-invoice-pdf.ts`), reconstituer le document, et documenter l'incident (l'écart de hash doit être explicable en contrôle).
- L'alerte se ré-émet chaque jour tant que l'artefact n'est pas traité (le curseur n'avance pas sur échec).

## § Numérotation — chronologie en rattrapage tardif (note contrôle fiscal)

Le millésime `F-YYYY` suit **la date d'encaissement** (`paidAt`, Europe/Paris — EINV-SEQ-002), mais le rang `NNNNN` est attribué à la **génération**. En fonctionnement nominal (émission eager au webhook), les deux coïncident. En rattrapage DLQ prolongé (webhook + cron en échec plusieurs jours), une vente ancienne peut recevoir un numéro postérieur à des ventes plus récentes : la séquence reste **strictement croissante dans l'ordre d'émission** (conforme Art. 242 nonies A — « séquence chronologique continue » par série) et `invoiceGeneratedAt` reste cohérent avec le numéro. Point à expliquer en contrôle, pas une anomalie. Même logique pour l'avoir : il réutilise les colonnes `vendor*` figées à l'émission de la **facture d'origine** (rattachement Art. 272-I), pas celles du jour du void.

## § Encaissement hors Stripe — `mark-as-paid` avec attestation (EINV-CASH-002)

- **Ce que c'est** : l'action admin « Marquer comme payée » permet, sur une commande née d'un checkout Stripe (PaymentIntent obligatoire — EINV-CASH-001), d'attester un encaissement **hors PSP** (virement, chèque) quand le PI n'a pas abouti. L'attestation (`offStripeConfirmed`) et le statut réel du PI (`piStatus`) sont consignés dans `OrderHistory` ; le PI résiduel est annulé (anti double-paiement, ORD-BIZ-007) ; la facture est émise eagerly comme sur le chemin webhook (EINV-CASH-005).
- **Usage attendu** : canal de **recovery exceptionnel** (paiement asynchrone jamais webhooké, client qui règle par virement après échec carte). Ce n'est PAS un canal de vente : un usage systématique reviendrait à un flux d'encaissement alternatif relevant de l'invariant CLAUDE.md #8 (« validation comptable préalable » — risque de qualification logiciel de caisse NF 525).
- **À faire valider par le comptable** (point ouvert) : confirmer que ce canal d'attestation virement/chèque adossé à un PaymentIntent est acceptable en l'état, et à quel volume il devient un flux à déclarer/outiller autrement. En attendant : usage au cas par cas uniquement, chaque utilisation étant auditée dans `OrderHistory`.
- **Contrôle périodique** (mensuel, avec les vérifs facturation) : compter les usages du mois — les entrées `OrderHistory` `action=PAID` dont `metadata.offStripeConfirmed=true`. Plus de quelques occurrences par mois ⇒ en parler au comptable avant de continuer.
- ⚠️ **Compter aussi `metadata.piStatus='unavailable'`** (audit invariant #8, 2026-07-31). Si l'API Stripe est injoignable au moment du marquage, `mark-as-paid` **fail-open** : le statut du PI n'est pas vérifiable, l'attestation n'est donc pas exigée, et `offStripeConfirmed` est **absent** de l'audit — ces marquages échapperaient au comptage ci-dessus. Le fail-open est délibéré (un outage Stripe ne doit pas bloquer une recovery légitime) et sans risque pour l'invariant #8, le PaymentIntent restant obligatoire ; mais ces entrées sont, par construction, les moins documentées. Requête de contrôle :

  ```sql
  SELECT "createdAt", "orderId", metadata->>'piStatus' AS pi_status,
         metadata->>'offStripeConfirmed' AS attested
  FROM "OrderHistory"
  WHERE action = 'PAID' AND source = 'ADMIN'
    AND "createdAt" >= date_trunc('month', now()) - interval '1 month'
  ORDER BY "createdAt" DESC;
  ```

  Toute ligne avec `pi_status = 'succeeded'` est un rattrapage bénin (le webhook a été doublé). Les autres méritent une justification écrite.

## § Coûts & quotas — que faire quand une jauge dérive

> Issu de l'audit « Coûts, quotas & limites fournisseurs » (2026-07-26). Bornes de coût et tests qui les verrouillent : `BUSINESS.md § Postes qui grossissent tout seuls`.

### Prérequis — le seul coupe-circuit réel

**Vercel → Settings → Spend Management** : définir un plafond de dépense avec **pause automatique du projet**. Sans lui, aucune borne dans le code n'empêche une facture à quatre chiffres : le rate limiting est en mémoire par instance (assumé), et `/_next/image` n'y est même pas soumis. Avec lui, le pire cas devient « site en pause » au lieu de « facture surprise ». À vérifier après chaque changement de plan Vercel.

### Les transformations d'images explosent

Symptôme : le compteur Vercel grimpe sans nouveau produit au catalogue.

1. Vérifier que `images.remotePatterns` (`next.config.ts`) ne contient **aucun wildcard** — `pnpm vitest run shared/constants/__tests__/image-remote-patterns.regression.test.ts`. `*.ufs.sh` est multi-tenant : le wildcard laisse n'importe quel compte UploadThing faire transformer ses fichiers aux frais de Synclune, sans rate limit (`/_next/image` est exclu du matcher de `proxy.ts`).
2. Vérifier qu'aucun palier de qualité n'a été rajouté (2 attendus) : chaque palier multiplie la surface facturable par image source.
3. Si l'abus est en cours : baisser le plafond Spend Management, puis retirer temporairement l'hôte visé de `remotePatterns`.

Surface actuelle : 15 largeurs × 2 qualités × 2 formats = **60 transformations max par image source**, re-facturées ~12×/an (`minimumCacheTTL` = 31 j).

### Le compute Neon dérive

Symptôme : consommation qui monte sans hausse de trafic.

La cause quasi certaine est un cron plus fréquent que l'autosuspend Neon (5 min) : la base ne se rendort alors jamais. `pnpm vitest run modules/cron/constants` échoue si une cadence passe sous 30 min ou si les réveils cessent d'être alignés. Cadence saine ≈ 2 réveils/heure (:00 et :30), soit ~16 % de l'allocation Free.

Ne pas ajouter de cron pour une tâche quotidienne : l'ajouter en **passe** de `cleanup-pending-orders`, qui en porte déjà trois.

### Le quota e-mail journalier est atteint

Symptôme : 429 Resend, e-mails de confirmation manquants.

Il n'existe plus aucun émetteur marketing (retrait 2026-07-30, avec `MARKETING_DAILY_EMAIL_BUDGET` et la file « retour en stock ») : les 100 envois/jour du plan Free sont entièrement disponibles pour le transactionnel. Si le plafond est quand même atteint :

1. Vérifier qu'aucun émetteur marketing n'a été réintroduit sans re-créer le triptyque budget partagé + `List-Unsubscribe` + opt-out persisté (cf. `CLAUDE.md` § Emails).
2. Si le volume transactionnel légitime dépasse durablement 100/jour, c'est le signal de passer au plan Resend payant.

### Les minutes CI s'épuisent

La CI tourne ~31 min par run sur 7 jobs, avec annulation automatique des runs superposés (`concurrency`). Si le quota se consomme trop vite : regrouper les pushes (chaque push relance tout), ou passer `e2e` en `workflow_dispatch` + exécution sur `main` uniquement.

⚠️ Le job `e2e` cible `secrets.E2E_DATABASE_URL` avec repli sur `secrets.DATABASE_URL`. **Créer le secret `E2E_DATABASE_URL`** pointant vers un projet Neon dédié : tant qu'il n'existe pas, la CI `seed` (donc écrase) la base de production et consomme ses compute-hours.
