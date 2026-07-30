-- Rollback : retire l'unicité insensible à la casse et le CHECK de normalisation.
--
-- Les emails déjà minusculés par le UPDATE de la migration ne sont PAS restaurés dans
-- leur casse d'origine — cette information n'est pas conservée, et la restaurer serait
-- de toute façon indésirable (c'est le défaut que la migration corrige).
--
-- ⚠️ Après ce rollback, le garde de compte révoqué de `/sign-in/email` redevient
-- contournable par la casse si une ligne non normalisée réapparaît. Ne l'exécuter que
-- pour débloquer un incident (ex. collision de casse bloquant un déploiement), et
-- rejouer la migration une fois les doublons arbitrés.

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_lowercase";
DROP INDEX IF EXISTS "User_email_lower_key";
