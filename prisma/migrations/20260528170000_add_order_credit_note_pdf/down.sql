-- Rollback : drop credit-note PDF archival columns.
-- Données perdues : URL UploadThing + SHA-256 du PDF avoir. Les PDFs eux-mêmes
-- restent sur UploadThing (orphans), à purger manuellement si rollback définitif.
ALTER TABLE "Order"
  DROP COLUMN "creditNotePdfHash",
  DROP COLUMN "creditNotePdfUrl";
