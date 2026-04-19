import { cva } from "class-variance-authority";

/**
 * Labels centralisés pour l'internationalisation (fr-FR)
 */
export const MULTI_SELECT_LABELS = {
	placeholder: "Sélectionner",
	selectAll: "Tout sélectionner",
	clearAll: "Effacer",
	close: "Fermer",
	finish: "Terminer",
	noOptions: "Aucune option disponible",
	moreItems: (count: number) => `+ ${count}`,
	removeItem: (label: string) => `Retirer ${label}`,
	removeExtra: (count: number) => `Retirer les ${count} options supplémentaires`,
	clearSelection: (count: number) => `Effacer les ${count} options sélectionnées`,
	selectionCount: (count: number) => `${count} sélectionné${count > 1 ? "s" : ""}`,
	ariaSelected: (label: string, count: number, total: number) =>
		`${label} sélectionné. ${count} sur ${total} options.`,
	ariaRemoved: (count: number, total: number) => `Option retirée. ${count} sur ${total} options.`,
	ariaListOpen: (total: number) => `Liste ouverte. ${total} options.`,
	ariaListClosed: "Liste fermée.",
	ariaNoSelection: "Aucune option sélectionnée",
	ariaComboboxLabel: (count: number, total: number, placeholder: string) =>
		`Sélection multiple : ${count} sur ${total} options sélectionnées. ${placeholder}`,
	ariaSelectAllOptions: (count: number) => `Sélectionner les ${count} options`,
	ariaOptionsLabel: "Options disponibles",
	ariaCloseDrawer: "Fermer",
} as const;

/**
 * Variants CVA pour les badges du MultiSelect
 */
export const multiSelectVariants = cva(
	"m-0.5 motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]",
	{
		variants: {
			variant: {
				default: "border-foreground/10 text-foreground bg-card hover:bg-card/80",
				secondary:
					"border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80",
				destructive:
					"border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);
