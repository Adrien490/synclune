import { Stagger } from "@/shared/components/animations";
import { Button } from "@/shared/components/ui/button";
import { ParticleSystem } from "@/shared/components/animations/particle-system";
import { SectionTitle } from "@/shared/components/ui/section-title";
import { IMAGES } from "@/shared/constants/images";
import { STEP_COLORS } from "@/shared/constants/process-steps";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import { CheckCircle, Hammer, Lightbulb, Pencil, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { ScrollProgressLine } from "./scroll-progress-line";

interface ProcessStep {
	icon: React.ReactNode;
	title: string;
	description: string;
	color: string;
	/** Animation CSS au hover du groupe */
	iconHoverClass: string;
}

// Étapes du processus créatif - données statiques
const processSteps: ProcessStep[] = [
	{
		icon: <Lightbulb className="w-6 h-6 transition-all duration-300" aria-hidden="true" />,
		title: "L'inspiration",
		description:
			"Fan de Pokémon, Van Gogh et Twilight... mes créations s'en inspirent ! L'idée naît souvent devant un film ou une belle couleur.",
		color: STEP_COLORS.secondary,
		iconHoverClass: "group-hover:[&_svg]:text-yellow-500 group-hover:[&_svg]:drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]",
	},
	{
		icon: <Pencil className="w-6 h-6 transition-all duration-300" aria-hidden="true" />,
		title: "Le dessin et la peinture",
		description:
			"Je dessine mes motifs sur du plastique fou, puis je passe à la peinture. C'est minutieux et ça demande de la concentration, mais j'adore cette étape !",
		color: STEP_COLORS.accent,
		iconHoverClass: "group-hover:[&_svg]:rotate-[-15deg]",
	},
	{
		icon: <Hammer className="w-6 h-6 transition-all duration-300" aria-hidden="true" />,
		title: "La cuisson et l'assemblage",
		description:
			"Cuisson au four, vernissage, montage sur les supports... Parfois il y a des surprises (le plastique fou, c'est pas toujours prévisible), mais ça fait partie du charme de l'artisanat",
		color: STEP_COLORS.secondary,
		iconHoverClass: "group-hover:[&_svg]:translate-y-[-2px] group-hover:[&_svg]:rotate-[-8deg]",
	},
	{
		icon: <CheckCircle className="w-6 h-6 transition-all duration-300" aria-hidden="true" />,
		title: "La touche finale",
		description:
			"Je polis, je vérifie chaque détail... Bon, je suis un peu perfectionniste ! Et voilà, ton bijou est prêt.",
		color: STEP_COLORS.accent,
		iconHoverClass: "group-hover:[&_svg]:text-green-500 group-hover:[&_svg]:scale-110",
	},
];

/**
 * Section Processus Créatif - Raconte l'histoire de création des bijoux
 *
 * Pattern : Server Component avec cache public car contenu 100% statique
 * - 4 étapes du processus (Inspiration → Esquisse → Création → Finition)
 * - Image d'atelier avec badge artisanal "Fait main à Nantes"
 * - Timeline visuelle avec animations stagger au scroll
 * - CTA vers page contact pour créations personnalisées
 * - Signature manuscrite de la créatrice (Dancing Script)
 *
 * Design Features:
 * - Ligne verticale décorative reliant les étapes (desktop)
 * - Halo rose/doré autour de l'image (effet "aura magique")
 * - Particules décoratives en arrière-plan (variant: minimal)
 * - Responsive : icônes desktop vs numéros mobile pour meilleur guidage
 *
 * @example
 * ```tsx
 * // Dans homepage
 * <CreativeProcess />
 * ```
 */
export async function CreativeProcess() {
	"use cache";
	cacheLife("reference"); // 7 jours pour contenu 100% statique

	return (
		<section
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.default}`}
			aria-labelledby="creative-process-title"
		>
			<div className="absolute inset-0" aria-hidden="true">
				<ParticleSystem
					count={8}
					colorPreset="dore"
					blur={[15, 45]}
					shape="diamond"
					opacity={[0.12, 0.35]}
					className="absolute inset-0"
				/>
			</div>

			<div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<header className="text-center mb-12 lg:mb-16">
					<SectionTitle id="creative-process-title">
						Comment je crée tes bijoux
					</SectionTitle>
					<p className="mt-4 text-lg/7 tracking-normal antialiased text-muted-foreground max-w-2xl mx-auto">
						De l'idée de départ jusqu'au bijou terminé, je te montre les
						coulisses de l'atelier.
					</p>
				</header>

				<div className="grid lg:grid-cols-2 gap-12 items-center">
					{/* Image atelier */}
					<div className="relative order-2 lg:order-1 h-64 sm:h-80 lg:h-full">
						<div className="relative h-full w-full overflow-hidden rounded-2xl bg-muted shadow-xl">
							<Image
								src={IMAGES.ATELIER}
								alt="Atelier de création Synclune - Bijoux colorés faits main à Nantes"
								fill
								className="object-cover object-center rounded-2xl saturate-[1.05] brightness-[1.02]"
								loading="lazy"
								quality={85}
								sizes="(max-width: 1024px) 100vw, 50vw"
							/>

							{/* Badge Fait main - contraste amélioré */}
							<div
								className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-secondary backdrop-blur-md border-2 border-secondary-foreground/20 rounded-full shadow-lg"
								aria-hidden="true"
							>
								<span className="text-xs/5 font-bold tracking-wider antialiased text-secondary-foreground drop-shadow-sm">
									Fait main à Nantes
								</span>
							</div>

							{/* Halo décoratif - Aura magique rose/doré */}
							<div
								className="absolute -inset-8 bg-linear-to-br from-primary/20 to-accent/20 rounded-2xl -z-10 blur-3xl"
								aria-hidden="true"
							/>
						</div>
					</div>

					{/* Timeline processus */}
					<div className="relative order-1 lg:order-2">
						<div className="relative space-y-8 sm:space-y-12 lg:space-y-16">
							{/* Ligne verticale animée au scroll */}
							<ScrollProgressLine />

							<Stagger
								role="list"
								stagger={0.15}
								y={35}
								delay={0}
								inView
								once={true}
							>
								{processSteps.map((step, index) => (
									<article
										key={index}
										role="listitem"
										className="flex items-start gap-4 group relative rounded-xl p-2 -m-2 transition-all duration-300 hover:bg-muted/30 hover:-translate-y-0.5"
									>
										{/* Accessibilité : numéro d'étape pour lecteurs d'écran */}
										<span className="sr-only">Étape {index + 1} :</span>

										{/* Desktop : Icônes dans cercles avec ligne verticale */}
										<div
											className={cn(
												"hidden sm:flex shrink-0 w-12 h-12 rounded-full border-2 items-center justify-center transition-all duration-300 relative z-20",
												step.color,
												// Animation hover subtile : légère rotation et scale
												"group-hover:scale-110 group-hover:-rotate-3",
												// Micro-interaction icône spécifique
												step.iconHoverClass,
												// Badge doré pour l'étape signature (index 2 = Création) - glow renforcé
												index === 2 && "shadow-lg shadow-secondary/40 ring-2 ring-secondary/20"
											)}
										>
											{step.icon}
										</div>

										{/* Mobile : Numéros colorés plus visibles (guidage progression) - 44px WCAG */}
										<div
											aria-hidden="true"
											className={cn(
												"flex sm:hidden shrink-0 w-11 h-11 rounded-full items-center justify-center font-bold text-lg transition-all duration-300",
												step.color,
												"group-hover:scale-110",
												// Badge doré pour l'étape signature (index 2 = Création) - glow renforcé
												index === 2 && "shadow-lg shadow-secondary/40 ring-2 ring-secondary/20"
											)}
										>
											{index + 1}
										</div>

										<div className="flex-1 pb-8">
											<h3 className="text-xl/7 font-semibold text-foreground mb-2 tracking-tight antialiased">
												{/* Numérotation visible seulement sur desktop (mobile a déjà le numéro dans le cercle) */}
												<span className="hidden sm:inline" aria-hidden="true">
													{index + 1}.{" "}
												</span>
												{step.title}
												{index === 2 && (
													<Sparkles
														className="inline-block w-4 h-4 ml-1.5 text-secondary"
														aria-hidden="true"
													/>
												)}
											</h3>
											<p className="text-base/7 tracking-normal antialiased text-muted-foreground">
												{step.description}
											</p>
										</div>
									</article>
								))}
							</Stagger>
						</div>

						{/* CTA vers Contact */}
						<div className="mt-8 py-6 px-4 -mx-4 bg-secondary/10 rounded-xl border border-secondary/30">
							<p className="text-sm text-muted-foreground mb-4 italic">
								Tu as une idée de bijou ? N'hésite pas à m'en parler,
								j'adore créer des pièces personnalisées !
							</p>
							<Button
								asChild
								variant="secondary"
								size="lg"
								className="w-full sm:w-auto shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group"
							>
								<Link
									href="/personnalisation"
									className="flex items-center justify-center gap-2"
								>
									<Sparkles
										size={18}
										className="group-hover:rotate-12 transition-transform duration-300"
										aria-hidden="true"
									/>
									Discutons de ton idée
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
