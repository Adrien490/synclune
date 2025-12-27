import { Fade } from "@/shared/components/animations/fade";
import { SectionTitle } from "@/shared/components/section-title";
import { cn } from "@/shared/utils/cn";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { NewsletterForm } from "./newsletter-form";

/**
 * Section newsletter pour la page d'accueil
 *
 * Affiche un appel à l'action pour s'inscrire à la newsletter
 * avec un formulaire d'inscription et un design cohérent avec les autres sections.
 */
export function NewsletterSection() {
	return (
		<section
			aria-labelledby="newsletter-title"
			aria-describedby="newsletter-subtitle"
			className={cn("relative overflow-hidden", SECTION_SPACING.section)}
		>
			{/* Formes décoratives floues - hidden on mobile for INP */}
			<div
				className="absolute top-8 left-10 w-24 h-24 rounded-full bg-primary/20 blur-3xl hidden md:block"
				aria-hidden="true"
			/>
			<div
				className="absolute bottom-8 right-16 w-32 h-32 rounded-full bg-amber-200/30 blur-3xl hidden md:block"
				aria-hidden="true"
			/>
			<div
				className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full bg-pink-200/25 blur-2xl hidden md:block"
				aria-hidden="true"
			/>

			<div className={cn("relative z-10", CONTAINER_CLASS)}>
				{/* Header pattern standard */}
				<header className="mb-8 text-center lg:mb-12">
					<Fade y={20} duration={0.6}>
						<SectionTitle id="newsletter-title">
							Reste au courant des nouveautés
						</SectionTitle>
					</Fade>
					<Fade y={10} delay={0.1} duration={0.6}>
						<p
							id="newsletter-subtitle"
							className="mt-4 text-lg/7 tracking-normal antialiased text-muted-foreground max-w-2xl mx-auto"
						>
							Nouvelles pièces, tests de couleurs, coulisses de l'atelier...
							Je partage tout dans ma newsletter, une fois par mois maximum !
						</p>
					</Fade>
				</header>

				{/* Formulaire centré avec max-width réduit */}
				<Fade y={15} delay={0.2} duration={0.6}>
					<div className="max-w-md mx-auto">
						<NewsletterForm />
					</div>
				</Fade>

				{/* Assurance anti-spam */}
				<Fade y={10} delay={0.3} duration={0.6}>
					<p className="mt-6 text-center text-sm text-muted-foreground/70">
						Pas de spam, promis. Désinscription en un clic.
					</p>
				</Fade>
			</div>
		</section>
	);
}
