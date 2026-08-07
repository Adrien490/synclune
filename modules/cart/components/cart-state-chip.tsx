import { cn } from "@/shared/utils/cn";

/**
 * Pastille d'état d'une ligne de panier (rupture, indisponible, stock bas,
 * dernière pièce).
 *
 * ⚠️ **Le texte est en `--foreground`, jamais dans la couleur de l'état.**
 * Les tons d'état du projet sont calibrés comme couleurs de FOND, pas de texte :
 * `--warning` posé en `text-warning` sur `--background` donne **2,19:1** et
 * `--destructive` sur `bg-destructive/10` **3,81:1** — les deux sous le seuil AA
 * de 4,5:1, sur l'information la plus décisive du panier (« il n'en reste
 * qu'un »). Ici le fond teinté remonte le texte noir à ≈17:1, et la couleur ne
 * porte plus que de la redondance.
 *
 * La **barre pleine à gauche** n'est pas décorative : c'est la forme qui
 * distingue les deux tons pour qui ne perçoit pas la différence de couleur
 * (WCAG 1.4.1 — un état qui ne se distingue QUE par la couleur n'existe pas).
 */
type CartStateTone = "danger" | "warning";

const TONE_CLASSES: Record<CartStateTone, string> = {
	danger: "border-l-destructive bg-destructive/15",
	warning: "border-l-warning bg-warning/25",
};

interface CartStateChipProps {
	tone: CartStateTone;
	children: React.ReactNode;
	className?: string;
}

export function CartStateChip({ tone, children, className }: CartStateChipProps) {
	return (
		<span
			data-slot="cart-state-chip"
			data-tone={tone}
			className={cn(
				"text-foreground inline-flex items-center rounded-r-sm border-l-[3px] px-2 py-0.5 text-xs font-semibold",
				TONE_CLASSES[tone],
				className,
			)}
		>
			{children}
		</span>
	);
}
