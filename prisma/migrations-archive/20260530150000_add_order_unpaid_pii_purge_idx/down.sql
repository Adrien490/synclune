-- Rollback RGPD-AUDIT F-A : retrait de l'index de purge PII des commandes non payées.
DROP INDEX IF EXISTS "Order_unpaid_pii_purge_idx";
