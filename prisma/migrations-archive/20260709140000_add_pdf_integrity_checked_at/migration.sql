-- Contrôle d'intégrité proactif des PDF archivés (Art. L102 B LPF).
-- Curseur de rotation consommé par la passe intégrité du cron reconcile-invoices :
-- re-hash périodique des artefacts UploadThing contre invoicePdfHash /
-- creditNotePdfHash. Sans lui, une altération d'un PDF jamais re-téléchargé
-- resterait indétectée jusqu'au premier download.
ALTER TABLE "Order" ADD COLUMN "pdfIntegrityCheckedAt" TIMESTAMP(3);
ALTER TABLE "Refund" ADD COLUMN "pdfIntegrityCheckedAt" TIMESTAMP(3);
