-- Retrait du modèle Dispute (audit « Admin commandes » 2026-08-01, P3).
--
-- Le code ne l'écrivait ni ne le lisait plus depuis la simplification V1 du
-- 2026-07-30 : l'état de litige dérive de l'audit trail OrderHistory
-- (`hasOpenDisputeTx`), et les handlers webhook n'écrivent plus la table.
-- La FK `Dispute_orderId_fkey` (ON DELETE RESTRICT) pouvait en outre bloquer
-- la purge 10 ans de `hard-delete-retention` sur d'anciennes lignes.
--
-- DROP TABLE emporte contraintes (CHECK, FK, PK) et index de la table.
DROP TABLE IF EXISTS "Dispute";
DROP TYPE IF EXISTS "DisputeStatus";
DROP TYPE IF EXISTS "DisputeReason";
