import { PageHeader } from "@/shared/components/page-header";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Info, Mail } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL } from "@/shared/constants/seo-config";
import { PrintButton } from "./_components/print-button";

export const metadata: Metadata = {
	title: "Formulaire de rétractation | Synclune",
	description:
		"Formulaire type de rétractation conforme à l'article L221-5 du Code de la consommation - Exercez votre droit de rétractation dans les 14 jours",
	keywords: [
		"rétractation",
		"droit de rétractation",
		"14 jours",
		"retour commande",
		"remboursement",
		"Synclune",
	],
	alternates: {
		canonical: "/retractation",
	},
	openGraph: {
		title: "Formulaire de rétractation - Synclune",
		description:
			"Formulaire type de rétractation conforme au Code de la consommation - Droit de rétractation de 14 jours",
		url: `${SITE_URL}/retractation`,
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "Rétractation | Synclune",
		description: "Formulaire de rétractation - Droit de retour 14 jours",
	},
};

export default async function RetractationPage() {
	"use cache";
	cacheLife("reference"); // 24h stale, 30j expire - contenu légal change rarement
	cacheTag("legal-retractation");

	// Récupérer l'email de contact depuis les variables d'environnement
	const contactEmail = process.env.RESEND_CONTACT_EMAIL ?? "contact@synclune.fr";

	return (
		<>
			<PageHeader
				title="Formulaire de rétractation"
				description="Exercez votre droit de rétractation dans les 14 jours"
				breadcrumbs={[
					{ label: "Informations légales", href: "/informations-legales" },
					{ label: "Formulaire de rétractation", href: "/retractation" },
				]}
			/>

			<section className={`bg-background ${SECTION_SPACING.default}`}>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="prose prose-slate max-w-prose space-y-8">
						{/* Composant formulaire de rétractation */}
						<section className="space-y-8">
							{/* Information préliminaire */}
							<Alert>
								<Info className="h-4 w-4" />
								<AlertTitle>Votre droit de rétractation</AlertTitle>
								<AlertDescription className="mt-2 space-y-2">
									<p>
										Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un
										délai de <strong>14 jours calendaires</strong> à compter de la réception de
										votre commande pour exercer votre droit de rétractation sans avoir à justifier
										de motifs ni à payer de pénalité.
									</p>
									<p className="text-muted-foreground mt-2 text-xs">
										Le délai court à partir de la date de réception physique du dernier article en
										cas de commande multiple.
									</p>
								</AlertDescription>
							</Alert>

							{/* Formulaire type */}
							<div className="bg-muted/30 space-y-6 rounded-lg border p-6 md:p-8">
								<h2 className="m-0 text-xl font-semibold sm:text-2xl">
									Formulaire type de rétractation
								</h2>

								<p className="text-muted-foreground text-sm italic">
									Veuillez compléter et nous renvoyer le présent formulaire uniquement si vous
									souhaitez vous rétracter du contrat.
								</p>

								<div className="bg-background space-y-4 rounded-md border p-6 text-sm">
									<p className="font-medium">À l'attention de :</p>
									<div className="ml-4 space-y-1">
										<p>
											<strong>Synclune</strong>
										</p>
										<p>TADDEI LEANE</p>
										<p>77 Boulevard du Tertre</p>
										<p>44100 Nantes</p>
										<p>France</p>
										<div className="mt-2 flex items-center gap-2">
											<Mail className="h-4 w-4" />
											<a href={`mailto:${contactEmail}`} className="underline">
												{contactEmail}
											</a>
										</div>
									</div>

									<div className="space-y-6 border-t pt-4">
										<p>
											Je/Nous (*) vous notifie/notifions (*) par la présente ma/notre (*)
											rétractation du contrat portant sur la vente du bien (*)/pour la prestation de
											services (*) ci-dessous :
										</p>

										<div className="space-y-2">
											<p>
												<strong>Commandé le (*) :</strong>{" "}
												<span className="border-muted-foreground/30 inline-block min-w-50 border-b border-dashed">
													&nbsp;
												</span>
											</p>
											<p>
												<strong>Reçu le (*) :</strong>{" "}
												<span className="border-muted-foreground/30 inline-block min-w-50 border-b border-dashed">
													&nbsp;
												</span>
											</p>
											<p>
												<strong>Numéro de commande :</strong>{" "}
												<span className="border-muted-foreground/30 inline-block min-w-50 border-b border-dashed">
													&nbsp;
												</span>
											</p>
										</div>

										<p>
											<strong>Nom du (des) consommateur(s) :</strong>
											<br />
											<span className="border-muted-foreground/30 mt-2 inline-block w-full border-b border-dashed">
												&nbsp;
											</span>
										</p>

										<p>
											<strong>Adresse du (des) consommateur(s) :</strong>
											<br />
											<span className="border-muted-foreground/30 mt-2 inline-block w-full border-b border-dashed">
												&nbsp;
											</span>
											<br />
											<span className="border-muted-foreground/30 mt-2 inline-block w-full border-b border-dashed">
												&nbsp;
											</span>
										</p>

										<p>
											<strong>Email :</strong>{" "}
											<span className="border-muted-foreground/30 inline-block min-w-[250px] border-b border-dashed">
												&nbsp;
											</span>
										</p>

										<p>
											<strong>Téléphone :</strong>{" "}
											<span className="border-muted-foreground/30 inline-block min-w-50 border-b border-dashed">
												&nbsp;
											</span>
										</p>

										<div className="space-y-2 pt-4">
											<p>
												<strong>Signature du (des) consommateur(s)</strong> (uniquement en cas de
												notification du présent formulaire sur papier) :
											</p>
											<div className="border-muted-foreground/30 h-20 border-b border-dashed" />
										</div>

										<p>
											<strong>Date :</strong>{" "}
											<span className="border-muted-foreground/30 inline-block min-w-50 border-b border-dashed">
												&nbsp;
											</span>
										</p>

										<p className="text-muted-foreground pt-4 text-xs italic">
											(*) Rayez la mention inutile
										</p>
									</div>
								</div>
							</div>

							{/* Modalités de retour */}
							<div className="space-y-4">
								<h2 className="text-xl font-semibold sm:text-2xl">
									Modalités de retour des articles
								</h2>

								<Alert>
									<Info className="h-4 w-4" />
									<AlertDescription>
										<ol className="list-inside list-decimal space-y-2 text-sm">
											<li>
												<strong>Notification</strong> : Envoyez-nous ce formulaire complété par
												email à{" "}
												<a href={`mailto:${contactEmail}`} className="underline">
													{contactEmail}
												</a>{" "}
												dans les 14 jours suivant la réception.
											</li>
											<li>
												<strong>Confirmation</strong> : Nous vous confirmerons la réception de votre
												demande et vous fournirons les instructions pour le retour.
											</li>
											<li>
												<strong>Retour des articles</strong> : Vous disposez de 14 jours
												supplémentaires après notification pour nous retourner les articles. Les
												frais de retour sont à votre charge.
											</li>
											<li>
												<strong>État des articles</strong> : Les bijoux doivent être retournés dans
												leur emballage d'origine, en parfait état, non portés, avec tous les
												accessoires éventuels.
											</li>
											<li>
												<strong>Remboursement</strong> : Nous procéderons au remboursement dans un
												délai de 14 jours suivant la réception des articles retournés, par le même
												moyen de paiement que celui utilisé lors de l'achat.
											</li>
										</ol>
									</AlertDescription>
								</Alert>
							</div>

							{/* Exceptions */}
							<div className="space-y-4">
								<h2 className="text-xl font-semibold sm:text-2xl">
									Exceptions au droit de rétractation
								</h2>
								<p>
									Conformément à l'article L221-28 du Code de la consommation, le droit de
									rétractation ne peut être exercé pour :
								</p>
								<ul className="ml-4 list-inside list-disc space-y-2">
									<li>
										Les bijoux personnalisés ou confectionnés sur mesure selon les spécifications du
										client
									</li>
								</ul>
							</div>

							{/* Informations complémentaires */}
							<div className="space-y-4">
								<h2 className="text-xl font-semibold sm:text-2xl">Informations complémentaires</h2>

								<div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-6">
									<p className="text-sm">
										<strong>Adresse de retour :</strong>
									</p>
									<div className="ml-4 text-sm">
										<p>Synclune - Service Retours</p>
										<p>77 Boulevard du Tertre</p>
										<p>44100 Nantes</p>
										<p>France</p>
									</div>
								</div>

								<div className="text-muted-foreground text-sm">
									Pour toute question concernant l'exercice de votre droit de rétractation,
									n'hésitez pas à nous contacter à{" "}
									<a href={`mailto:${contactEmail}`} className="underline">
										{contactEmail}
									</a>
									. Nous nous engageons à vous répondre dans les meilleurs délais.
								</div>
							</div>
						</section>

						{/* Actions */}
						<section className="bg-muted/30 space-y-4 rounded-lg p-6">
							<h3 className="text-lg font-semibold">Actions</h3>
							<div className="flex flex-wrap gap-3">
								<PrintButton />
							</div>
						</section>

						{/* Liens utiles */}
						<section className="bg-muted/30 space-y-4 rounded-lg p-6">
							<h3 className="text-lg font-semibold">Documents connexes</h3>
							<div className="flex flex-wrap gap-3">
								<Button asChild variant="outline" size="sm">
									<Link href="/cgv">Conditions Générales de Vente</Link>
								</Button>
								<Button asChild variant="outline" size="sm">
									<Link href="/confidentialite">Politique de Confidentialité</Link>
								</Button>
								<Button asChild variant="outline" size="sm">
									<a href={`mailto:${contactEmail}`}>Nous contacter</a>
								</Button>
							</div>
						</section>

						{/* Mention légale */}
						<p className="text-muted-foreground pt-8 text-center text-xs">
							Formulaire conforme à l'annexe de l'article R221-1 du Code de la consommation
						</p>
						<p className="text-muted-foreground pt-2 text-center text-xs italic">
							Dernière mise à jour : 10 mars 2026
						</p>
					</div>
				</div>
			</section>
		</>
	);
}
