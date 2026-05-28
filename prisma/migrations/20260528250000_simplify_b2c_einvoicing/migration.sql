-- ============================================================================
-- Simplification facturation électronique — recentrage B2C franchise TVA
-- ============================================================================
--
-- Synclune est une micro-entreprise en franchise de TVA (Art. 293 B CGI)
-- vendant exclusivement en B2C. La stack transmission B2B/B2G (PDP), l'annuaire
-- DGFiP, le XML structuré (Factur-X/UBL/CII) et la TVA par ligne n'ont jamais
-- été activés (feature flags OFF, LocalPdfProvider no-op) et ne le seront pas.
--
-- Cette migration DROP toute cette infrastructure spéculative. Ce qui reste est
-- la chaîne légale obligatoire : numérotation séquentielle, archivage PDF
-- immuable + hash, avoirs, audit trail OrderHistory, identité vendeur, mention
-- franchise, et l'e-reporting B2C agrégé (EReportingTransaction/Batch — vraie
-- obligation Sept 2027).
--
-- CONSERVÉ : Order.customerType + enum CustomerType (discriminant e-reporting),
-- Order_customerType_paidAt_idx, identité vendeur (vendor* hors routing).
-- Les valeurs OrderAction PDP_* deviennent inertes (DROP VALUE non supporté par
-- Postgres — coût > gain ; aucune row ne les utilise après ce DROP).
--
-- Rollback : voir down.sql (recréation à l'identique).
-- ============================================================================

-- 1. Tables transmission/webhook PDP -----------------------------------------
DROP TABLE IF EXISTS "ProviderWebhookEvent";
DROP TABLE IF EXISTS "InvoiceTransmissionLog";

-- 2. Enums transmission (plus aucune colonne ne les référence) ---------------
DROP TYPE IF EXISTS "ProviderWebhookEventStatus";
DROP TYPE IF EXISTS "TransmissionLogStatus";
DROP TYPE IF EXISTS "TransmissionDirection";

-- 3. Order — index PDP / XML / transmission ----------------------------------
DROP INDEX IF EXISTS "Order_transmit_pending_idx";
DROP INDEX IF EXISTS "Order_pdpStatus_pdpTransmittedAt_idx";
DROP INDEX IF EXISTS "Order_pdpStatus_pdpLastRetryAt_idx";
DROP INDEX IF EXISTS "Order_pdpStatus_invoiceGeneratedAt_idx";
DROP INDEX IF EXISTS "Order_invoiceXmlArchivedAt_idx";

-- 4. Order — CHECK constraints supprimées ------------------------------------
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_pdpRetryCount_non_negative";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceXmlHash_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceXmlFormat_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_customerCompanyVatNumber_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_customerCompanySiret_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_customerCompanySiren_format_check";

-- 5. Order — colonnes supprimées (company / routing / PDP / XML) -------------
ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "invoiceXmlArchivedAt",
    DROP COLUMN IF EXISTS "invoiceXmlFormat",
    DROP COLUMN IF EXISTS "invoiceXmlHash",
    DROP COLUMN IF EXISTS "invoiceXmlUrl",
    DROP COLUMN IF EXISTS "pdpLastRetryAt",
    DROP COLUMN IF EXISTS "pdpRetryCount",
    DROP COLUMN IF EXISTS "pdpRejectionCode",
    DROP COLUMN IF EXISTS "pdpProviderName",
    DROP COLUMN IF EXISTS "pdpProviderRef",
    DROP COLUMN IF EXISTS "pdpRejectionReason",
    DROP COLUMN IF EXISTS "pdpRejectedAt",
    DROP COLUMN IF EXISTS "pdpAcceptedAt",
    DROP COLUMN IF EXISTS "pdpTransmittedAt",
    DROP COLUMN IF EXISTS "pdpStatus",
    DROP COLUMN IF EXISTS "vendorEInvoicingAddress",
    DROP COLUMN IF EXISTS "vendorEInvoicingPlatformId",
    DROP COLUMN IF EXISTS "customerServiceCode",
    DROP COLUMN IF EXISTS "customerPublicEntityCode",
    DROP COLUMN IF EXISTS "customerEInvoicingAddress",
    DROP COLUMN IF EXISTS "customerEInvoicingPlatformId",
    DROP COLUMN IF EXISTS "customerCompanyVatNumber",
    DROP COLUMN IF EXISTS "customerCompanySiret",
    DROP COLUMN IF EXISTS "customerCompanySiren",
    DROP COLUMN IF EXISTS "customerCompanyName";

-- 6. Enum PdpTransmissionStatus (plus aucune colonne ne le référence) --------
DROP TYPE IF EXISTS "PdpTransmissionStatus";

-- 7. OrderItem — TVA par ligne + identifiants douaniers ----------------------
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_unitCode_check";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_hsCode_check";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_taxCategoryCode_check";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_lineTotalIncludingTax_non_negative";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_lineTotalExcludingTax_non_negative";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_taxAmount_non_negative";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_taxRate_non_negative";
ALTER TABLE "OrderItem"
    DROP COLUMN IF EXISTS "unitCode",
    DROP COLUMN IF EXISTS "hsCode",
    DROP COLUMN IF EXISTS "taxCategoryCode",
    DROP COLUMN IF EXISTS "lineTotalIncludingTax",
    DROP COLUMN IF EXISTS "lineTotalExcludingTax",
    DROP COLUMN IF EXISTS "taxAmount",
    DROP COLUMN IF EXISTS "taxRate";

-- 8. User — champs société + cache annuaire DGFiP + customerType -------------
DROP INDEX IF EXISTS "User_customerType_deletedAt_idx";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_directoryLastCheckedSiretSnapshot_format";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_companyVatNumber_format_check";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_companySiret_format_check";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_companySiren_format_check";
ALTER TABLE "User"
    DROP COLUMN IF EXISTS "directoryLastCheckedSiretSnapshot",
    DROP COLUMN IF EXISTS "directoryLastCheckedAt",
    DROP COLUMN IF EXISTS "customerEInvoicingAddress",
    DROP COLUMN IF EXISTS "customerEInvoicingPlatformId",
    DROP COLUMN IF EXISTS "companyVatNumber",
    DROP COLUMN IF EXISTS "companySiret",
    DROP COLUMN IF EXISTS "companySiren",
    DROP COLUMN IF EXISTS "companyName",
    DROP COLUMN IF EXISTS "customerType";
