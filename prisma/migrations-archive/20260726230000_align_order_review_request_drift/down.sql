-- Rollback de 20260726230000_align_order_review_request_drift.
--
-- Re-crée la colonne pour permettre un retour arrière rapide si l'émetteur
-- « demande d'avis » devait être rebranché en urgence. Nullable sans défaut :
-- aucune ligne existante n'est touchée, et un NULL signifie « jamais sollicité »
-- (sémantique d'origine).

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "reviewRequestSentAt" TIMESTAMP(3);
