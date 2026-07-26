-- Irréversible PAR CONCEPTION : les valeurs d'adresse retirées des metadata
-- ADDRESS_UPDATED étaient précisément la PII à détruire (RGPD Art. 5.1.e) —
-- aucune restauration possible ni souhaitable. En cas de rollback applicatif,
-- ce down est un no-op sûr : le nouveau format (changedFields) reste lisible
-- par l'ancien code (metadata est un Json libre, jamais parsé structurellement).
SELECT 1;
