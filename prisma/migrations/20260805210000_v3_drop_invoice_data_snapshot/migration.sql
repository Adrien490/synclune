-- Le PDF archivé devient la SEULE pièce probante de la facture (2026-08-05).
--
-- La conformité reposait sur DEUX preuves du même document : le PDF archivé sur
-- UploadThing (+ son SHA-256 dans `invoicePdfHash`) ET `invoiceDataSnapshot`, le
-- JSON canonicalisé des données de facture, figé sous son propre SHA-256. Chacune
-- avec sa machinerie : canonicalisation à clés triées, versionnement de format,
-- vérification d'intégrité à la lecture, backfill des factures pré-snapshot.
--
-- On garde celle qui EST le document au sens de l'Art. L102 B LPF — le PDF.
--
-- ⚠️ CE QUE ÇA DÉPLACE, et qui doit être tenu ailleurs :
--
-- 1. L'IDENTITÉ VENDEUR n'est plus figée en base. `Order.vendor*` (12 colonnes)
--    avait été droppé le 2026-08-05 en s'appuyant explicitement sur ce snapshot
--    (« condition de réouverture » de l'invariant 10 de CLAUDE.md). Elle ne
--    survit désormais que DANS LE PDF ARCHIVÉ. Donc :
--      - le PDF archivé fait foi, toujours ;
--      - une régénération est un DÉPANNAGE qui porte l'identité vendeur COURANTE,
--        et ne doit jamais être présentée comme l'original ;
--      - l'archivage cesse d'être un confort. `reconcile-invoices` (seul cron
--        monitoré Sentry) reprend toute facture numérotée sans `invoicePdfUrl`,
--        via un prédicat DÉRIVÉ de l'état plutôt qu'un drapeau.
--
-- 2. La GARDE DE COHÉRENCE COMPTABLE est conservée, et elle compte davantage :
--    `persistInvoiceNumber` continue d'exécuter `invoiceDataSchema.safeParse`
--    (somme des lignes == totaux) avant d'émettre le numéro. Le document n'est
--    plus figé en base, mais il l'est dans le PDF, dont le hash est scellé dix
--    ans — une facture incohérente serait donc archivée fausse. Mieux vaut une
--    facture différée qu'une facture fausse (Art. 289 CGI).
--
-- 3. `invoiceVoidedAt` part aussi : `void-invoice.service.ts` lui écrivait la
--    MÊME valeur, dans le MÊME `update`, que `creditNoteGeneratedAt`. La date
--    d'annulation est celle de l'avoir qui la porte (Art. 272-I).
--
-- 4. `OrderItem.productDescription` / `skuSku` : ils n'alimentaient que
--    `InvoiceData.lines[].productDescription` / `.skuCode`, qu'aucun rendu ne
--    dessine (`render-invoice-pdf.ts` ne trace que `productTitle` et
--    `variantInfo`). Sans snapshot, plus aucun consommateur.
--
-- ⚠️ CONSERVÉS, et ce n'est pas une hésitation : `invoicePdfHash` /
-- `creditNotePdfHash` sont re-vérifiés à CHAQUE téléchargement contre l'artefact
-- réellement servi (EINV-PDF-006) — c'est la détection d'une copie UploadThing
-- corrompue, une garde vivante par requête, pas de la comptabilité de cron.

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceDataSnapshot_hash_coherence_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceDataHash_format_check";

ALTER TABLE "Order" DROP COLUMN "invoiceDataSnapshot";
ALTER TABLE "Order" DROP COLUMN "invoiceDataHash";
ALTER TABLE "Order" DROP COLUMN "invoiceVoidedAt";

ALTER TABLE "OrderItem" DROP COLUMN "productDescription";
ALTER TABLE "OrderItem" DROP COLUMN "skuSku";
