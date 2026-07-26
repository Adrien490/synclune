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

- **TCO** : relever les factures (Vercel, Neon, Stripe, UploadThing) et recalculer le coût en % du CA (cf. `BUSINESS.md`).
- **Seuils fiscaux** : avec le comptable, vérifier le CA cumulé vs **85 000 €** (franchise biens) **et** vs **10 000 €** de ventes à distance **intra-UE** (seuil OSS — voir ci-dessous).
- Le bandeau dashboard de progression TVA (`get-vat-progress`) suit le seuil franchise national, **pas** le seuil OSS intra-UE.

## § OSS — Ventes à distance intra-UE (seuil 10 000 €)

- **État actuel** : l'app facture **0 TVA** sur toutes les ventes (franchise art. 293 B). Conforme tant que les ventes intra-UE annuelles restent **< 10 000 €**.
- **Aucune logique TVA-destination / OSS n'est codée.** Le suivi du cumul intra-UE est **manuel/comptable**.
- **Si le seuil 10 000 € approche** : engager le comptable → inscription OSS + application de la TVA du pays de destination. Côté code, ce sera un chantier dédié (table de taux par pays + calcul au checkout + déclaration OSS). Ne pas franchir le seuil sans l'avoir préparé.

## § Mention TVA — migration CGI → CIBS (échéance 31/12/2027)

- Mention actuelle sur les factures : « TVA non applicable, art. 293 B du CGI » (`DEFAULT_FRANCHISE_VAT_MENTION`).
- L'ordonnance 2025-1247 migre la référence vers l'**art. L.223-3 du CIBS** au 1ᵉʳ sept. 2026, avec **période de tolérance jusqu'au 31/12/2027** (les deux libellés restent valides d'ici là).
- **Action** (avant fin 2027) : basculer la mention via la variable d'env `VENDOR_VAT_EXEMPTION_TEXT` (override sans déploiement) ou mettre à jour `DEFAULT_FRANCHISE_VAT_MENTION`. **Non urgent.**

## § e-reporting DGFiP — go-live (obligation 1ᵉʳ sept. 2027)

- **État** : machinerie complète mais **désactivée** (`INVOICE_ENABLE_EREPORTING=false`), provider `local`/`mock`, aucun cron de transmission dans `vercel.json`. Un test verrouille cet état OFF (voir `modules/invoices/constants/__tests__`).
- **Go-live (cible T1 2027, ~6 mois avant l'échéance)** :
  1. Choisir + contractualiser une **Plateforme Agréée (PA)**.
  2. Implémenter le provider concret (`modules/invoices/providers/`).
  3. Réactiver les routes cron `build-/transmit-ereporting-batch` (services déjà présents, sans route).
  4. Passer la **cadence** de `DAILY` à `BIMONTHLY` (cf. `ereporting-period.ts`).
  5. Passer `INVOICE_ENABLE_EREPORTING=true` et valider en pré-prod.

## Cron RGPD critique — `hard-delete-retention` (mensuel)

- Purge les PII des commandes à `paidAt + 10 ans` (RGPD Art. 5.1.e). Un échec silencieux = PII conservée trop longtemps (risque CNIL).
- Périmètre : ligne `Order` (opérationnel + billing + snapshot/PDF + identifiants Stripe), **avoirs partiels `Refund`** (PDF + note libre), **`OrderNote.content`**, + commandes jamais payées à 3 ans. SSOT : `modules/orders/constants/pii-scrub.ts`.
- Une **alerte admin** est désormais émise en cas d'échec (audit §4.3). Vérifier mensuellement qu'aucune alerte n'est remontée ; sinon, relancer manuellement le cron.

### Demande d'effacement RGPD d'un client INVITÉ (procédure manuelle)

Le flux automatique (`process-account-deletions`) ne couvre que les comptes : une commande invitée (`userId` NULL) n'a pas de compte à supprimer. Si un invité exerce son droit d'effacement (Art. 17) avant l'échéance des 10 ans :

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

- **Ce que c'est** : l'action admin « Marquer comme payée » permet, sur une commande née d'un checkout Stripe (PaymentIntent obligatoire — EINV-CASH-001), d'attester un encaissement **hors PSP** (virement, chèque) quand le PI n'a pas abouti. L'attestation (`offStripeConfirmed`) et le statut réel du PI (`piStatus`) sont consignés dans `OrderHistory` ; le PI résiduel est annulé (anti double-paiement, ORD-BIZ-007) ; la facture est émise eagerly et l'e-reporting SALES enregistré comme sur le chemin webhook (EINV-CASH-005).
- **Usage attendu** : canal de **recovery exceptionnel** (paiement asynchrone jamais webhooké, client qui règle par virement après échec carte). Ce n'est PAS un canal de vente : un usage systématique reviendrait à un flux d'encaissement alternatif relevant de l'invariant CLAUDE.md #8 (« validation comptable préalable » — risque de qualification logiciel de caisse NF 525).
- **À faire valider par le comptable** (point ouvert) : confirmer que ce canal d'attestation virement/chèque adossé à un PaymentIntent est acceptable en l'état, et à quel volume il devient un flux à déclarer/outiller autrement. En attendant : usage au cas par cas uniquement, chaque utilisation étant auditée dans `OrderHistory`.
- **Contrôle périodique** (mensuel, avec les vérifs facturation) : compter les usages du mois — les entrées `OrderHistory` `action=PAID` dont `metadata.offStripeConfirmed=true`. Plus de quelques occurrences par mois ⇒ en parler au comptable avant de continuer.
