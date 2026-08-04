-- Retrait de la barre d'annonce storefront (2026-08-04).
--
-- Le bandeau promotionnel au-dessus de la navbar (message + lien + fenêtre de
-- diffusion + tonalité) est supprimé de l'application : composant storefront,
-- Server Action de masquage (cookie `announcement_dismissed_<hash>`), formulaire
-- admin et sa page `/admin/contenu/annonces` — laquelle était l'unique carte de
-- la section « Contenu », désormais supprimée elle aussi.
--
-- Les 6 colonnes n'ont plus AUCUN lecteur ni writer applicatif : elles tombent.
-- Aucune valeur légale ni comptable (contenu marketing éphémère, sans lien avec
-- Order ni facture), donc pas de rétention à préserver — contrairement aux
-- snapshots de commande, elles ne sont pas couvertes par L102 B LPF.

-- DropColumn
ALTER TABLE "StoreSettings" DROP COLUMN IF EXISTS "announcementMessage";
ALTER TABLE "StoreSettings" DROP COLUMN IF EXISTS "announcementLink";
ALTER TABLE "StoreSettings" DROP COLUMN IF EXISTS "announcementStartsAt";
ALTER TABLE "StoreSettings" DROP COLUMN IF EXISTS "announcementEndsAt";
ALTER TABLE "StoreSettings" DROP COLUMN IF EXISTS "announcementIsActive";
ALTER TABLE "StoreSettings" DROP COLUMN IF EXISTS "announcementVariant";

-- DropEnum (plus aucune colonne ne le référence après les DROP ci-dessus)
DROP TYPE IF EXISTS "AnnouncementVariant";
