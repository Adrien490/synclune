-- RGPD-AUDIT F-A : purge PII des commandes JAMAIS payées (paidAt IS NULL —
-- checkouts abandonnés/annulés/échoués). Ces commandes ne portent aucune facture
-- (l'exemption Art. 289 CGI / Art. 17(3)(b) RGPD ne s'applique pas), ne sont jamais
-- atteintes par la purge à 10 ans indexée sur paidAt, et ne sont jamais hard-deletées.
-- Sans cette purge leur PII (customer*/shipping*) serait conservée indéfiniment
-- (RGPD Art. 5.1.e — limitation de conservation).
--
-- Index partiel : le cron ne sélectionne que les commandes non payées, non encore
-- purgées, et l'ordonne par createdAt (fenêtre UNPAID_ORDER_PII_RETENTION_DAYS).
CREATE INDEX IF NOT EXISTS "Order_unpaid_pii_purge_idx"
    ON "Order" ("piiPurgedAt", "paidAt", "createdAt")
    WHERE "piiPurgedAt" IS NULL AND "paidAt" IS NULL;
