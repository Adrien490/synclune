import { PageHeader } from "@/shared/components/page-header";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Politique de Confidentialité | Synclune",
	description:
		"Politique de confidentialité et protection des données personnelles de Synclune - Transparence RGPD et respect de votre vie privée",
	keywords: [
		"politique de confidentialité",
		"RGPD",
		"protection des données",
		"vie privée",
		"données personnelles",
		"Synclune",
	],
	alternates: {
		canonical: "/confidentialite",
	},
	openGraph: {
		title: "Politique de Confidentialité - Synclune",
		description:
			"Politique de confidentialité et protection des données personnelles conformément au RGPD",
		url: "https://synclune.fr/confidentialite",
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "Confidentialité | Synclune",
		description: "Politique de confidentialité et protection des données - RGPD",
	},
};

export default async function PrivacyPolicyPage() {
  "use cache";
  cacheLife("reference"); // 24h stale, 30j expire - contenu légal change rarement
  cacheTag("legal-privacy");

  return (
    <>
      <PageHeader
        title="Politique de Confidentialité"
        description="Protection des données personnelles et respect de votre vie privée conformément au RGPD"
        breadcrumbs={[{ label: "Confidentialité", href: "/confidentialite" }]}
      />

      <section className={`bg-background ${SECTION_SPACING.default}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate dark:prose-invert max-w-prose space-y-6">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Introduction</h2>
              <p>
                La présente Politique de Confidentialité décrit comment{" "}
                <strong>Synclune</strong> collecte, utilise et protège vos
                données personnelles conformément au Règlement Général sur la
                Protection des Données (RGPD).
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                2. Responsable du traitement
              </h2>
              <p>
                <strong>Synclune</strong>
                <br />
                Email :{" "}
                <a
                  href={`mailto:${process.env.RESEND_CONTACT_EMAIL || "contact@synclune.fr"}`}
                  className="underline"
                >
                  {process.env.RESEND_CONTACT_EMAIL || "contact@synclune.fr"}
                </a>
              </p>
              <p className="mt-3">
                <strong>Délégué à la Protection des Données (DPO) :</strong>
                Conformément à l'article 37 du RGPD, Synclune n'est pas tenue de
                désigner un DPO car nous sommes une micro-entreprise artisanale
                ne traitant pas de données sensibles à grande échelle. Pour
                toute question relative à la protection de vos données, vous
                pouvez contacter directement le responsable du traitement via
                l'email ci-dessus.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Données collectées</h2>
              <h3 className="text-xl font-medium">
                3.1 Lors de la création d'un compte
              </h3>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Nom et prénom</li>
                <li>Adresse email</li>
                <li>Mot de passe (haché et sécurisé)</li>
              </ul>

              <h3 className="text-xl font-medium">3.2 Lors d'une commande</h3>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Adresse de livraison (nom, adresse postale, téléphone)</li>
                <li>Historique de commandes</li>
                <li>
                  Informations de paiement (via Stripe - voir section 3.4)
                </li>
              </ul>

              <h3 className="text-xl font-medium">
                3.3 Navigation sur le site
              </h3>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Cookies techniques (panier, session)</li>
                <li>Adresse IP</li>
                <li>Données de navigation (pages visitées, durée)</li>
              </ul>

              <h3 className="text-xl font-medium">3.4 Paiement</h3>
              <p>
                <strong>
                  Aucune donnée bancaire n'est stockée sur nos serveurs.
                </strong>{" "}
                Le paiement est entièrement géré par notre prestataire{" "}
                <strong>Stripe</strong>, certifié PCI-DSS niveau 1.
              </p>

              <h3 className="text-xl font-medium">3.5 Newsletter</h3>
              <p>
                Lors de votre inscription à notre newsletter avec validation par
                double opt-in, nous collectons :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Adresse email</li>
                <li>Adresse IP (traçabilité du consentement RGPD)</li>
                <li>
                  User-Agent du navigateur (traçabilité du consentement RGPD)
                </li>
                <li>Date et heure d'inscription</li>
                <li>Date et heure de confirmation de l'email</li>
                <li>Source du consentement (formulaire d'inscription)</li>
              </ul>
              <p className="mt-2">
                <strong>
                  Ces données sont nécessaires pour prouver votre consentement
                  explicite
                </strong>{" "}
                conformément au RGPD et pour vous envoyer nos communications
                marketing.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                4. Finalités du traitement
              </h2>
              <p>Vos données sont utilisées pour :</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>
                  <strong>Gestion des commandes :</strong> traitement,
                  livraison, suivi
                </li>
                <li>
                  <strong>Communication :</strong> confirmation de commande,
                  updates livraison, SAV
                </li>
                <li>
                  <strong>Amélioration du service :</strong> analyse statistique
                  anonymisée
                </li>
                <li>
                  <strong>Newsletter :</strong> envoi d'actualités, nouvelles
                  créations et offres exclusives sur la base de votre{" "}
                  <strong>consentement explicite avec double opt-in</strong>{" "}
                  (validation par email). Vous pouvez retirer ce consentement à
                  tout moment en cliquant sur le lien de désinscription présent
                  dans chaque email.
                </li>
                <li>
                  <strong>Obligations légales :</strong> facturation,
                  comptabilité (10 ans)
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Base légale</h2>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>
                  <strong>Exécution du contrat :</strong> traitement des
                  commandes
                </li>
                <li>
                  <strong>Consentement :</strong> newsletter, cookies non
                  essentiels
                </li>
                <li>
                  <strong>Obligation légale :</strong> facturation, archivage
                  comptable
                </li>
                <li>
                  <strong>Intérêt légitime :</strong> lutte contre la fraude,
                  sécurité
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                6. Destinataires des données
              </h2>
              <p>Vos données peuvent être transmises à :</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>
                  <strong>Prestataires techniques :</strong>
                  <ul className="list-circle list-inside ml-8 mt-2 space-y-1">
                    <li>Stripe (paiement)</li>
                    <li>Vercel/Neon (hébergement site et base de données)</li>
                  </ul>
                </li>
                <li>
                  <strong>Transporteurs :</strong> pour la livraison des
                  commandes
                </li>
                <li>
                  <strong>Autorités compétentes :</strong> sur réquisition
                  judiciaire
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                6.1 Transferts de données hors UE
              </h2>
              <p>
                Certains de nos prestataires techniques sont situés en dehors de
                l'Union Européenne :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>
                  <strong>Stripe (États-Unis) :</strong> traitement des
                  paiements - Stripe applique des{" "}
                  <strong>Clauses Contractuelles Types (CCT)</strong> approuvées
                  par la Commission Européenne et est certifié conforme au RGPD.
                </li>
                <li>
                  <strong>Vercel (États-Unis) :</strong> hébergement du site -
                  Vercel applique des{" "}
                  <strong>Clauses Contractuelles Types (CCT)</strong> et
                  garantit un niveau de protection équivalent au RGPD.
                </li>
              </ul>
              <p className="mt-2">
                Ces transferts sont encadrés par des garanties appropriées
                conformément à l'article 46 du RGPD.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                7. Durée de conservation
              </h2>
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="border border-gray-300 dark:border-gray-700 p-3 text-left">
                      Type de données
                    </th>
                    <th className="border border-gray-300 dark:border-gray-700 p-3 text-left">
                      Durée de conservation
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      Compte client
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      Jusqu'à suppression du compte
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      Commandes
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      10 ans (obligation comptable)
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      Panier visiteur
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      7 jours après création
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      Wishlist visiteur
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      30 jours après création (conforme RGPD 2025)
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      Cookies techniques
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      7 jours (cart_session), 30 jours (wishlist_session)
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      Newsletter (non confirmée)
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      30 jours après inscription (suppression automatique si
                      email non validé)
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      Newsletter (confirmée)
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      Jusqu'à désinscription ou 3 ans d'inactivité (aucun email
                      ouvert)
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Vos droits (RGPD)</h2>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>
                  <strong>Droit d'accès :</strong> obtenir une copie de vos
                  données
                </li>
                <li>
                  <strong>Droit de rectification :</strong> corriger des données
                  inexactes
                </li>
                <li>
                  <strong>Droit à l'effacement :</strong> supprimer vos données
                  (sauf obligations légales)
                </li>
                <li>
                  <strong>Droit à la portabilité :</strong> récupérer vos
                  données dans un format structuré
                </li>
                <li>
                  <strong>Droit d'opposition :</strong> vous opposer au
                  traitement pour motif légitime
                </li>
                <li>
                  <strong>Droit de limitation :</strong> restreindre
                  temporairement le traitement
                </li>
              </ul>

              <p>
                Pour exercer vos droits, contactez-nous à{" "}
                <a
                  href={`mailto:${process.env.RESEND_CONTACT_EMAIL || "contact@synclune.fr"}`}
                  className="underline"
                >
                  {process.env.RESEND_CONTACT_EMAIL || "contact@synclune.fr"}
                </a>{" "}
                avec une pièce d'identité.
              </p>
              <p>
                <strong>Délai de réponse :</strong> Nous nous engageons à
                répondre à votre demande dans un délai de{" "}
                <strong>30 jours</strong> maximum à compter de sa réception,
                conformément au RGPD. Ce délai peut être prolongé de 60 jours
                supplémentaires si la demande est complexe, avec notification
                préalable.
              </p>
              <p>
                Vous pouvez également introduire une réclamation auprès de la{" "}
                <strong>CNIL</strong> (Commission Nationale de l'Informatique et
                des Libertés).
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                9. Cookies et stockages locaux
              </h2>
              <h3 className="text-xl font-medium">
                9.1 Cookies strictement nécessaires
              </h3>
              <p>
                Ces cookies sont essentiels au fonctionnement du site. Ils ne
                nécessitent pas de consentement conformément au RGPD car ils
                sont strictement nécessaires à la fourniture du service.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>
                  <strong>cart_session :</strong> identifiant de panier visiteur
                  - Créé uniquement lors de l'ajout d'un produit au panier.
                  Durée : 7 jours (httpOnly, secure). Stocke uniquement un UUID
                  pour récupérer votre panier en base de données.
                </li>
                <li>
                  <strong>wishlist_session :</strong> identifiant de wishlist
                  visiteur - Créé uniquement lors de l'ajout d'un produit à
                  votre wishlist. Durée : 30 jours (httpOnly, secure, conforme
                  RGPD 2025). Stocke uniquement un UUID pour récupérer votre
                  wishlist en base de données.
                </li>
                <li>
                  <strong>better-auth.session_token :</strong> jeton de session
                  utilisateur - Créé uniquement lors de votre connexion ou
                  inscription. Durée : 7 jours (httpOnly, secure). Maintient
                  votre authentification de manière sécurisée.
                </li>
                <li>
                  <strong>better-auth.session_data :</strong> cache de session -
                  Créé uniquement si vous êtes connecté. Durée : 5 minutes
                  (httpOnly, secure). Optimise les performances en réduisant les
                  requêtes base de données.
                </li>
              </ul>

              <h3 className="text-xl font-medium mt-4">
                9.2 Stockage local (LocalStorage)
              </h3>
              <p>
                Certaines données de préférences et fonctionnalités techniques
                sont stockées localement dans votre navigateur via LocalStorage.
                Ces données restent sur votre appareil.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>
                  <strong>cookie-consent :</strong> vos préférences cookies (6
                  mois)
                </li>
                <li>
                  <strong>theme :</strong> préférence de thème clair/sombre
                </li>
                <li>
                  <strong>checkout-form-draft :</strong> brouillon de commande
                  temporaire
                </li>
                <li>
                  <strong>email-verification-cooldown :</strong> protection
                  anti-spam (60 secondes)
                </li>
              </ul>

              <h3 className="text-xl font-medium mt-4">
                9.3 Cookies optionnels (avec consentement)
              </h3>
              <p>
                Ces traceurs nécessitent votre consentement explicite
                conformément au RGPD. Ils ne sont activés que si vous acceptez
                les cookies optionnels.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>
                  <strong>Vercel Analytics :</strong> statistiques anonymisées
                  de navigation pour améliorer le site
                </li>
              </ul>

              <h3 className="text-xl font-medium mt-4">
                9.4 Gestion des cookies
              </h3>
              <p>
                Vous pouvez gérer vos préférences de cookies optionnels à tout
                moment sur notre{" "}
                <a href="/cookies" className="underline">
                  page de gestion des cookies
                </a>
                . Pour les cookies techniques essentiels, vous pouvez les
                bloquer via les paramètres de votre navigateur, mais cela
                pourrait affecter le fonctionnement du site.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Sécurité</h2>
              <p>Nous mettons en œuvre les mesures de sécurité suivantes :</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Chiffrement HTTPS (SSL/TLS)</li>
                <li>Mots de passe hachés (Argon2)</li>
                <li>Hébergement sécurisé (Vercel + Neon Database)</li>
                <li>Paiement sécurisé Stripe (PCI-DSS)</li>
                <li>Sauvegardes régulières</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">11. Contact</h2>
              <p>
                Pour toute question relative à la protection de vos données
                personnelles :
                <br />
                <a
                  href={`mailto:${process.env.RESEND_CONTACT_EMAIL || "contact@synclune.fr"}`}
                  className="underline"
                >
                  {process.env.RESEND_CONTACT_EMAIL || "contact@synclune.fr"}
                </a>
              </p>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
