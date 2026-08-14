import { PageHeader } from "@/shared/components/page-header";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { CookiePreferences } from "./_components/cookie-preferences";
import type { Metadata } from "next";
import { SITE_URL } from "@/shared/constants/seo-config";
import { STATIC_PAGES_CACHE_TAGS } from "@/shared/constants/cache-tags";

export const metadata: Metadata = {
	title: "Gestion des cookies | Synclune",
	description:
		"Gérez vos préférences de cookies et consultez les informations sur les traceurs utilisés sur Synclune - Conformité RGPD",
	keywords: ["cookies", "traceurs", "préférences cookies", "RGPD", "consentement", "Synclune"],
	alternates: {
		canonical: "/cookies",
	},
	openGraph: {
		title: "Gestion des cookies - Synclune",
		description:
			"Gérez vos préférences de cookies et consultez les informations sur les traceurs utilisés",
		url: `${SITE_URL}/cookies`,
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
	cacheTag(STATIC_PAGES_CACHE_TAGS.LEGAL_COOKIES);
	return (
		<>
			<PageHeader
				title="Gestion des cookies"
				description="Gérez vos préférences de cookies et consultez les informations sur les traceurs utilisés"
				breadcrumbs={[
					{ label: "Informations légales", href: "/informations-legales" },
					{ label: "Cookies", href: "/cookies" },
				]}
			/>

			<section className={`bg-background ${SECTION_SPACING.default}`}>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="prose prose-slate max-w-prose space-y-8">
						{/* Introduction */}
						<section className="space-y-4">
							<p className="text-muted-foreground">
								Cette page vous permet de gérer vos préférences en matière de cookies. Vous pouvez
								modifier vos choix à tout moment.
							</p>
						</section>

						{/* Gestion des préférences - Composant client */}
						<section className="not-prose space-y-6">
							<h2 className="text-foreground text-xl font-semibold sm:text-2xl">
								Gérer mes préférences
							</h2>
							<CookiePreferences />
						</section>

						{/* Qu'est-ce qu'un cookie */}
						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">Qu'est-ce qu'un cookie ?</h2>
							<p>
								Un cookie est un petit fichier texte déposé sur votre appareil lors de votre visite
								d'un site internet. Il permet au site de mémoriser des informations sur votre visite
								(panier, préférences, etc.).
							</p>
						</section>

						{/* Cookies utilisés */}
						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">
								Quels cookies et stockages utilisons-nous ?
							</h2>

							<h3 className="text-lg font-medium sm:text-xl">
								Cookies techniques (toujours actifs)
							</h3>
							<p>
								Ces cookies sont essentiels au fonctionnement du site. Ils ne peuvent pas être
								désactivés.
							</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									<strong>cart</strong> : Contenu du panier - Créé{" "}
									<span className="text-success font-medium">
										uniquement lors de l'ajout d'un produit au panier
									</span>
									. Durée : 7 jours après la dernière interaction (httpOnly, secure). Stocke
									directement les articles du panier (variante, quantité, prix constaté), dans votre
									navigateur uniquement — aucun panier n'est conservé en base de données.
								</li>
								<li>
									<strong>cart_session</strong> : Identifiant technique de commande - Créé{" "}
									<span className="text-success font-medium">
										uniquement au démarrage d'un paiement
									</span>
									. Durée : 7 jours (httpOnly, secure). Stocke un identifiant aléatoire qui sert à
									vérifier que le paiement en cours est bien le vôtre, et à limiter le nombre de
									requêtes. Aucune donnée personnelle.
								</li>
								<li>
									<strong>wishlist</strong> : Liste de favoris - Créé{" "}
									<span className="text-success font-medium">
										uniquement lors de l'ajout d'un produit à vos favoris
									</span>
									. Durée : 30 jours après la dernière interaction (httpOnly, secure). Stocke
									directement les identifiants des produits ajoutés en favoris, dans votre
									navigateur uniquement — rien n'est conservé sur nos serveurs.
								</li>
								<li>
									<strong>admin_session</strong> : Jeton de session - Créé{" "}
									<span className="text-success font-medium">
										uniquement lors d&apos;une connexion (accès réservé à l&apos;administration de
										la boutique)
									</span>
									. Durée : 7 jours (httpOnly, secure). Maintient la connexion active et sécurisée.
								</li>
							</ul>

							<h3 className="mt-6 text-lg font-medium sm:text-xl">
								Cookies de préférence et de confort (toujours actifs)
							</h3>
							<p>
								Ces cookies mémorisent vos choix d&apos;affichage et facilitent votre navigation.
								Ils sont déposés par notre site uniquement (httpOnly, secure) et ne servent à aucun
								suivi publicitaire.
							</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									<strong>recent-searches</strong> : Recherches récentes - Mémorise vos dernières
									recherches pour vous les resuggérer. Durée : 30 jours.
								</li>
								<li>
									<strong>fab-hidden-*</strong> : Boutons flottants masqués - Mémorise votre choix
									de masquer un bouton d&apos;action flottant. Durée : 1 an.
								</li>
							</ul>

							<h3 className="mt-6 text-lg font-medium sm:text-xl">
								Cookies de paiement sécurisé (Stripe)
							</h3>
							<p>
								Sur la page de paiement, notre prestataire <strong>Stripe</strong> dépose ses
								propres cookies (<strong>__stripe_mid</strong>, durée 1 an, et{" "}
								<strong>__stripe_sid</strong>, durée 30 minutes) nécessaires au traitement sécurisé
								du paiement et à la <strong>prévention de la fraude</strong>. Ils ne sont déposés
								que lors du chargement du module de paiement. Pour en savoir plus, consultez la{" "}
								<a
									href="https://stripe.com/fr/legal/cookies-policy"
									target="_blank"
									rel="noopener noreferrer"
									className="underline"
								>
									politique cookies de Stripe
								</a>
								.
							</p>

							<h3 className="mt-6 text-lg font-medium sm:text-xl">Stockage local (LocalStorage)</h3>
							<p>
								Certaines données sont stockées localement dans votre navigateur via LocalStorage.
								Ces données sont accessibles uniquement par notre site et restent sur votre
								appareil.
							</p>
							<p className="text-muted-foreground text-sm">
								Votre consentement est conservé pendant <strong>6 mois</strong>, conformément aux
								recommandations de la CNIL (durée maximale de 13 mois). Passé ce délai, votre choix
								vous sera à nouveau demandé.
							</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									<strong>cookie-consent</strong> : Vos préférences cookies (6 mois) - Mémorise vos
									choix concernant l'utilisation des cookies optionnels.
								</li>
								<li>
									<strong>theme</strong> : Préférence de thème (clair/sombre) - Conserve votre choix
									de thème d'affichage entre vos visites.
								</li>
								<li>
									<strong>checkout-form-draft</strong> : Brouillon de commande (temporaire) -
									Sauvegarde automatiquement votre formulaire de commande en cours pour éviter de
									perdre vos données en cas de fermeture accidentelle du navigateur. Supprimé
									automatiquement après validation ou abandon de la commande.
								</li>
								<li>
									<strong>email-verification-cooldown</strong> : Protection anti-spam (60 secondes)
									- Empêche l'envoi trop fréquent de demandes de vérification d'email. Supprimé
									automatiquement après le délai de sécurité.
								</li>
							</ul>

							<h3 className="mt-6 text-lg font-medium sm:text-xl">
								Cookies et traceurs optionnels
							</h3>
							<p>Si vous acceptez les cookies optionnels, nous utilisons également :</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									<strong>Sentry Session Replay</strong> : Enregistrement anonymisé de sessions de
									navigation - Rejoue le parcours d'un échantillon de visites (clics, défilement,
									pages consultées) pour comprendre et corriger les problèmes d'ergonomie. Tous les
									textes, champs de formulaire et médias sont masqués avant envoi : le contenu que
									vous saisissez ou consultez n'est jamais transmis. Ce traceur n'est activé
									qu'après votre consentement et s'arrête si vous le retirez.
								</li>
								<li>
									<strong>Mesure d'audience</strong> : Statistiques de navigation agrégées (pages
									vues, parcours d'achat) pour améliorer l'expérience utilisateur. Aucun outil de
									mesure d'audience tiers n'est actuellement actif ; si un service est branché, il
									respectera ce même consentement.
								</li>
							</ul>

							<h3 className="mt-6 text-lg font-medium sm:text-xl">
								Traceurs de monitoring (intérêt légitime)
							</h3>
							<p>
								Ces traceurs sont utilisés sur la base de notre intérêt légitime pour assurer le bon
								fonctionnement et la sécurité du site.
							</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									<strong>Sentry</strong> : Monitoring d'erreurs et de performance - Collecte
									automatiquement les erreurs techniques survenant sur le site (messages d'erreur,
									pile d'appels, URL, navigateur, adresse IP anonymisée) afin de détecter et
									corriger les dysfonctionnements. Ce traceur est nécessaire à la maintenance et à
									la stabilité du service.
								</li>
							</ul>
						</section>

						{/* Comment supprimer les cookies */}
						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">
								Comment supprimer les cookies de mon navigateur ?
							</h2>
							<p>
								Vous pouvez également supprimer manuellement les cookies depuis les paramètres de
								votre navigateur :
							</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									<strong>Chrome :</strong> Paramètres → Confidentialité et sécurité → Cookies et
									autres données de sites
								</li>
								<li>
									<strong>Firefox :</strong> Paramètres → Vie privée et sécurité → Cookies et
									données de sites
								</li>
								<li>
									<strong>Safari :</strong> Préférences → Confidentialité → Gérer les données de
									sites web
								</li>
								<li>
									<strong>Edge :</strong> Paramètres → Cookies et autorisations de site → Cookies et
									données de site
								</li>
							</ul>
							<p className="text-muted-foreground text-sm">
								⚠️ Attention : supprimer les cookies peut affecter le fonctionnement de certains
								sites internet.
							</p>
						</section>

						{/* En savoir plus */}
						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">En savoir plus</h2>
							<p>
								Pour plus d'informations sur la gestion de vos données personnelles, consultez notre{" "}
								<Link href="/confidentialite" className="underline">
									Politique de Confidentialité
								</Link>
								.
							</p>
							<p>
								Pour en savoir plus sur les cookies et vos droits, consultez les{" "}
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
									href={`mailto:${process.env.RESEND_CONTACT_EMAIL ?? "contact@synclune.fr"}`}
									className="underline"
								>
									{process.env.RESEND_CONTACT_EMAIL ?? "contact@synclune.fr"}
								</a>
								.
							</p>
						</section>

						<p className="text-muted-foreground pt-8 text-center text-xs italic">
							Dernière mise à jour : 1er août 2026
						</p>
					</div>
				</div>
			</section>
		</>
	);
}
