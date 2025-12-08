import { Fade, Reveal } from "@/shared/components/animations";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { BRAND } from "@/shared/constants/brand";
import { getAboutPageFullSchema } from "@/shared/constants/seo-config";
import { ArrowRight, Camera, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "À propos | L'histoire de Synclune",
	description:
		"Léane, créatrice de bijoux artisanaux à Nantes. Découvrez son histoire, ses inspirations (Pokémon, Van Gogh, Twilight) et le processus créatif derrière chaque pièce unique.",
	keywords:
		"bijoux artisanaux Nantes, créatrice bijoux, bijoux faits main, bijoux colorés, Léane Synclune",
	alternates: {
		canonical: "/a-propos",
	},
	openGraph: {
		title: "À propos | L'histoire de Synclune - Créatrice de bijoux à Nantes",
		description:
			"Plongez dans l'univers de Léane, créatrice passionnée. Bijoux artisanaux colorés pour occasions particulières.",
		url: "https://synclune.fr/a-propos",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "À propos | L'histoire de Synclune",
		description:
			"Léane, créatrice de bijoux artisanaux à Nantes. Inspirations Pokémon, Van Gogh, Twilight...",
	},
};

export default function AProposPage() {
	const aboutPageSchema = getAboutPageFullSchema();

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(aboutPageSchema),
				}}
			/>

			<div className="min-h-screen">
				<PageHeader
					title="À propos de Synclune"
					description="L'histoire d'une créatrice qui transforme ses inspirations en bijoux uniques"
					breadcrumbs={[{ label: "À propos", href: "/a-propos" }]}
				/>

				{/* Contenu principal */}
				<section className={`bg-background ${SECTION_SPACING.compact}`}>
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
						{/* Qui je suis - Layout avec image */}
						<Reveal y={20} duration={0.6} once>
							<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-12 items-start">
								{/* Placeholder image */}
								<div className="flex justify-center lg:justify-start">
									<div className="relative w-64 h-80 rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-3 overflow-hidden">
										<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
											<Camera className="w-8 h-8 text-primary/60" aria-hidden="true" />
										</div>
										<span className="text-sm text-muted-foreground font-medium">
											Photo à venir
										</span>
									</div>
								</div>

								{/* Texte */}
								<div className="space-y-6">
									{/* Badge contextuel */}
									<span className="inline-block text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
										Mon histoire
									</span>

									<h2 className="text-2xl font-light text-foreground">
										Léane, créatrice de bijoux à Nantes
									</h2>
								<div className="prose prose-lg max-w-none">
									<p className="text-muted-foreground leading-relaxed">
										Moi c'est Léane, je crée des bijoux à Nantes dans mon petit
										atelier. Ici, chaque création est une histoire : un Pikachu
										miniature dessiné au crayon de couleur, une nuit étoilée de Van
										Gogh peinte sur du plastique fou, des pampilles interchangeables
										pour changer de style selon son humeur.
									</p>
									<p className="text-muted-foreground leading-relaxed">
										<strong className="text-foreground">Synclune</strong>, c'est la
										contraction de "Sync" et "Lune" — mes créations suivent mes
										phases créatives comme les phases lunaires. Chaque bijou capture
										un moment d'inspiration unique et éphémère, entre perles, résine
										et paillettes.
									</p>
									<p className="text-muted-foreground leading-relaxed">
										En fait, je crée des bijoux depuis très longtemps. Au début, je
										les faisais juste pour moi et mes proches. Puis j'ai commencé
										sur TikTok, et l'envie de partager tout ça est devenue de plus
										en plus forte. Voir vos réactions, vos messages, ça m'a donné
										envie de transformer cette passion en quelque chose de plus
										grand.
									</p>
								</div>

								{/* Signature */}
								<p className="font-script text-xl text-foreground pt-2">
									— Léane
								</p>
							</div>
						</div>
					</Reveal>

					{/* Inspirations */}
					<Fade y={12} delay={0.1} duration={0.5}>
						<div className="space-y-4">
							<h3 className="text-xl font-medium text-foreground flex items-center gap-2">
								<Sparkles className="w-5 h-5 text-muted-foreground" />
								Mes inspirations
							</h3>
							<div className="prose max-w-none">
								<p className="text-muted-foreground leading-relaxed">
									Fan de <strong>Pokémon</strong> depuis toujours ? Les colliers
									Pokéball et pendentifs en forme de baies me rappellent les
									heures passées sur ma Game Boy. Amateur d'art ? Les bagues
									inspirées de <strong>La Nuit Étoilée</strong> de Van Gogh sont
									peintes à la main, détail par détail.
								</p>
								<p className="text-muted-foreground leading-relaxed">
									Twilight, Skyrim, des faux ongles recyclés en colliers, des
									papilloux pour des occasions spéciales... Je ne me limite jamais.
									Ma philosophie : si ça m'inspire et que je peux le transformer en
									bijou portable, je le fais.
								</p>
							</div>
						</div>
					</Fade>

					{/* Réseaux sociaux */}
					<Fade y={12} delay={0.2} duration={0.5}>
						<div className="space-y-4 pt-4">
							<p className="text-sm text-muted-foreground font-medium">
								Suivez mes créations en avant-première
							</p>
							<div className="flex flex-col sm:flex-row gap-3">
								<Link
									href={BRAND.social.instagram.url}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-3 px-5 py-3 rounded-lg border border-border bg-background hover:bg-accent hover:border-primary transition-all shadow-sm hover:shadow-md"
								>
									<InstagramIcon size={20} className="text-foreground shrink-0" decorative />
									<div className="flex flex-col items-start">
										<span className="text-sm font-semibold">
											{BRAND.social.instagram.handle}
										</span>
										<span className="text-xs text-muted-foreground">
											Nouvelles créations chaque semaine
										</span>
									</div>
								</Link>

								<Link
									href={BRAND.social.tiktok.url}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-3 px-5 py-3 rounded-lg border border-border bg-background hover:bg-accent hover:border-primary transition-all shadow-sm hover:shadow-md"
								>
									<TikTokIcon size={20} className="text-foreground shrink-0" decorative />
									<div className="flex flex-col items-start">
										<span className="text-sm font-semibold">
											{BRAND.social.tiktok.handle}
										</span>
										<span className="text-xs text-muted-foreground">
											Coulisses & processus créatif
										</span>
									</div>
								</Link>
							</div>
						</div>
					</Fade>

					{/* CTA */}
					<Reveal y={20} delay={0.1} duration={0.6} once>
						<div className="pt-8 space-y-6 text-center border-t border-border">
							<div className="space-y-3">
								<h2 className="text-2xl font-light text-foreground">
									Prêt à porter une pièce unique ?
								</h2>
								<p className="text-base text-muted-foreground leading-relaxed">
									Chaque création existe en{" "}
									<strong className="text-foreground">
										5 à 10 exemplaires maximum
									</strong>
									. Une fois épuisée, elle ne sera plus reproduite.
								</p>
							</div>

							<div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
								<Button
									asChild
									size="lg"
									className="shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group"
								>
									<Link
										href="/produits"
										className="flex items-center gap-2"
									>
										Voir les créations
										<ArrowRight
											className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
											aria-hidden="true"
										/>
									</Link>
								</Button>
								<Button
									asChild
									size="lg"
									variant="secondary"
									className="shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
								>
									<Link href="/personnalisation">
										Commander un bijou personnalisé
									</Link>
								</Button>
							</div>
						</div>
					</Reveal>
					</div>
				</section>
			</div>
		</>
	);
}
