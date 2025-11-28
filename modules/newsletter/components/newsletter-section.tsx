import { Sparkles } from "lucide-react";
import { NewsletterForm } from "./newsletter-form";

/**
 * Section newsletter pour la page d'accueil
 *
 * Affiche un appel à l'action pour s'inscrire à la newsletter
 * avec un formulaire d'inscription et un design plus engageant.
 */
export function NewsletterSection() {
	return (
		<section className="relative overflow-hidden py-16 sm:py-20 px-4">
			{/* Formes décoratives floues */}
			<div
				className="absolute top-8 left-10 w-24 h-24 rounded-full bg-primary/20 blur-3xl"
				aria-hidden="true"
			/>
			<div
				className="absolute bottom-8 right-16 w-32 h-32 rounded-full bg-amber-200/30 blur-3xl"
				aria-hidden="true"
			/>
			<div
				className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full bg-pink-200/25 blur-2xl"
				aria-hidden="true"
			/>

			<div className="relative z-10 max-w-md mx-auto text-center space-y-5">
				<h2 className="text-2xl/8 sm:text-3xl/9 font-serif tracking-normal antialiased text-foreground">
					Reste au courant des nouveautés{" "}
					<Sparkles
						className="inline w-5 h-5 text-primary align-middle"
						aria-hidden="true"
					/>
				</h2>

				<p className="text-base/7 tracking-normal antialiased text-muted-foreground max-w-sm mx-auto">
					Nouvelles pièces, tests de couleurs, coulisses de l'atelier...
					Je partage tout dans ma newsletter, une fois par mois maximum !
				</p>

				<div className="pt-2">
					<NewsletterForm />
				</div>

				<p className="text-xs text-muted-foreground/70 pt-2">
					Pas de spam, promis. Désinscription en un clic.
				</p>
			</div>
		</section>
	);
}
