import { cva, type VariantProps } from "class-variance-authority";
import { SpinnerIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/shared/utils/cn";

// `motion-safe:` — l'animation était inconditionnelle, contrairement à
// `Skeleton` (`motion-safe:animate-pulse`). Sous `prefers-reduced-motion`,
// l'icône reste visible et statique : le rôle `status` porte déjà
// l'information, la rotation n'était que décorative.
const spinnerVariants = cva("motion-safe:animate-spin", {
	variants: {
		size: {
			sm: "size-3.5",
			default: "size-4",
			lg: "size-5",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

interface SpinnerProps extends React.ComponentProps<"svg">, VariantProps<typeof spinnerVariants> {
	/**
	 * Libellé annoncé. Défaut « Chargement ».
	 *
	 * Surchargeable pour préciser CE QUI charge : plusieurs spinners sur une même
	 * page annonçaient tous « Chargement » sans distinction.
	 */
	label?: string;
	/**
	 * Rend l'icône seule, sans `role="status"` ni libellé — pour un spinner
	 * DANS un élément qui annonce déjà son état (bouton `aria-busy`, zone
	 * `role="status"` parente). Évite la double annonce aux lecteurs d'écran.
	 */
	presentational?: boolean;
}

function Spinner({
	className,
	size,
	label = "Chargement",
	presentational = false,
	...props
}: SpinnerProps) {
	const icon = (
		<SpinnerIcon
			aria-hidden="true"
			data-slot="spinner"
			className={cn(spinnerVariants({ size }), className)}
			{...props}
		/>
	);

	if (presentational) return icon;

	return (
		<span role="status" aria-label={label}>
			{icon}
		</span>
	);
}

export { Spinner };
