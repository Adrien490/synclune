-- Convergence de 4 index d'`Order` qui étaient définis DEUX FOIS, différemment.
--
-- Contexte (audit schéma 2026-07-30). Ces quatre noms existaient en double :
--   Order_invoiceRetryDeferred_idx
--   Order_piiPurgedAt_paidAt_idx
--   Order_unpaid_pii_purge_idx
--   Order_overbilling_unresolved_idx
-- déclarés comme `@@index(..., map: "...")` dans schema.prisma (donc créés COMPLETS
-- par le DDL Prisma), puis droppés et recréés en version PARTIELLE (`WHERE …`) par
-- l'annexe des gardes bruts. L'annexe passant en dernier, la base finissait avec les
-- versions partielles — mais `schema.prisma` décrivait autre chose que la réalité.
--
-- Le risque n'était pas la performance, c'était la dérive : toute migration future
-- générée par `prisma migrate diff` aurait recréé la version complète en silence,
-- effaçant le prédicat sélectif — la même classe de piège que « migrate diff ne génère
-- AUCUN garde brut ».
--
-- Direction retenue : le SCHÉMA dit vrai, les partiels disparaissent. À l'échelle de
-- Synclune (~20 commandes/mois, ≤ 2400 lignes `Order` sur 10 ans), la différence entre
-- un index partiel, un index complet et un seq scan n'est pas mesurable — le prédicat
-- sélectif était une optimisation théorique, la double définition un piège réel. Les
-- index partiels UNIQUES (Address/isDefault, ProductCollection/isFeatured,
-- ProductSku/isDefault, SkuMedia/isPrimary) RESTENT dans la SSOT : ceux-là sont des
-- contraintes d'intégrité inexprimables en Prisma, pas des optimisations.
--
-- Note sur un déploiement à neuf : `0_init` crée ces index complets, son annexe les
-- repasse en partiel (copie figée de la SSOT d'alors), puis cette migration les
-- ramène en complet. Redondant mais correct — le baseline n'est pas modifié, son
-- checksum reste valide sur les bases où il est déjà marqué appliqué.

DROP INDEX IF EXISTS "Order_invoiceRetryDeferred_idx";
CREATE INDEX "Order_invoiceRetryDeferred_idx" ON "Order"("invoiceRetryDeferred", "paidAt");

DROP INDEX IF EXISTS "Order_piiPurgedAt_paidAt_idx";
CREATE INDEX "Order_piiPurgedAt_paidAt_idx" ON "Order"("piiPurgedAt", "paidAt");

DROP INDEX IF EXISTS "Order_unpaid_pii_purge_idx";
CREATE INDEX "Order_unpaid_pii_purge_idx" ON "Order"("piiPurgedAt", "paidAt", "createdAt");

DROP INDEX IF EXISTS "Order_overbilling_unresolved_idx";
CREATE INDEX "Order_overbilling_unresolved_idx" ON "Order"("overbillingResolvedAt", "overbilledAmountCents");
