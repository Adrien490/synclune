import { PageHeader } from "@/shared/components/page-header";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Cookie, Eye, FileText, RotateCcw, Scale, Shield } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL } from "@/shared/constants/seo-config";

export const metadata: Metadata = {
	title: "Informations légales - Synclune | Bijoux artisanaux Nantes",
	description:
		"Informations légales du site Synclune - Créatrice de bijoux faits main à Nantes. Mentions légales et conditions d'utilisation.",
	keywords: [
		"informations légales",
		"CGV",
		"mentions légales",
		"confidentialité",
		"conditions utilisation",
		"Synclune",
	],
	alternates: {
		canonical: "/informations-legales",
	},
	openGraph: {
		title: "Informations légales - Synclune",
		description:
			"Informations légales du site Synclune - Mentions légales et conditions d'utilisation.",
		url: `${SITE_URL}/informations-legales`,
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "Informations légales | Synclune",
		description: "Toutes les informations légales du site Synclune",
	},
};

export default async function LegalPage() {
	"use cache";
	cacheLife("reference");
	cacheTag("legal-hub");
	const legalPages = [
		{
			title: "Mentions légales",
			description: "Identification de l'éditeur, hébergeur et directeur de publication",
			href: "/mentions-legales",
			icon: FileText,
		},
		{
			title: "Conditions Générales de Vente",
			description: "CGV, livraison, paiement, garanties et règlement des litiges",
			href: "/cgv",
			icon: Scale,
		},
		{
			title: "Politique de confidentialité",
			description: "Protection des données personnelles et respect du RGPD",
			href: "/confidentialite",
			icon: Shield,
		},
		{
			title: "Gestion des cookies",
			description: "Informations sur les cookies utilisés et gestion des préférences",
			href: "/cookies",
			icon: Cookie,
		},
		{
			title: "Droit de rétractation",
			description: "Formulaire type de rétractation (14 jours)",
			href: "/retractation",
			icon: RotateCcw,
		},
		{
			title: "Accessibilité",
			description: "Déclaration d'accessibilité et engagement pour un site accessible",
			href: "/accessibilite",
			icon: Eye,
		},
	];

	const contactEmail = process.env.RESEND_CONTACT_EMAIL ?? "contact@synclune.fr";

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Informations légales"
				description="Consultez toutes les informations légales concernant Synclune"
				breadcrumbs={[{ label: "Informations légales", href: "/informations-legales" }]}
			/>

			<section className={`bg-background ${SECTION_SPACING.default}`}>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					{/* Introduction */}
					<div className="bg-background/80 mb-8 rounded-2xl border p-8 shadow-lg backdrop-blur-sm">
						<h2 className="text-foreground mb-4 text-xl font-semibold sm:text-2xl">
							Transparence et conformité
						</h2>
						<p className="text-muted-foreground text-base/7 tracking-normal antialiased">
							Synclune s'engage à respecter la législation française et européenne en vigueur.
							Retrouvez ci-dessous l'ensemble de nos documents légaux.
						</p>
					</div>

					{/* Grille de cartes des pages légales */}
					<div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{legalPages.map((page) => {
							const Icon = page.icon;
							return (
								<Card
									key={page.href}
									className="bg-background/80 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl"
								>
									<CardHeader>
										<div className="mb-2 flex items-center gap-3">
											<div className="bg-primary/10 rounded-lg p-2">
												<Icon className="text-primary h-5 w-5" />
											</div>
										</div>
										<CardTitle className="text-lg">{page.title}</CardTitle>
										<CardDescription className="text-sm">{page.description}</CardDescription>
									</CardHeader>
									<CardContent>
										<Button asChild variant="outline" className="w-full">
											<Link href={page.href}>Consulter</Link>
										</Button>
									</CardContent>
								</Card>
							);
						})}
					</div>

					{/* Informations rapides */}
					<div className="bg-background/80 mb-8 rounded-2xl border p-8 shadow-lg backdrop-blur-sm">
						<h2 className="text-foreground mb-6 text-lg font-semibold sm:text-xl">
							Informations essentielles
						</h2>
						<div className="grid gap-6 md:grid-cols-2">
							<div>
								<h3 className="text-foreground mb-2 font-medium">Éditeur du site</h3>
								<p className="text-muted-foreground text-sm">
									<strong>TADDEI LEANE</strong> (Synclune)
									<br />
									Micro-entreprise
									<br />
									SIRET : 839 183 027 00037
								</p>
							</div>
							<div>
								<h3 className="text-foreground mb-2 font-medium">Contact</h3>
								<p className="text-muted-foreground text-sm">
									Email :{" "}
									<a href={`mailto:${contactEmail}`} className="underline hover:opacity-80">
										{contactEmail}
									</a>
									<br />
									Adresse : 77 Boulevard du Tertre
									<br />
									44100 Nantes, France
								</p>
							</div>
							<div>
								<h3 className="text-foreground mb-2 font-medium">Hébergement</h3>
								<p className="text-muted-foreground text-sm">
									<strong>Vercel Inc.</strong>
									<br />
									Walnut, CA 91789, USA
								</p>
							</div>
							<div>
								<h3 className="text-foreground mb-2 font-medium">Médiation</h3>
								<p className="text-muted-foreground text-sm">
									<strong>CNPM</strong>
									<br />
									Centre National de la Médiation
									<br />
									<a
										href="https://cnpm-mediation-consommation.eu"
										target="_blank"
										rel="noopener noreferrer"
										className="underline hover:opacity-80"
									>
										cnpm-mediation-consommation.eu
									</a>
								</p>
							</div>
						</div>
					</div>

					{/* Contact et boutons d'action */}
					<div className="to-gold-50/50 rounded-xl bg-linear-to-r from-rose-50/50 p-6 text-center">
						<h3 className="text-foreground mb-3 text-lg font-semibold">
							Une question sur vos droits ?
						</h3>
						<p className="text-muted-foreground mb-4 text-sm">
							N'hésitez pas à nous contacter pour toute question concernant vos droits, vos données
							personnelles ou nos conditions de vente.
						</p>
						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							<Button asChild size="lg">
								<a href={`mailto:${contactEmail}`} className="flex items-center gap-2">
									Nous contacter
								</a>
							</Button>
							<Button asChild variant="outline" size="lg">
								<Link href="/" className="flex items-center gap-2">
									Retour à l'accueil
								</Link>
							</Button>
						</div>
					</div>

					{/* Dernière mise à jour */}
					<div className="mt-8 text-center">
						<p className="text-muted-foreground text-sm/6 tracking-normal italic antialiased">
							Dernière mise à jour : 13 février 2026
						</p>
					</div>
				</div>
			</section>
		</div>
	);
}
