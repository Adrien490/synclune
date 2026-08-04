-- Audit du module `orders` (2026-08-05) — dégraissage de la couche de rattrapage.
--
-- Trois mécanismes de surveillance qui se surveillaient surtout eux-mêmes. Rien
-- ici ne touche à une garantie légale : ce qui part, ce sont les COMPTEURS et les
-- CURSEURS, jamais les preuves ni les alertes.
--
--
-- 1. `Order.pdfIntegrityCheckedAt` + `Refund.pdfIntegrityCheckedAt`
--
-- Curseurs de rotation de la passe 8 de `reconcile-invoices`, qui re-téléchargeait
-- et re-hashait chaque PDF archivé tous les ~30 jours pour détecter une corruption
-- UploadThing. Écrivain et lecteur vivaient dans le même fichier
-- (`verify-pdf-archive-integrity.service.ts`, 368 lignes, supprimé) : aucune
-- surface admin ne les a jamais lus.
--
-- ⚠️ CE QUI GARANTIT L'ART. L102 B N'A PAS BOUGÉ. La preuve d'intégrité, c'est le
-- SHA-256 stocké dans `invoicePdfHash` / `creditNotePdfHash` — CONSERVÉS — et il
-- est re-vérifié à CHAQUE téléchargement par les routes facture/avoir
-- (EINV-PDF-006). La passe ne faisait qu'avancer la détection, sur ~240 documents
-- par an, entre deux téléchargements que personne ne surveille.
--
--
-- 2. `Order.overbillingResolvedAt`
--
-- Posé quand les remboursements couvraient un trop-perçu, dans un seul but :
-- éteindre le compteur « N commande(s) sur-facturée(s) » du dashboard. Son unique
-- writer était une passe de `reconcile-refunds`, elle-même déclenchée par un
-- BOUTON de maintenance — sans clic, le compteur restait allumé indéfiniment. Et
-- son lien menait à `/admin/ventes/commandes` NON filtré : il ne disait pas quelle
-- commande était concernée.
--
-- ⚠️ `overbilledAmountCents` est CONSERVÉ, et ce n'est pas une hésitation : il est
-- lu par la garde anti-sur-remboursement de `refund-handlers.ts`, qui borne le
-- remboursement à `order.total + overbilled`. Le retirer ferait remonter une
-- alerte Sentry sur un remboursement pourtant légitime. La détection, l'alerte
-- Sentry et surtout l'E-MAIL d'alerte admin restent en place : c'est lui qui
-- prévient Léane, pas le compteur.
--
--
-- 3. `Order.invoiceReconcileAttempts` (+ son CHECK)
--
-- Compteur d'escalade de la DLQ facture : au 3ᵉ échec, e-mail à l'admin. Deux
-- constats l'ont condamné. D'abord `flagInvoiceFailureForReconcile` alerte DÉJÀ à
-- J+0, au moment de l'échec (`sendAdminInvoiceFailedAlert` + audit
-- `INVOICE_GENERATION_FAILED`) : le compteur ne faisait que retarder de trois
-- jours une information déjà transmise. Ensuite, au-delà du seuil il ré-alertait à
-- CHAQUE run — il ne dédoublonnait donc rien, il ne tolérait que deux échecs
-- transitoires.
--
-- ⚠️ `invoiceRetryDeferred` est CONSERVÉ : c'est lui le prédicat d'appartenance à
-- la file, celui qui fait rejouer la commande la nuit suivante et qui garde
-- l'anomalie visible dans l'écran Facturation. Réduction assumée : plus d'e-mail
-- de RAPPEL les jours suivants. Le distinguo « échec » vs « rien à faire » n'est
-- pas perdu pour autant — il est passé dans le type de retour
-- (`ReconcileOutcome.kind = "failed"`), pour que le bouton « Relancer » ne réponde
-- plus « commande déjà saine » après un échec.

-- 1. Curseurs de la passe d'intégrité PDF
ALTER TABLE "Order" DROP COLUMN "pdfIntegrityCheckedAt";
ALTER TABLE "Refund" DROP COLUMN "pdfIntegrityCheckedAt";

-- 2. Résolution de sur-facturation (le MONTANT reste)
ALTER TABLE "Order" DROP COLUMN "overbillingResolvedAt";

-- 3. Compteur d'escalade de la DLQ facture
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceReconcileAttempts_check";
ALTER TABLE "Order" DROP COLUMN "invoiceReconcileAttempts";
