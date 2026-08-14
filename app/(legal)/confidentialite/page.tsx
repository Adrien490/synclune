import { PageHeader } from "@/shared/components/page-header";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import { SITE_URL } from "@/shared/constants/seo-config";
import Link from "next/link";
import { STATIC_PAGES_CACHE_TAGS } from "@/shared/constants/cache-tags";

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
		url: `${SITE_URL}/confidentialite`,
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
	cacheTag(STATIC_PAGES_CACHE_TAGS.LEGAL_PRIVACY);

	return (
		<>
			<PageHeader
				title="Politique de Confidentialité"
				description="Protection des données personnelles et respect de votre vie privée conformément au RGPD"
				breadcrumbs={[
					{ label: "Informations légales", href: "/informations-legales" },
					{ label: "Confidentialité", href: "/confidentialite" },
				]}
			/>

			<section className={`bg-background ${SECTION_SPACING.default}`}>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="prose prose-slate max-w-prose space-y-6">
						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">1. Introduction</h2>
							<p>
								La présente Politique de Confidentialité décrit comment <strong>Synclune</strong>{" "}
								collecte, utilise et protège vos données personnelles conformément au Règlement
								Général sur la Protection des Données (RGPD).
							</p>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">2. Responsable du traitement</h2>
							<p>
								<strong>Synclune</strong> : TADDEI LEANE
								<br />
								77 Boulevard du Tertre, 44100 Nantes, France
								<br />
								Email :{" "}
								<a
									href={`mailto:${process.env.RESEND_CONTACT_EMAIL ?? "contact@synclune.fr"}`}
									className="underline"
								>
									{process.env.RESEND_CONTACT_EMAIL ?? "contact@synclune.fr"}
								</a>
							</p>
							<p className="mt-3">
								<strong>Délégué à la Protection des Données (DPO) :</strong>
								Conformément à l'article 37 du RGPD, Synclune n'est pas tenue de désigner un DPO car
								nous sommes une micro-entreprise artisanale ne traitant pas de données sensibles à
								grande échelle. Pour toute question relative à la protection de vos données, vous
								pouvez contacter directement le responsable du traitement via l'email ci-dessus.
							</p>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">3. Données collectées</h2>
							{/*
							 * Plus de sous-section « création de compte » : la boutique n'a plus
							 * d'espace client (2026-07-31) — tout le parcours d'achat est invité.
							 * Nom, email et mot de passe ne sont donc plus collectés qu'au moment
							 * de la commande (sans mot de passe), listés ci-dessous.
							 */}
							<h3 className="text-lg font-medium sm:text-xl">3.1 Lors d'une commande</h3>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>Nom et prénom</li>
								<li>Adresse email</li>
								<li>Adresse de livraison (adresse postale, téléphone)</li>
								<li>Historique de commandes</li>
								<li>Informations de paiement (via Stripe - voir section 3.3)</li>
							</ul>

							<h3 className="text-lg font-medium sm:text-xl">3.2 Navigation sur le site</h3>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>Cookies techniques (panier, session)</li>
								<li>Adresse IP</li>
								<li>Données de navigation (pages visitées, durée)</li>
							</ul>

							<h3 className="text-lg font-medium sm:text-xl">3.3 Paiement</h3>
							<p>
								<strong>Aucune donnée bancaire n'est stockée sur nos serveurs.</strong> Le paiement
								est entièrement géré par notre prestataire <strong>Stripe</strong>, certifié PCI-DSS
								niveau 1.
							</p>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">4. Finalités du traitement</h2>
							<p>Vos données sont utilisées pour :</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									<strong>Gestion des commandes :</strong> traitement, livraison, suivi
								</li>
								<li>
									<strong>Communication :</strong> confirmation de commande, updates livraison, SAV
								</li>
								<li>
									<strong>Amélioration du service :</strong> analyse statistique anonymisée
								</li>
								<li>
									<strong>Obligations légales :</strong> facturation, comptabilité (10 ans)
								</li>
							</ul>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">5. Base légale</h2>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									<strong>Exécution du contrat :</strong> traitement des commandes
								</li>
								<li>
									<strong>Consentement :</strong> cookies non essentiels
								</li>
								<li>
									<strong>Obligation légale :</strong> facturation, archivage comptable
								</li>
								<li>
									<strong>Intérêt légitime :</strong> lutte contre la fraude, sécurité
								</li>
							</ul>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">6. Destinataires des données</h2>
							<p>Vos données peuvent être transmises à :</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									<strong>Prestataires techniques :</strong>
									<ul className="list-circle mt-2 ml-8 list-inside space-y-1">
										<li>Stripe (paiement sécurisé)</li>
										<li>Vercel (hébergement du site)</li>
										<li>Neon (base de données PostgreSQL)</li>
										<li>Resend (envoi d'emails transactionnels)</li>
										<li>UploadThing (stockage des fichiers et images)</li>
										<li>Sentry (monitoring d'erreurs et performance)</li>
									</ul>
								</li>
								<li>
									<strong>Transporteurs :</strong> pour la livraison des commandes
								</li>
								<li>
									<strong>Autorités compétentes :</strong> sur réquisition judiciaire
								</li>
							</ul>

							<h3 className="text-lg font-medium sm:text-xl">6.1 Transferts de données hors UE</h3>
							<p>
								Certains de nos prestataires techniques sont situés en dehors de l'Union Européenne
								:
							</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									<strong>Stripe (États-Unis) :</strong> traitement des paiements - Stripe applique
									des <strong>Clauses Contractuelles Types (CCT)</strong> approuvées par la
									Commission Européenne et est certifié conforme au RGPD.
								</li>
								<li>
									<strong>Vercel (États-Unis) :</strong> hébergement du site - Vercel applique des{" "}
									<strong>Clauses Contractuelles Types (CCT)</strong> et garantit un niveau de
									protection équivalent au RGPD.
								</li>
								<li>
									<strong>Resend (États-Unis) :</strong> envoi d'emails transactionnels - Resend
									applique des <strong>Clauses Contractuelles Types (CCT)</strong> et s'engage à
									protéger les données conformément au RGPD.
								</li>
								<li>
									<strong>Neon (États-Unis) :</strong> hébergement de la base de données PostgreSQL
									- Neon applique des <strong>Clauses Contractuelles Types (CCT)</strong> et
									garantit un niveau de protection conforme au RGPD.
								</li>
								<li>
									<strong>UploadThing (États-Unis) :</strong> stockage des fichiers et images -
									UploadThing applique des <strong>Clauses Contractuelles Types (CCT)</strong> et
									s'engage à protéger les données conformément au RGPD.
								</li>
								{/*
								 * Google (OAuth) retiré des destinataires et des transferts : les
								 * `socialProviders` ont disparu avec l'espace client (2026-07-31) —
								 * plus aucune donnée n'est transmise à Google.
								 */}
								<li>
									<strong>Sentry (États-Unis) :</strong> monitoring d'erreurs et performance -
									Functional Software Inc., San Francisco. Sentry applique des{" "}
									<strong>Clauses Contractuelles Types (CCT)</strong> et s'engage à protéger les
									données conformément au RGPD.
								</li>
							</ul>
							<p className="mt-2">
								Ces transferts sont encadrés par des garanties appropriées conformément à l'article
								46 du RGPD.
							</p>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">7. Durée de conservation</h2>
							<div className="overflow-x-auto">
								<table className="w-full border-collapse border border-gray-300">
									<caption className="sr-only">
										Durée de conservation des différents types de données personnelles
									</caption>
									<thead>
										<tr className="bg-muted">
											<th scope="col" className="border border-gray-300 p-3 text-left">
												Type de données
											</th>
											<th scope="col" className="border border-gray-300 p-3 text-left">
												Durée de conservation
											</th>
										</tr>
									</thead>
									<tbody>
										{/*
										 * Ligne « Compte client » retirée : plus d'espace client
										 * (2026-07-31), aucun compte n'est créé pour les acheteurs.
										 */}
										<tr>
											<td className="border border-gray-300 p-3">Commandes</td>
											<td className="border border-gray-300 p-3">10 ans (obligation comptable)</td>
										</tr>
										<tr>
											<td className="border border-gray-300 p-3">Panier visiteur</td>
											<td className="border border-gray-300 p-3">
												7 jours après la dernière interaction
											</td>
										</tr>
										{/*
										 * Ni « Panier visiteur » ni « Wishlist visiteur » n'apparaissent
										 * dans la rétention SERVEUR : depuis le 2026-08-03 (favoris) et le
										 * 2026-08-04 (panier), les deux vivent uniquement dans des cookies
										 * du navigateur — aucune donnée n'en est conservée en base.
										 */}
										<tr>
											<td className="border border-gray-300 p-3">Cookies techniques</td>
											<td className="border border-gray-300 p-3">
												7 jours (cart, cart_session), 30 jours (wishlist)
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">8. Vos droits (RGPD)</h2>
							<p>Conformément au RGPD, vous disposez des droits suivants :</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									<strong>Droit d'accès :</strong> obtenir une copie de vos données
								</li>
								{/*
								 * Plus de renvoi vers `/parametres` : la boutique n'a plus d'espace
								 * client (2026-07-31), donc plus d'auto-service de rectification.
								 * Tous les droits s'exercent par le même canal — l'email de contact
								 * indiqué plus bas, avec la même obligation de réponse sous 30 jours.
								 */}
								<li>
									<strong>Droit de rectification :</strong> corriger des données inexactes
								</li>
								<li>
									<strong>Droit à l'effacement :</strong> supprimer vos données (sauf obligations
									légales)
								</li>
								<li>
									<strong>Droit à la portabilité :</strong> récupérer vos données dans un format
									structuré
								</li>
								<li>
									<strong>Droit d'opposition :</strong> vous opposer au traitement pour motif
									légitime
								</li>
								<li>
									<strong>Droit de limitation :</strong> restreindre temporairement le traitement
								</li>
								<li>
									<strong>Droit aux directives post-mortem :</strong> conformément à l'article 85 de
									la Loi Informatique et Libertés, vous pouvez définir des directives relatives au
									sort de vos données après votre décès
								</li>
							</ul>

							<p>
								Pour exercer vos droits, contactez-nous à{" "}
								<a
									href={`mailto:${process.env.RESEND_CONTACT_EMAIL ?? "contact@synclune.fr"}`}
									className="underline"
								>
									{process.env.RESEND_CONTACT_EMAIL ?? "contact@synclune.fr"}
								</a>{" "}
								avec une pièce d'identité.
							</p>
							<p>
								<strong>Délai de réponse :</strong> Nous nous engageons à répondre à votre demande
								dans un délai de <strong>30 jours</strong> maximum à compter de sa réception,
								conformément au RGPD. Ce délai peut être prolongé de 60 jours supplémentaires si la
								demande est complexe, avec notification préalable.
							</p>
							<p>
								Vous pouvez également introduire une réclamation auprès de la <strong>CNIL</strong>{" "}
								(Commission Nationale de l'Informatique et des Libertés) :
							</p>
							<div className="ml-4 space-y-1 text-sm">
								<p>3 Place de Fontenoy, TSA 80715</p>
								<p>75334 Paris Cedex 07</p>
								<p>
									Site web :{" "}
									<a
										href="https://www.cnil.fr"
										target="_blank"
										rel="noopener noreferrer"
										className="underline"
									>
										www.cnil.fr
									</a>
								</p>
							</div>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">9. Cookies et stockages locaux</h2>
							<h3 className="text-lg font-medium sm:text-xl">
								9.1 Cookies strictement nécessaires
							</h3>
							<p>
								Ces cookies sont essentiels au fonctionnement du site. Ils ne nécessitent pas de
								consentement conformément au RGPD car ils sont strictement nécessaires à la
								fourniture du service.
							</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									<strong>cart :</strong> contenu du panier - Créé uniquement lors de l'ajout d'un
									produit au panier. Durée : 7 jours après la dernière interaction (httpOnly,
									secure). Stocke directement les articles du panier (variante, quantité, prix
									constaté), dans votre navigateur uniquement — aucun panier n'est conservé en base
									de données.
								</li>
								<li>
									<strong>cart_session :</strong> identifiant technique de commande - Créé
									uniquement au démarrage d'un paiement. Durée : 7 jours (httpOnly, secure). Stocke
									un UUID aléatoire servant à vérifier que le paiement en cours est bien le vôtre,
									et à limiter le nombre de requêtes. Aucune donnée personnelle.
								</li>
								<li>
									<strong>wishlist :</strong> liste de favoris - Créé uniquement lors de l'ajout
									d'un produit à vos favoris. Durée : 30 jours après la dernière interaction
									(httpOnly, secure). Stocke directement les identifiants des produits favoris, dans
									votre navigateur uniquement — aucune donnée wishlist n'est conservée en base de
									données.
								</li>
								<li>
									<strong>admin_session :</strong> jeton de session - Créé uniquement lors d'une
									connexion (l'accès authentifié est réservé à l'administration de la boutique).
									Durée : 7 jours (httpOnly, secure). Maintient l'authentification de manière
									sécurisée.
								</li>
								<li>
									<strong>recent-searches :</strong> recherches récentes - confort de navigation.
									Durée : 30 jours (httpOnly, secure).
								</li>
								<li>
									<strong>fab-hidden-* :</strong> mémorisation de vos choix d'affichage (bouton
									flottant masqué). Durée : 1 an (httpOnly, secure).
								</li>
							</ul>
							<p>
								Sur la page de paiement, notre prestataire <strong>Stripe</strong> dépose en outre
								ses propres cookies (<strong>__stripe_mid</strong>, 1 an ;{" "}
								<strong>__stripe_sid</strong>, 30 minutes), nécessaires au traitement sécurisé du
								paiement et à la prévention de la fraude.
							</p>

							<h3 className="mt-4 text-lg font-medium sm:text-xl">
								9.2 Stockage local (LocalStorage)
							</h3>
							<p>
								Certaines données de préférences et fonctionnalités techniques sont stockées
								localement dans votre navigateur via LocalStorage. Ces données restent sur votre
								appareil.
							</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									<strong>cookie-consent :</strong> vos préférences cookies (6 mois)
								</li>
								<li>
									<strong>theme :</strong> préférence de thème clair/sombre
								</li>
								<li>
									<strong>checkout-form-draft :</strong> brouillon de commande temporaire
								</li>
								<li>
									<strong>email-verification-cooldown :</strong> protection anti-spam (60 secondes)
								</li>
							</ul>

							<h3 className="mt-4 text-lg font-medium sm:text-xl">
								9.3 Cookies optionnels (avec consentement)
							</h3>
							<p>
								Ces traceurs nécessitent votre consentement explicite conformément au RGPD. Ils ne
								sont activés que si vous acceptez les cookies optionnels.
							</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									<strong>Sentry Session Replay :</strong> enregistrement anonymisé d'un échantillon
									de sessions de navigation (textes, saisies et médias masqués) pour corriger les
									problèmes d'ergonomie
								</li>
							</ul>

							<h3 className="mt-4 text-lg font-medium sm:text-xl">9.4 Gestion des cookies</h3>
							<p>
								Vous pouvez gérer vos préférences de cookies optionnels à tout moment sur notre{" "}
								<Link href="/cookies" className="underline">
									page de gestion des cookies
								</Link>
								. Pour les cookies techniques essentiels, vous pouvez les bloquer via les paramètres
								de votre navigateur, mais cela pourrait affecter le fonctionnement du site.
							</p>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">
								10. Décisions automatisées et profilage
							</h2>
							<p>
								Conformément à l'article 22 du RGPD, Synclune{" "}
								<strong>n'utilise aucune prise de décision automatisée</strong> ni profilage
								produisant des effets juridiques ou significatifs à votre égard. Aucun algorithme
								n'est utilisé pour personnaliser les prix ou filtrer l'accès à nos services.
							</p>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">11. Sécurité</h2>
							<p>Nous mettons en œuvre les mesures de sécurité suivantes :</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>Chiffrement HTTPS (SSL/TLS)</li>
								<li>Mots de passe hachés (Argon2)</li>
								<li>Hébergement sécurisé (Vercel + Neon Database)</li>
								<li>Paiement sécurisé Stripe (PCI-DSS)</li>
								<li>Sauvegardes régulières</li>
							</ul>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">12. Contact</h2>
							<p>
								Pour toute question relative à la protection de vos données personnelles :
								<br />
								<a
									href={`mailto:${process.env.RESEND_CONTACT_EMAIL ?? "contact@synclune.fr"}`}
									className="underline"
								>
									{process.env.RESEND_CONTACT_EMAIL ?? "contact@synclune.fr"}
								</a>
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
