import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { multiSelectVariants } from "./constants";

/**
 * Option individuelle pour le MultiSelect
 */
export interface MultiSelectOption {
	/** Valeur unique associée à l'option */
	value: string;
	/** Texte affiché pour l'option */
	label: string;
	/** Composant d'icône optionnel */
	icon?: React.ComponentType<{ className?: string }>;
	/** Option désactivée */
	disabled?: boolean;
}

/**
 * Props pour le composant MultiSelect
 */
export interface MultiSelectProps
	extends
		Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "defaultValue">,
		VariantProps<typeof multiSelectVariants> {
	/** Options disponibles (tableau plat) */
	options: MultiSelectOption[];
	/** Callback lors du changement de sélection */
	onValueChange: (value: string[]) => void;
	/** Valeurs sélectionnées par défaut */
	defaultValue?: string[];
	/** Placeholder (défaut: "Sélectionner") */
	placeholder?: string;
	/** Nombre maximum de badges affichés dans le trigger (défaut: 3) */
	maxCount?: number;
	/** Masquer l'option "Tout sélectionner" (défaut: false) */
	hideSelectAll?: boolean;
	/** Désactiver le composant (défaut: false) */
	disabled?: boolean;
	/** Classes CSS additionnelles sur le trigger */
	className?: string;
}

/**
 * Méthodes exposées via ref
 */
export interface MultiSelectRef {
	/** Reset aux valeurs par défaut */
	reset: () => void;
	/** Effacer toutes les sélections */
	clear: () => void;
	/** Focus le trigger */
	focus: () => void;
	/** Obtenir les valeurs sélectionnées */
	getValues: () => string[];
	/** Définir les valeurs sélectionnées */
	setValues: (values: string[]) => void;
}
