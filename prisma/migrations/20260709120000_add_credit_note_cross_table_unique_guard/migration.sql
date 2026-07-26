-- ============================================================================
-- Garde DB d'unicité CROSS-TABLE des numéros d'avoir (A-YYYY-NNNNN)
-- Audit numérotation gap-free 2026-07-09 — durcissement EINV-PRISMA-001
-- ============================================================================
--
-- La séquence avoir est PARTAGÉE entre Order.creditNoteNumber (full void via
-- voidInvoice) et Refund.creditNoteNumber (refund partiel via
-- issueCreditNoteForRefund). Les contraintes UNIQUE existantes sont PER-TABLE :
-- elles ne détectent pas un doublon entre les deux tables. L'unicité
-- cross-table repose côté applicatif sur l'advisory lock 2_000_000+year + le
-- lookup MAX sur l'UNION (credit-note-sequence.service.ts).
--
-- Ce trigger ajoute le filet DB manquant : toute écriture d'un
-- creditNoteNumber déjà présent dans L'AUTRE table est rejetée avec un
-- SQLSTATE 23505 (unique_violation → Prisma P2002, couvert par les boucles de
-- retry existantes). Il vise les écritures qui CONTOURNENT l'advisory lock
-- (intervention SQL manuelle, script de migration bugué) — les writers
-- applicatifs, sérialisés par le lock, ne le déclenchent jamais.
--
-- Limite assumée : sous READ COMMITTED, deux transactions concurrentes NON
-- verrouillées écrivant le même numéro dans les deux tables peuvent passer
-- toutes deux le trigger (lignes non commitées invisibles). Ce cas est exclu
-- pour les writers légitimes (advisory lock) et reste détecté a posteriori par
-- check-sequence-continuity (cron reconcile-invoices, duplicates cross-table).
-- ============================================================================

-- Pré-vol : la garde ne peut être posée que si aucun doublon cross-table
-- n'existe déjà (sinon l'état est déjà non conforme Art. 286 — à résoudre
-- manuellement avant de rejouer la migration).
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "Order" o
		JOIN "Refund" r ON r."creditNoteNumber" = o."creditNoteNumber"
		WHERE o."creditNoteNumber" IS NOT NULL
	) THEN
		RAISE EXCEPTION 'creditNoteNumber duplique entre Order et Refund — resoudre avant d''appliquer la garde cross-table';
	END IF;
END $$;

CREATE OR REPLACE FUNCTION check_credit_note_cross_table_unique()
RETURNS trigger AS $$
BEGIN
	IF NEW."creditNoteNumber" IS NULL THEN
		RETURN NEW;
	END IF;

	IF TG_TABLE_NAME = 'Order' THEN
		IF EXISTS (
			SELECT 1 FROM "Refund" WHERE "creditNoteNumber" = NEW."creditNoteNumber"
		) THEN
			RAISE EXCEPTION 'creditNoteNumber % deja attribue dans Refund (sequence A-YYYY partagee, Art. 286 CGI)',
				NEW."creditNoteNumber"
				USING ERRCODE = '23505', CONSTRAINT = 'CreditNote_cross_table_unique';
		END IF;
	ELSE
		IF EXISTS (
			SELECT 1 FROM "Order" WHERE "creditNoteNumber" = NEW."creditNoteNumber"
		) THEN
			RAISE EXCEPTION 'creditNoteNumber % deja attribue dans Order (sequence A-YYYY partagee, Art. 286 CGI)',
				NEW."creditNoteNumber"
				USING ERRCODE = '23505', CONSTRAINT = 'CreditNote_cross_table_unique';
		END IF;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Order_creditNoteNumber_cross_unique" ON "Order";
CREATE TRIGGER "Order_creditNoteNumber_cross_unique"
	BEFORE INSERT OR UPDATE OF "creditNoteNumber" ON "Order"
	FOR EACH ROW EXECUTE FUNCTION check_credit_note_cross_table_unique();

DROP TRIGGER IF EXISTS "Refund_creditNoteNumber_cross_unique" ON "Refund";
CREATE TRIGGER "Refund_creditNoteNumber_cross_unique"
	BEFORE INSERT OR UPDATE OF "creditNoteNumber" ON "Refund"
	FOR EACH ROW EXECUTE FUNCTION check_credit_note_cross_table_unique();
