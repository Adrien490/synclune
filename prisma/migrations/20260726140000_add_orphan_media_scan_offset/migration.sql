-- Audit média M2 : curseur de reprise du cron `cleanup-orphan-media`.
--
-- Le cron liste les fichiers UploadThing par pages (MAX_PAGES_PER_RUN ×
-- UPLOADTHING_LIST_LIMIT = 2500 fichiers/run) mais repartait de l'offset 0 à
-- chaque exécution : au-delà de 2500 fichiers, la fin de la liste n'était JAMAIS
-- balayée. Les archives PDF de facture (une par commande payée) étant
-- référencées, elles saturent progressivement la fenêtre et la collecte
-- d'orphelins devenait un no-op silencieux (processed: 0, errors: 0).
--
-- L'offset est remis à 0 dès qu'une page incomplète signale la fin de liste.
ALTER TABLE "StoreSettings"
  ADD COLUMN "orphanMediaScanOffset" INTEGER NOT NULL DEFAULT 0;
