-- Retrait de l'espace client (2026-07-31)
--
-- La boutique n'a plus de compte client : l'inscription est fermée
-- (`emailAndPassword.disableSignUp`), il n'y a plus de provider OAuth, et
-- `/connexion` n'ouvre plus que `/admin`. Le panier, les favoris, le checkout et
-- le suivi de commande fonctionnent tous en invité (cookie de session pour les
-- deux premiers, token HMAC pour le dernier).
--
-- Cette migration retire les colonnes et la table devenues INERTES — celles dont
-- plus aucun chemin applicatif ne lit ni n'écrit la valeur.
--
-- ⚠️ CE QUI EST DÉLIBÉRÉMENT CONSERVÉ (et pourquoi) :
--
--   * `Order.userId`, `Cart.userId`, `Wishlist.userId`, `DiscountUsage.userId`
--     L'administratrice reste un `User` à part entière et peut passer commande,
--     remplir un panier ou utiliser un code promo : ces colonnes ne sont donc pas
--     mortes, seulement rares. `Order.userId` porte de surcroît le rattachement
--     HISTORIQUE des commandes déjà encaissées, lu par `isInvoiceOwnerErased()`
--     (révocation du token de facture après effacement RGPD) — le dropper
--     détruirait une information du dossier comptable.
--
--   * `AccountStatus` + `User.accountStatus`
--     C'est la surface de révocation du compte admin, re-vérifiée en base par
--     `requireAdmin*()` / `isVerifiedAdmin()` à chaque chemin de privilège. La
--     retirer ferait reposer ces gardes sur `deletedAt`/`suspendedAt` seuls.
--
--   * `Session`, `Account`, `Verification`
--     Better Auth en dépend pour la connexion admin elle-même : le hash du mot de
--     passe vit dans `Account` (`providerId = 'credential'`), et `Verification`
--     porte les tokens de réinitialisation.

-- ============================================================================
-- 1. Table `Address` — carnet d'adresses client
-- ============================================================================
-- Le carnet d'adresses a été retiré du code au lot précédent. Aucune FK
-- `Order -> Address` n'a jamais existé (invariant #5 : les adresses de commande
-- sont des SNAPSHOTS figés au checkout, copiés champ à champ), donc supprimer
-- cette table ne touche aucune commande, passée ou future.
--
-- L'autocomplétion d'adresse du checkout (BAN / Geoapify) survit : elle appelle
-- une API externe et n'a jamais rien persisté.
--
-- Le DROP TABLE emporte avec lui l'index `Address_userId_isDefault_idx` et le
-- garde brut `Address_userId_isDefault_unique` (index unique partiel, retiré de
-- la SSOT `prisma/sql/raw-guards.sql` dans le même commit).
DROP TABLE IF EXISTS "Address";

-- ============================================================================
-- 2. Colonnes de consentement RGPD sur `User`
-- ============================================================================
-- `termsAcceptedAt` / `termsVersion` étaient posés à l'inscription email et par
-- le bandeau d'acceptation des comptes OAuth (accountability Art. 7 RGPD :
-- prouver QUELLE version des CGV a été acceptée). Les deux chemins d'écriture ont
-- disparu avec l'inscription, et les deux seuls lecteurs — la bannière
-- `AcceptTermsBanner` et l'action `acceptTerms` — avec l'espace client.
--
-- Conséquence assumée : le consentement d'un client n'est plus tracé par compte,
-- puisqu'il n'y a plus de compte. Il l'est à la commande, par l'acceptation des
-- CGV du checkout — la seule relation contractuelle qui subsiste.
ALTER TABLE "User" DROP COLUMN IF EXISTS "termsAcceptedAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "termsVersion";

-- `marketingOptOutAt` (opposition marketing, Art. 21 RGPD) était orphelin AVANT
-- ce chantier : son unique consommateur était le filtre du mail « retour en
-- stock », retiré le 2026-07-30, et l'endpoint `/notifications/desinscription`
-- qui le posait avait disparu avec lui. Plus aucun émetteur marketing n'existe.
ALTER TABLE "User" DROP COLUMN IF EXISTS "marketingOptOutAt";

-- ============================================================================
-- 3. Colonnes d'anonymisation RGPD sur `User`
-- ============================================================================
-- `deletionRequestedAt` était posé par la demande de suppression de compte
-- (`/parametres`) et consommé par le cron `process-account-deletions` ;
-- `anonymizedAt` marquait le scrub effectif. Les trois surfaces sont supprimées.
--
-- ⚠️ La rétention légale n'est PAS affectée. Elle ne portait pas sur ces colonnes
-- mais sur la commande : `hard-delete-retention` purge la PII à
-- `Order.paidAt + 10 ans` (marqueur `Order.piiPurgedAt`, périmètre figé par
-- `modules/orders/constants/pii-scrub.ts`), et l'identité de facturation reste
-- conservée jusque-là au titre de l'exemption Art. 17(3)(b) RGPD /
-- Art. 289 CGI / L102 B LPF. Ce cron est intact.
ALTER TABLE "User" DROP COLUMN IF EXISTS "anonymizedAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "deletionRequestedAt";

-- ============================================================================
-- 4. Index de scan du cron supprimé
-- ============================================================================
-- Cet index servait exclusivement la requête de `process-account-deletions`
-- (comptes en `PENDING_DELETION` dont le délai est échu). Il devient invalide de
-- toute façon : `deletionRequestedAt` n'existe plus.
DROP INDEX IF EXISTS "User_accountStatus_deletionRequestedAt_idx";
