import { Reveal } from "@/shared/components/animations";
import { SectionTitle } from "@/shared/components/ui/section-title";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import { ArrowRight, Heart, Leaf, Palette, Sparkles } from "lucide-react";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";

interface ValuePillar {
	icon: React.ReactNode;
	title: string;
	description: string;
	bgColor: string;
	iconColor: string;
	cta?: {
		label: string;
		href: string;
	};
}

// Données statiques constantes - parfait pour use cache
// Couleurs variées pour refléter l'identité "bijoux colorés"
const valuePillars: ValuePillar[] = [
	{
		icon: <Sparkles className="w-8 h-8" aria-hidden="true" />,
		title: "100% fait main",
		description:
			"Chaque détail est travaillé à la main dans mon atelier nantais. Résultat ? Un bijou unique qui ne ressemble à aucun autre.",
		bgColor: "bg-pink-100/60 border-pink-300/50",
		iconColor: "text-pink-700",
	},
	{
		icon: <Leaf className="w-8 h-8" aria-hidden="true" />,
		title: "Des matériaux qui durent",
		description:
			"Acier inoxydable, perles de qualité... Des matériaux qui tiennent vraiment dans le temps pour que tes bijoux t'accompagnent longtemps.",
		bgColor: "bg-emerald-100/60 border-emerald-300/50",
		iconColor: "text-emerald-700",
	},
	{
		icon: <Heart className="w-8 h-8" aria-hidden="true" />,
		title: "Éditions limitées",
		description:
			"Chaque modèle existe en 5 à 10 exemplaires maximum. Tu ne croiseras pas dix personnes avec le même bijou !",
		bgColor: "bg-amber-100/60 border-amber-300/50",
		iconColor: "text-amber-700",
	},
	{
		icon: <Palette className="w-8 h-8" aria-hidden="true" />,
		title: "Créations personnalisées",
		description:
			"Une idée de bijou ? Dis-moi tout ! J'adore créer des pièces sur-mesure.",
		bgColor: "bg-violet-100/60 border-violet-300/50",
		iconColor: "text-violet-700",
		cta: {
			label: "Créons ton bijou ensemble",
			href: "/personnalisation",
		},
	},
];

/**
 * Section "Pourquoi Synclune" - Contenu statique parfait pour le cache
 * Utilise "use cache" car:
 * - Contenu jamais modifié (valeurs de la marque)
 * - Pas de données dynamiques utilisateur
 * - Partagé entre tous les visiteurs
 * - Améliore les performances de la page d'accueil
 */
export async function WhySynclune() {
	"use cache";
	cacheLife("reference");
	cacheTag("why-synclune");

	return (
		<section
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.default}`}
			aria-labelledby="why-synclune-title"
			aria-describedby="why-synclune-description"
			itemScope
			itemType="https://schema.org/AboutPage"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<header className="text-center mb-12 lg:mb-16">
					<SectionTitle id="why-synclune-title" itemProp="name">
						Pourquoi choisir mes bijoux ?
					</SectionTitle>
					<p
						id="why-synclune-description"
						itemProp="description"
						className="mt-4 text-lg/7 tracking-normal antialiased text-foreground/70 max-w-2xl mx-auto break-words"
					>
						Depuis mon atelier nantais, je crée des bijoux colorés, un par un, à la main
						<Heart
							size={22}
							fill="currentColor"
							className="text-primary inline align-middle"
							aria-label="Amour et passion"
						/>
					</p>
				</header>

				<Reveal
					className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
					delay={0.15}
					duration={0.6}
					y={25}
					once={true}
				>
					{valuePillars.map((pillar, index) => (
						<article
							key={index}
							tabIndex={0}
							role="article"
							aria-labelledby={`pillar-title-${index}`}
							className={cn(
								"group text-center p-6 rounded-xl bg-card border shadow-sm",
								"hover:shadow-lg hover:border-secondary/40",
								"transition-all duration-300 hover:-translate-y-1",
								// Focus clavier accessible
								"focus-visible:outline-2 focus-visible:outline-offset-4",
								"focus-visible:outline-secondary focus-visible:ring-4 focus-visible:ring-secondary/20"
							)}
						>
							<div
								className={`inline-flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full border ${pillar.bgColor} transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}
							>
								<div className={pillar.iconColor}>{pillar.icon}</div>
							</div>
							<h3
								id={`pillar-title-${index}`}
								className="text-xl/7 font-semibold text-foreground mb-3 tracking-tight antialiased hyphens-none break-words"
							>
								{pillar.title}
								{/* Astérisque doré décoratif pour "Pièces uniques" */}
								{pillar.title === "Pièces uniques" && (
									<span
										className="ml-1 text-secondary text-base inline-block animate-sparkle-pulse"
										aria-hidden="true"
									>
										✦
									</span>
								)}
							</h3>
							<p className="text-base/7 tracking-normal antialiased text-foreground/70 break-words">
								{pillar.description}
							</p>
							{/* CTA optionnel */}
							{pillar.cta && (
								<Link
									href={pillar.cta.href}
									className="mt-4 inline-flex items-center gap-2 text-sm/6 tracking-normal antialiased font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors group/cta px-3 py-1.5 rounded-md"
								>
									{pillar.cta.label}
									<ArrowRight
										className="w-4 h-4 group-hover/cta:translate-x-1 transition-transform duration-300"
										aria-hidden="true"
									/>
								</Link>
							)}
						</article>
					))}
				</Reveal>
			</div>
		</section>
	);
}
