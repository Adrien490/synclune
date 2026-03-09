import { PageHeader } from "@/shared/components/page-header";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { DecorativeHalo } from "@/shared/components/animations/decorative-halo";
import { Check } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL } from "@/shared/constants/seo-config";

export const metadata: Metadata = {
	title: "Accessibilité - Synclune | Engagement pour un site accessible à tous",
	description:
		"Synclune s'engage pour un site web accessible à tous. Découvrez nos efforts en matière d'accessibilité numérique et nos conformités WCAG 2.1.",
	keywords: [
		"accessibilité",
		"WCAG",
		"site accessible",
		"navigation clavier",
		"lecteur d'écran",
		"contraste",
		"accessibility",
	],
	alternates: {
		canonical: "/accessibilite",
	},
	openGraph: {
		title: "Accessibilité - Synclune",
		description: "Engagement de Synclune pour un site web accessible à tous les utilisateurs.",
		url: `${SITE_URL}/accessibilite`,
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "Accessibilité | Synclune",
		description: "Engagement pour un site web accessible à tous - WCAG 2.1",
	},
};

export default async function AccessibilityPage() {
	"use cache";
	cacheLife("reference"); // 24h stale, 30j expire - contenu change rarement
	cacheTag("accessibility-page");

	const contactEmail = process.env.RESEND_CONTACT_EMAIL ?? "contact@synclune.fr";

	return (
		<div className="relative min-h-screen">
			{/* Background discret - Halo statique pour maintenir l'identité */}
			<DecorativeHalo
				size="xl"
				variant="rose"
				className="top-0 right-0"
				opacity="light"
				blur="xl"
				animate="none"
			/>

			<PageHeader
				title="Déclaration d'accessibilité"
				description="Synclune s'engage à rendre son site web accessible à tous les utilisateurs, quelles que soient leurs capacités ou leurs technologies d'assistance."
				breadcrumbs={[
					{ label: "Informations légales", href: "/informations-legales" },
					{ label: "Accessibilité", href: "/accessibilite" },
				]}
			/>

			<section className={`bg-background ${SECTION_SPACING.default} relative z-10`}>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="prose prose-slate max-w-prose space-y-6">
						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">État de conformité</h2>
							<p>
								Ce site web est en <strong>conformité partielle</strong> avec les directives{" "}
								<strong>WCAG 2.1 niveau AA</strong> (Web Content Accessibility Guidelines). Nous
								travaillons continuellement pour améliorer l'accessibilité de notre site.
							</p>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">
								Fonctionnalités d'accessibilité implémentées
							</h2>
							<p>Notre site intègre les fonctionnalités suivantes :</p>

							<div className="grid gap-4 md:grid-cols-2">
								{[
									{
										title: "Navigation au clavier",
										description:
											"Toutes les fonctionnalités du site sont accessibles via le clavier uniquement (Tab, Entrée, Échap).",
									},
									{
										title: "Skip links (liens d'évitement)",
										description:
											"Liens invisibles en haut de page permettant de sauter directement au contenu principal.",
									},
									{
										title: "Hiérarchie des titres",
										description:
											"Structure sémantique correcte des titres (H1, H2, H3, etc.) pour une navigation aisée.",
									},
									{
										title: "Textes alternatifs",
										description:
											"Images accompagnées de descriptions alternatives pour les lecteurs d'écran.",
									},
									{
										title: "Contraste des couleurs",
										description:
											"Ratios de contraste conformes aux standards WCAG AA pour une lisibilité optimale.",
									},
									{
										title: "Taille de texte adaptable",
										description:
											"Utilisation d'unités relatives permettant le zoom sans perte de contenu.",
									},
									{
										title: "Labels et aria-labels",
										description:
											"Formulaires et éléments interactifs correctement étiquetés pour les technologies d'assistance.",
									},
									{
										title: "Focus visible",
										description: "Indicateurs visuels clairs lors de la navigation au clavier.",
									},
									{
										title: "Responsive design",
										description:
											"Site adaptatif fonctionnant sur tous types d'appareils et tailles d'écran.",
									},
									{
										title: "Données structurées",
										description:
											"Balisage Schema.org pour une meilleure compréhension du contenu par les assistants vocaux.",
									},
									{
										title: "Annonces dynamiques (live regions)",
										description:
											"Les mises à jour du panier, erreurs de formulaire et changements d'état sont annoncés automatiquement aux lecteurs d'écran.",
									},
									{
										title: "Respect des préférences de mouvement",
										description:
											"Les animations sont désactivées automatiquement si vous avez activé « prefers-reduced-motion » dans votre système.",
									},
								].map((item) => (
									<div key={item.title} className="bg-muted/20 flex gap-3 rounded-lg border p-4">
										<Check className="text-secondary mt-0.5 h-5 w-5 shrink-0" />
										<div>
											<p className="text-foreground font-medium">{item.title}</p>
											<p className="text-muted-foreground text-sm">{item.description}</p>
										</div>
									</div>
								))}
							</div>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">Raccourcis clavier</h2>
							<p>Les raccourcis clavier suivants sont disponibles :</p>

							<div className="overflow-x-auto">
								<table className="min-w-full border">
									<caption className="sr-only">Raccourcis clavier disponibles sur le site</caption>
									<thead className="bg-muted/50">
										<tr>
											<th scope="col" className="border-b px-4 py-2 text-left">
												Action
											</th>
											<th scope="col" className="border-b px-4 py-2 text-left">
												Raccourci
											</th>
										</tr>
									</thead>
									<tbody>
										<tr>
											<td className="border-b px-4 py-2">Navigation suivante</td>
											<td className="border-b px-4 py-2">
												<kbd className="bg-muted rounded px-2 py-1 font-mono text-sm">Tab</kbd>
											</td>
										</tr>
										<tr>
											<td className="border-b px-4 py-2">Navigation précédente</td>
											<td className="border-b px-4 py-2">
												<kbd className="bg-muted rounded px-2 py-1 font-mono text-sm">
													Shift + Tab
												</kbd>
											</td>
										</tr>
										<tr>
											<td className="border-b px-4 py-2">Activer un lien ou bouton</td>
											<td className="border-b px-4 py-2">
												<kbd className="bg-muted rounded px-2 py-1 font-mono text-sm">
													Entrée ou Espace
												</kbd>
											</td>
										</tr>
										<tr>
											<td className="border-b px-4 py-2">Fermer une modale</td>
											<td className="border-b px-4 py-2">
												<kbd className="bg-muted rounded px-2 py-1 font-mono text-sm">Échap</kbd>
											</td>
										</tr>
										<tr>
											<td className="border-b px-4 py-2">Accéder au contenu principal</td>
											<td className="border-b px-4 py-2">
												<kbd className="bg-muted rounded px-2 py-1 font-mono text-sm">
													Tab (depuis le haut de page)
												</kbd>
											</td>
										</tr>
										<tr>
											<td className="border-b px-4 py-2">Navigation dans la galerie photos</td>
											<td className="border-b px-4 py-2">
												<kbd className="bg-muted rounded px-2 py-1 font-mono text-sm">← →</kbd> ou{" "}
												<kbd className="bg-muted rounded px-2 py-1 font-mono text-sm">
													Début / Fin
												</kbd>
											</td>
										</tr>
										<tr>
											<td className="px-4 py-2">Modifier une quantité</td>
											<td className="px-4 py-2">
												<kbd className="bg-muted rounded px-2 py-1 font-mono text-sm">+ / -</kbd> ou
												saisie directe
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">
								Technologies d'assistance compatibles
							</h2>
							<p>Notre site a été testé avec les technologies d'assistance suivantes :</p>

							<ul className="space-y-2">
								{[
									"NVDA (lecteur d'écran Windows)",
									"JAWS (lecteur d'écran Windows)",
									"VoiceOver (lecteur d'écran macOS et iOS)",
									"TalkBack (lecteur d'écran Android)",
									"Agrandisseurs d'écran",
									"Navigation au clavier uniquement",
								].map((tech) => (
									<li key={tech} className="flex gap-2">
										<Check className="text-secondary h-5 w-5 shrink-0" />
										<span>{tech}</span>
									</li>
								))}
							</ul>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">
								Limitations connues et améliorations en cours
							</h2>
							<p>Nous travaillons activement sur les points suivants :</p>

							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>Amélioration continue de la compatibilité avec tous les lecteurs d'écran</li>
								<li>
									Optimisation des animations pour les utilisateurs préférant un mouvement réduit
								</li>
								<li>Enrichissement des descriptions alternatives des images</li>
								<li>Tests réguliers avec des utilisateurs de technologies d'assistance</li>
							</ul>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">
								Signaler un problème d'accessibilité
							</h2>
							<p>
								Si vous rencontrez des difficultés d'accessibilité sur notre site, nous vous
								invitons à nous le signaler. Votre retour nous aide à améliorer l'expérience pour
								tous.
							</p>

							<div className="bg-muted/30 rounded-lg border p-6">
								<p className="mb-3 font-medium">Contactez-nous :</p>
								<ul className="space-y-2">
									<li>
										<strong>Email :</strong>{" "}
										<a href={`mailto:${contactEmail}`} className="underline">
											{contactEmail}
										</a>
									</li>
									<li>
										<strong>Formulaire de contact :</strong>{" "}
										<Link href="/personnalisation" className="underline">
											Page personnalisation
										</Link>
									</li>
								</ul>
								<p className="text-muted-foreground mt-4 text-sm italic">
									Nous nous engageons à vous répondre dans les 48 heures ouvrées et à corriger les
									problèmes signalés dans les meilleurs délais.
								</p>
							</div>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">Références et normes</h2>
							<p>Ce site respecte les normes suivantes :</p>

							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									WCAG 2.1 Niveau AA -{" "}
									<a
										href="https://www.w3.org/WAI/WCAG21/quickref/"
										target="_blank"
										rel="noopener noreferrer"
										className="underline"
									>
										Directives W3C
									</a>
								</li>
								<li>
									RGAA 4.1.2 (Référentiel Général d'Amélioration de l'Accessibilité) -{" "}
									<a
										href="https://accessibilite.numerique.gouv.fr/"
										target="_blank"
										rel="noopener noreferrer"
										className="underline"
									>
										Version française
									</a>
								</li>
								<li>
									ARIA (Accessible Rich Internet Applications) -{" "}
									<a
										href="https://www.w3.org/WAI/ARIA/apg/"
										target="_blank"
										rel="noopener noreferrer"
										className="underline"
									>
										Spécifications W3C
									</a>
								</li>
							</ul>
						</section>

						<section className="space-y-4">
							<h2 className="text-xl font-semibold sm:text-2xl">Voies de recours</h2>
							<p>
								Si vous constatez un défaut d'accessibilité vous empêchant d'accéder à un contenu ou
								une fonctionnalité du site, que vous nous le signalez et que vous ne parvenez pas à
								obtenir une réponse satisfaisante, vous êtes en droit de :
							</p>
							<ul className="ml-4 list-inside list-disc space-y-2">
								<li>
									Écrire un message au{" "}
									<a
										href="https://formulaire.defenseurdesdroits.fr/"
										target="_blank"
										rel="noopener noreferrer"
										className="underline"
									>
										Défenseur des droits
									</a>
								</li>
								<li>Contacter le délégué du Défenseur des droits dans votre région</li>
								<li>
									Envoyer un courrier (gratuit, ne pas mettre de timbre) à : Défenseur des droits,
									Libre réponse 71120, 75342 Paris Cedex 07
								</li>
							</ul>
						</section>

						<p className="text-muted-foreground pt-8 text-center text-xs italic">
							Dernière mise à jour : 13 février 2026
						</p>
					</div>
				</div>
			</section>
		</div>
	);
}
