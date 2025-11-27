import { cn } from "@/shared/utils/cn";

interface DecorativeIconProps {
	/**
	 * L'emoji à afficher
	 */
	emoji: string;
	/**
	 * Description accessible pour les lecteurs d'écran
	 */
	label: string;
	/**
	 * Classes CSS additionnelles
	 */
	className?: string;
}

/**
 * Composant pour afficher des émojis de manière accessible
 * Ajoute automatiquement role="img" et aria-label pour les lecteurs d'écran
 */
export function DecorativeIcon({ emoji, label, className }: DecorativeIconProps) {
	return (
		<span role="img" aria-label={label} className={cn(className)}>
			{emoji}
		</span>
	);
}
