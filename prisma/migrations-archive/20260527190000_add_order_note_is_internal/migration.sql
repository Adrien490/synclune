-- Add `isInternal` flag to OrderNote.
--
-- true  = note visible uniquement aux admins (fraude suspectee, blacklist,
--         escalade legale, motifs sensibles).
-- false = note potentiellement visible cote client si la UI /account/orders
--         expose les notes a l'avenir.
--
-- Default false : toutes les notes existantes restent publiques (comportement
-- historique). L'admin doit explicitement marquer une note `isInternal=true`
-- via le dialog "Ajouter une note" pour la rendre interne.

ALTER TABLE "OrderNote" ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- Index pour le filtrage `isInternal=false` cote `getOrderNotesForUser`.
-- Conserve aussi l'index existant `(orderId, createdAt DESC)` pour les
-- queries admin qui paginent par date.
CREATE INDEX "OrderNote_orderId_isInternal_idx" ON "OrderNote"("orderId", "isInternal");
