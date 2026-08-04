# Changelog — **non tenu**

> **Ce fichier n'est plus maintenu depuis le 2026-07-26.** Il a été arrêté délibérément, pas oublié :
> Synclune est opéré par une seule personne, sans release publique ni consommateur externe de
> versions. Un `[Unreleased]` tenu à moitié affirmait encore, en juillet, « 24 modules, 11 templates
> email, 10 cron jobs, 9 stores Zustand » — quatre chiffres faux présentés comme un réalignement
> doc ↔ code. Une doc fausse coûte plus cher qu'une doc absente.

**Où trouver l'information à la place :**

| Question                                       | Source                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Qu'est-ce qui a changé, et quand ?             | `git log` — l'historique fait foi (Conventional Commits, cf. `CONTRIBUTING.md`)           |
| Pourquoi telle surface a-t-elle disparu ?      | [`docs/SIMPLIFICATION.md`](docs/SIMPLIFICATION.md) — lots de retrait, avec les arbitrages |
| Quel périmètre est assumé, et pourquoi ?       | [`docs/BUSINESS.md`](docs/BUSINESS.md) — modèle d'activité, coûts, choix de périmètre     |
| Comment le système est-il censé se comporter ? | [`CLAUDE.md`](CLAUDE.md) — architecture, invariants, patterns                             |
| Quels défauts sont connus et assumés ?         | [`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md)                                            |
| Comment exploiter la boutique au quotidien ?   | [`docs/RUNBOOK.md`](docs/RUNBOOK.md)                                                      |

---

## Note conservée — retrait de l'e-reporting DGFiP (2026-07-26)

La seule entrée de l'ancien changelog qui documentait un fait non repris ailleurs. Conservée telle
quelle, avec son motif.

Suppression des modèles `EReportingTransaction` / `EReportingBatch` / `EReportingPeriod`, des enums
`EReportingTransactionType` / `EReportingStatus`, des colonnes DLQ `Order.ereportingRetryDeferred` /
`Refund.ereportingRetryDeferred`, des hooks SALES/REFUND sur le hot path paiement/remboursement, des
passes SALES/5/6 de `reconcile-invoices`, du dossier `modules/invoices/providers/` (qui ne servait
qu'à l'e-reporting), du module de feature flags facturation et de la page admin
`/admin/ventes/facturation/batches`. Migration `20260726190000_drop_ereporting` (+ `down.sql`),
commit de retrait sur la branche `chore/remove-ereporting`.

**Motif** : ~7 200 lignes en dry-run intégral (flag jamais activé, aucune Plateforme Agréée
branchée) écrites contre une spec non figée, pour une obligation au 1ᵉʳ sept. 2027 — à réécrire
contre l'arrêté définitif. Les obligations **actuelles** (numérotation gap-free, PDF immuable,
avoirs, rétention 10 ans) sont intactes.

**Reconstruction** : cible T1 2027, procédure dans
[`docs/RUNBOOK.md` § e-reporting DGFiP](docs/RUNBOOK.md).
