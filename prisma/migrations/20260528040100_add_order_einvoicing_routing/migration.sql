-- ============================================================================
-- Order : routing PDP (annuaire central facturation electronique 2026-2027)
-- ============================================================================
--
-- Identifiants emetteur (vendor) et destinataire (customer) pour transmission
-- via Plateforme de Dematerialisation Partenaire (PDP/PPF).
--
-- vendor* : identifiants de Synclune dans l'annuaire central — snapshote au
--           moment de l'emission pour garantir la tracabilite a 10 ans meme
--           si Synclune change de PDP.
-- customer* : identifiants du destinataire — snapshote au checkout (B2B/B2G).
--             publicEntityCode + serviceCode = obligatoires pour B2G via
--             Chorus Pro (code service de la collectivite destinataire).
--
-- Toutes les colonnes sont NULLABLE : pas de CHECK B2G/Chorus Pro pour
-- l'instant (a activer lors de l'arrivee du premier client B2G).
-- ============================================================================

ALTER TABLE "Order"
    ADD COLUMN "vendorEInvoicingPlatformId"   VARCHAR(100),
    ADD COLUMN "vendorEInvoicingAddress"      VARCHAR(255),
    ADD COLUMN "customerEInvoicingPlatformId" VARCHAR(100),
    ADD COLUMN "customerEInvoicingAddress"    VARCHAR(255),
    ADD COLUMN "customerPublicEntityCode"     VARCHAR(50),
    ADD COLUMN "customerServiceCode"          VARCHAR(100);
