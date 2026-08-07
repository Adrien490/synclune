import { CheckCircleIcon } from "@phosphor-icons/react/ssr";
import { slugify } from "@/shared/utils/generate-slug";

/**
 * Les quatre accents de marque, dans l'ordre du tunnel.
 *
 * Ce ne sont pas des couleurs choisies ici : ce sont les valeurs de
 * `[data-accent]` (`app/styles/section-accents.css`), qui exposent
 * `--section-accent` et `--section-soft`. On ne redéclare donc aucune teinte,
 * et le rose reste dérivé de `--primary` sans doublon.
 */
type CheckoutSectionAccent = "rose" | "lavender" | "mint" | "sun";

interface CheckoutSectionProps {
	title: string;
	/** Accent de l'étape — la progression est portée par la couleur, pas décorée. */
	accent: CheckoutSectionAccent;
	/** Affiche le repère « complété ». Réservé aux sections qui portent une saisie. */
	isComplete?: boolean;
	children: React.ReactNode;
}

/**
 * Une étape du tunnel, rendue comme un plan de travail posé sur l'établi.
 *
 * La section rendait auparavant un `<h2>` et du `gap`, **sans aucune surface**,
 * pendant que le récapitulatif était une `Card` blanche à ombre portée : la
 * hiérarchie visuelle désignait donc le résumé comme l'objet principal de la
 * page, alors que la seule chose à y faire est de remplir le formulaire. Le
 * poids est inversé ici, et allégé dans `CheckoutSummary`.
 *
 * ⚠️ Ce changement fait tomber la première assertion de
 * `checkout-loading-parity.regression.test.ts` — c'est voulu, et c'est le
 * signal : `app/paiement/loading.tsx` doit bouger dans le MÊME commit, sinon le
 * squelette annonce quatre sections nues avant d'afficher quatre surfaces.
 *
 * ⚠️ Le filet d'accent est un ÉLÉMENT, pas un `border-left-color` : `bg-(--var)`
 * est la forme déjà employée dans le dépôt (`admin-menu-sheet`, `navbar-wrapper`),
 * là où `border-l-(--var)` laisserait Tailwind arbitrer entre couleur et largeur.
 * Pas d'`overflow-hidden` sur le conteneur non plus — il rognerait l'anneau de
 * focus des champs, qui déborde de 5px.
 */
export function CheckoutSection({ title, accent, isComplete, children }: CheckoutSectionProps) {
	// Nommer la `<section>` par son propre titre : une `<section>` SANS nom
	// accessible n'est pas exposée comme landmark `region`. Les quatre étapes du
	// tunnel n'étaient donc navigables que par les titres, jamais par les régions
	// — alors qu'elles sont précisément la structure de la page.
	//
	// Id DÉRIVÉ du titre plutôt que `useId()` : les quatre titres du tunnel sont
	// distincts par construction, et ça garde le composant utilisable sans hook.
	const headingId = `checkout-section-${slugify(title)}`;

	return (
		<section
			data-accent={accent}
			aria-labelledby={headingId}
			className="border-border bg-card flex scroll-mt-24 scroll-mb-32 rounded-lg border shadow-sm md:scroll-mt-28 lg:scroll-mb-0"
		>
			<span aria-hidden="true" className="w-[3px] shrink-0 rounded-l-lg bg-(--section-accent)" />
			<div className="min-w-0 flex-1 space-y-5 p-5 sm:p-6">
				<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<h2 id={headingId} className="font-display text-lg font-medium tracking-wide sm:text-xl">
						{title}
					</h2>
					{isComplete && (
						/*
						 * Icône + mot, jamais la couleur seule (WCAG 1.4.1). `--success`
						 * est à 5,03:1 sur le fond : lisible en encre, contrairement aux
						 * quatre accents de marque, qui ne portent que des surfaces.
						 */
						<span className="text-success ml-auto inline-flex items-center gap-1 text-sm">
							<CheckCircleIcon className="size-4" aria-hidden="true" />
							complété
						</span>
					)}
				</div>
				{children}
			</div>
		</section>
	);
}
