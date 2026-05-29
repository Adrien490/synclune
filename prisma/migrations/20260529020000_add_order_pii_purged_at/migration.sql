-- Purge PII à 10 ans (RGPD Art. 5.1.e — limitation de conservation).
-- La commande n'est jamais supprimée (Art. L123-22), mais la base légale de
-- conservation de la PII facture (Art. 289 CGI / exemption Art. 17(3)(b) RGPD)
-- expire à paidAt + 10 ans. Le cron hard-delete-retention scrubbe alors les
-- snapshots PII et supprime les PDF, en posant ce timestamp pour éviter le
-- retraitement.
ALTER TABLE "Order"
    ADD COLUMN IF NOT EXISTS "piiPurgedAt" TIMESTAMP(3);

-- Index partiel : le cron ne sélectionne que les commandes non encore purgées.
CREATE INDEX IF NOT EXISTS "Order_piiPurgedAt_paidAt_idx"
    ON "Order" ("piiPurgedAt", "paidAt")
    WHERE "piiPurgedAt" IS NULL;
