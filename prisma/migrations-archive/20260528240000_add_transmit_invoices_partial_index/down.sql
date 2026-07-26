-- Rollback : index partiel transmit-invoices (EINV-PRISMA-005)
DROP INDEX IF EXISTS "Order_transmit_pending_idx";
