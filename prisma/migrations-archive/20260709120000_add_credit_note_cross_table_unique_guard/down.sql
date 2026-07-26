-- Rollback de la garde cross-table d'unicité des numéros d'avoir.
-- Sans la garde, l'unicité cross-table repose de nouveau uniquement sur
-- l'advisory lock applicatif + le lookup UNION (credit-note-sequence.service.ts)
-- et la détection a posteriori de check-sequence-continuity.
DROP TRIGGER IF EXISTS "Order_creditNoteNumber_cross_unique" ON "Order";
DROP TRIGGER IF EXISTS "Refund_creditNoteNumber_cross_unique" ON "Refund";
DROP FUNCTION IF EXISTS check_credit_note_cross_table_unique();
