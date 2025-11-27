import { NewsletterForm } from "./newsletter-form";

/**
 * Section newsletter pour la page d'accueil
 *
 * Affiche un appel à l'action pour s'inscrire à la newsletter
 * avec un formulaire d'inscription.
 */
export function NewsletterSection() {
	return (
		<section className="relative bg-background py-16 px-4">
			<div className="max-w-md mx-auto text-center space-y-4">
				<h2 className="text-xl/7 font-serif tracking-normal antialiased text-foreground">
					Tu veux suivre mes créations ?
				</h2>
				<p className="text-sm/6 tracking-normal antialiased text-muted-foreground">
					Nouvelles pièces, tests de couleurs, coulisses de l'atelier... Je partage tout dans ma newsletter ! Bye !
				</p>
				<NewsletterForm />
			</div>
		</section>
	);
}
