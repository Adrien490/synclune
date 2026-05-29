-- ============================================================================
-- payloadHash e-reporting : empreinte SHA-256 canonical-JSON du payloadSnapshot
-- (audit-vérifiable, symétrie Order.invoiceDataHash). Art. L102 B LPF.
-- ============================================================================
--
-- Le `payloadSnapshot` fige ce qui sera transmis à la DGFiP et doit rester
-- restituable à l'identique 10 ans. On l'apparie à une empreinte SHA-256 du
-- snapshot sérialisé en canonical-JSON (clés triées), comme Order.invoiceDataHash,
-- pour détecter toute altération post-écriture.
--
-- Nullable : pas de backfill des transactions pré-migration (une vérif aval
-- traite NULL comme « legacy non vérifiable », cf. verify-invoice-snapshot.ts).
-- Pas de CHECK de cohérence snapshot⟺hash : `payloadSnapshot` est NOT NULL alors
-- que `payloadHash` doit rester NULL pour le legacy → on se limite au format hex.
-- ============================================================================

ALTER TABLE "EReportingTransaction" ADD COLUMN "payloadHash" VARCHAR(64);

ALTER TABLE "EReportingTransaction"
    ADD CONSTRAINT "EReportingTransaction_payloadHash_format_check"
    CHECK ("payloadHash" IS NULL OR "payloadHash" ~ '^[a-f0-9]{64}$');
