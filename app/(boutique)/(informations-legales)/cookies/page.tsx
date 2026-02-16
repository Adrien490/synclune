import { PageHeader } from "@/shared/components/page-header";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { CookiePreferences } from "./_components/cookie-preferences";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Gestion des cookies | Synclune",
	description:
		"Gérez vos préférences de cookies et consultez les informations sur les traceurs utilisés sur Synclune - Conformité RGPD",
	keywords: [
		"cookies",
		"traceurs",
		"préférences cookies",
		"RGPD",
		"consentement",
		"Synclune",
	],
	alternates: {
		canonical: "/cookies",
	},
	openGraph: {
		title: "Gestion des cookies - Synclune",
		description:
			"Gérez vos préférences de cookies et consultez les informations sur les traceurs utilisés",
		url: "https://synclune.fr/cookies",
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "Cookies | Synclune",
		description: "Gestion des cookies et préférences de traceurs - RGPD",
	},
};

/**
 * Page de gestion des cookies - Version serveur simplifiée avec cache
 *
 * Permet à l'utilisateur de :
 * - Consulter les cookies utilisés
 * - Modifier ses préférences (accepter/refuser)
 *
 * Utilise "use cache" car le contenu informatif est statique.
 * Le composant CookiePreferences (client) gère les préférences côté client.
 */
export default async function CookiesPage() {
  "use cache";
  cacheLife("reference"); // 24h stale, 30j expire - contenu légal change rarement
  cacheTag("legal-cookies");
  return (
    <>
      <PageHeader
        title="Gestion des cookies"
        description="Gérez vos préférences de cookies et consultez les informations sur les traceurs utilisés"
        breadcrumbs={[{ label: "Informations légales", href: "/informations-legales" }, { label: "Cookies", href: "/cookies" }]}
      />

      <section className={`bg-background ${SECTION_SPACING.default}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate dark:prose-invert max-w-prose space-y-8">
            {/* Introduction */}
            <section className="space-y-4">
              <p className="text-muted-foreground">
                Cette page vous permet de gérer vos préférences en matière de
                cookies. Vous pouvez modifier vos choix à tout moment.
              </p>
            </section>

            {/* Gestion des préférences - Composant client */}
            <section className="space-y-6 not-prose">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                Gérer mes préférences
              </h2>
              <CookiePreferences />
            </section>

            {/* Qu'est-ce qu'un cookie */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">
                Qu'est-ce qu'un cookie ?
              </h2>
              <p>
                Un cookie est un petit fichier texte déposé sur votre appareil
                lors de votre visite d'un site internet. Il permet au site de
                mémoriser des informations sur votre visite (panier,
                préférences, etc.).
              </p>
            </section>

            {/* Cookies utilisés */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">
                Quels cookies et stockages utilisons-nous ?
              </h2>

              <h3 className="text-lg sm:text-xl font-medium">
                Cookies techniques (toujours actifs)
              </h3>
              <p>
                Ces cookies sont essentiels au fonctionnement du site. Ils ne
                peuvent pas être désactivés.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>
                  <strong>cart_session</strong> : Identifiant de panier visiteur
                  - Créé{" "}
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    uniquement lors de l'ajout d'un produit au panier
                  </span>
                  . Durée : 7 jours (httpOnly, secure). Stocke uniquement un
                  identifiant pour retrouver votre panier en base de données.
                  Aucun contenu du panier n'est stocké dans ce cookie.
                </li>
                <li>
                  <strong>wishlist_session</strong> : Identifiant de wishlist
                  visiteur - Créé{" "}
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    uniquement lors de l'ajout d'un produit à votre wishlist
                  </span>
                  . Durée : 30 jours (httpOnly, secure, conforme RGPD).
                  Stocke uniquement un identifiant pour retrouver votre wishlist
                  en base de données. Aucun contenu de la wishlist n'est stocké
                  dans ce cookie.
                </li>
                <li>
                  <strong>better-auth.session_token</strong> : Jeton de session
                  utilisateur - Créé{" "}
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    uniquement lors de votre connexion ou inscription
                  </span>
                  . Durée : 7 jours (httpOnly, secure). Maintient votre
                  connexion active et sécurisée.
                </li>
                <li>
                  <strong>better-auth.session_data</strong> : Cache de session -
                  Créé{" "}
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    uniquement si vous êtes connecté
                  </span>
                  . Durée : 5 minutes (httpOnly, secure). Améliore les
                  performances en évitant de requêter la base de données à
                  chaque requête.
                </li>
              </ul>

              <h3 className="text-lg sm:text-xl font-medium mt-6">
                Stockage local (LocalStorage)
              </h3>
              <p>
                Certaines données sont stockées localement dans votre navigateur
                via LocalStorage. Ces données sont accessibles uniquement par
                notre site et restent sur votre appareil.
              </p>
              <p className="text-sm text-muted-foreground">
                Votre consentement est conservé pendant{" "}
                <strong>6 mois</strong>, conformément aux recommandations de la
                CNIL (durée maximale de 13 mois). Passé ce délai, votre choix
                vous sera à nouveau demandé.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>
                  <strong>cookie-consent</strong> : Vos préférences cookies (6
                  mois) - Mémorise vos choix concernant l'utilisation des
                  cookies optionnels.
                </li>
                <li>
                  <strong>theme</strong> : Préférence de thème (clair/sombre) -
                  Conserve votre choix de thème d'affichage entre vos visites.
                </li>
                <li>
                  <strong>checkout-form-draft</strong> : Brouillon de commande
                  (temporaire) - Sauvegarde automatiquement votre formulaire de
                  commande en cours pour éviter de perdre vos données en cas de
                  fermeture accidentelle du navigateur. Supprimé automatiquement
                  après validation ou abandon de la commande.
                </li>
                <li>
                  <strong>email-verification-cooldown</strong> : Protection
                  anti-spam (60 secondes) - Empêche l'envoi trop fréquent de
                  demandes de vérification d'email. Supprimé automatiquement
                  après le délai de sécurité.
                </li>
              </ul>

              <h3 className="text-lg sm:text-xl font-medium mt-6">
                Cookies et traceurs optionnels
              </h3>
              <p>
                Si vous acceptez les cookies optionnels, nous utilisons
                également :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>
                  <strong>Vercel Analytics</strong> : Statistiques anonymisées
                  de navigation - Collecte des données agrégées (pages vues,
                  temps de visite, origine géographique) pour améliorer
                  l'expérience utilisateur. Ces données sont anonymes et ne
                  permettent pas de vous identifier personnellement.
                </li>
              </ul>
            </section>

            {/* Comment supprimer les cookies */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">
                Comment supprimer les cookies de mon navigateur ?
              </h2>
              <p>
                Vous pouvez également supprimer manuellement les cookies depuis
                les paramètres de votre navigateur :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>
                  <strong>Chrome :</strong> Paramètres → Confidentialité et
                  sécurité → Cookies et autres données de sites
                </li>
                <li>
                  <strong>Firefox :</strong> Paramètres → Vie privée et sécurité
                  → Cookies et données de sites
                </li>
                <li>
                  <strong>Safari :</strong> Préférences → Confidentialité →
                  Gérer les données de sites web
                </li>
                <li>
                  <strong>Edge :</strong> Paramètres → Cookies et autorisations
                  de site → Cookies et données de site
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                ⚠️ Attention : supprimer les cookies peut affecter le
                fonctionnement de certains sites internet.
              </p>
            </section>

            {/* En savoir plus */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">En savoir plus</h2>
              <p>
                Pour plus d'informations sur la gestion de vos données
                personnelles, consultez notre{" "}
                <Link href="/confidentialite" className="underline">
                  Politique de Confidentialité
                </Link>
                .
              </p>
              <p>
                Pour en savoir plus sur les cookies et vos droits, consultez
                les{" "}
                <a
                  href="https://www.cnil.fr/fr/cookies-et-autres-traceurs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  recommandations de la CNIL sur les cookies et traceurs
                </a>
                .
              </p>
              <p>
                Pour toute question, contactez-nous à{" "}
                <a
                  href={`mailto:${process.env.RESEND_CONTACT_EMAIL || "contact@synclune.fr"}`}
                  className="underline"
                >
                  {process.env.RESEND_CONTACT_EMAIL || "contact@synclune.fr"}
                </a>
                .
              </p>
            </section>

            <p className="text-xs text-muted-foreground text-center pt-8 italic">
              Dernière mise à jour : 13 février 2026
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
