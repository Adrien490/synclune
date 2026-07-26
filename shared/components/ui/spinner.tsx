import { cn } from "@/shared/utils/cn";
import { Loader2Icon } from "lucide-react";

interface SpinnerProps extends React.ComponentProps<"svg"> {
	/**
	 * Libellé annoncé. Défaut « Chargement ».
	 *
	 * Surchargeable pour préciser CE QUI charge : plusieurs spinners sur une même
	 * page annonçaient tous « Chargement » sans distinction.
	 */
	label?: string;
}

function Spinner({ className, label = "Chargement", ...props }: SpinnerProps) {
	return (
		<span role="status" aria-label={label}>
			<Loader2Icon
				aria-hidden="true"
				// `motion-safe:` — l'animation était inconditionnelle, contrairement à
				// `Skeleton` (`motion-safe:animate-pulse`). Sous `prefers-reduced-motion`,
				// l'icône reste visible et statique : le rôle `status` porte déjà
				// l'information, la rotation n'était que décorative.
				className={cn("size-4 motion-safe:animate-spin", className)}
				{...props}
			/>
		</span>
	);
}

export { Spinner };
