import type { FabKey } from "@/shared/constants/fab";

/**
 * Contenu du tooltip pour les FAB
 */
export interface FabTooltipContent {
	/** Titre du tooltip (gras) */
	title: string;
	/** Description optionnelle (sous le titre) */
	description?: string;
}

/**
 * Props pour le composant Fab
 */
export interface FabProps {
	/** Cle du FAB pour la persistance de visibilite */
	fabKey: FabKey;
	/** Etat initial de visibilite (depuis le cookie serveur) */
	initialHidden?: boolean;
	/** Icone a afficher dans le FAB */
	icon: React.ReactNode;
	/** Badge optionnel affiche en haut a droite du FAB */
	badge?: React.ReactNode;
	/** Contenu du tooltip principal */
	tooltip: FabTooltipContent;
	/** Contenu optionnel a afficher a cote du FAB */
	children?: React.ReactNode;
	/** Label accessible pour le bouton principal */
	ariaLabel: string;
	/** Description accessible (sr-only) */
	ariaDescription?: string;
	/** Tooltip pour le bouton "afficher" (mode cache) */
	showTooltip?: string;
	/** Tooltip pour le bouton "masquer" */
	hideTooltip?: string;
	/** Masquer sur mobile (defaut: true) */
	hideOnMobile?: boolean;
	/** Classes CSS additionnelles pour le bouton principal */
	className?: string;
	/** Classes CSS additionnelles pour le container (positionnement) */
	containerClassName?: string;
	/** Valeur aria-haspopup du bouton principal (defaut: undefined = pas d'attribut) */
	ariaHasPopup?: React.AriaAttributes["aria-haspopup"];
	/** Lien pour le bouton principal (rend un <a> au lieu d'un <button>) */
	href?: string;
	/** Callback appele au click sur le bouton principal */
	onClick?: () => void;
}

/**
 * Action disponible dans le Speed Dial
 */
export interface SpeedDialAction {
	/** Identifiant unique de l'action */
	id: string;
	/** Icone de l'action */
	icon: React.ReactNode;
	/** Label de l'action (affiche dans le tooltip) */
	label: string;
	/** Callback au click (pour actions custom comme dialog) */
	onClick?: () => void;
	/** Lien de navigation (alternatif a onClick) */
	href?: string;
	/** Variante visuelle */
	variant?: "default" | "secondary";
}

/**
 * Props pour le composant SpeedDialFab
 */
export interface SpeedDialFabProps {
	/** Cle du FAB pour la persistance de visibilite */
	fabKey: FabKey;
	/** Etat initial de visibilite (depuis le cookie serveur) */
	initialHidden?: boolean;
	/** Icone principale du FAB (defaut: Plus) */
	mainIcon?: React.ReactNode;
	/** Icone quand ouvert (defaut: X) */
	openIcon?: React.ReactNode;
	/** Contenu du tooltip principal */
	tooltip: FabTooltipContent;
	/** Actions disponibles dans le speed dial */
	actions: SpeedDialAction[];
	/** Label accessible pour le bouton principal */
	ariaLabel: string;
	/** Description accessible (sr-only) */
	ariaDescription?: string;
	/** Tooltip pour le bouton "afficher" (mode cache) */
	showTooltip?: string;
	/** Tooltip pour le bouton "masquer" */
	hideTooltip?: string;
	/** Masquer sur mobile (defaut: true) */
	hideOnMobile?: boolean;
	/** Classes CSS additionnelles pour le bouton principal */
	className?: string;
}
