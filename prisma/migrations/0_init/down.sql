-- Rollback de 0_init (baseline).
--
-- Un baseline ne « s'annule » pas : il décrit l'état complet de la base. Le seul
-- rollback cohérent est donc la destruction du schéma public — utile uniquement
-- pour repartir de zéro sur un environnement JETABLE (CI, DB de test locale).
--
-- ⚠️ NE JAMAIS exécuter sur la production. La commande ci-dessous supprime
-- toutes les tables, tous les types, toutes les données — y compris les factures
-- et l'audit trail dont la conservation est légalement obligatoire pendant 10 ans
-- (Art. L123-22 Code de Commerce, Art. L102 B LPF). Pour la prod, le chemin de
-- retour arrière est un restore Neon PITR, pas ce fichier.

DROP SCHEMA IF EXISTS "public" CASCADE;
CREATE SCHEMA "public";
