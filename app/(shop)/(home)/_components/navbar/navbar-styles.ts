import { cn } from "@/shared/utils/cn";

/** Shared base classes for icon buttons in the navbar (desktop + mobile trigger) */
export const iconButtonClassName = cn(
	// `rounded-md` et non `rounded-xl` : c'est le rayon des cartes Atelier
	// (`CARD_SURFACE_POLAROID`). Le header était la dernière surface du storefront
	// à garder son propre vocabulaire de formes.
	"relative items-center justify-center size-11 rounded-md group",
	"text-muted-foreground can-hover:hover:bg-accent can-hover:hover:text-accent-foreground",
	"ease-out motion-safe:transition-[transform,color,background-color] motion-safe:duration-[var(--duration-slow)]",
	"motion-safe:can-hover:hover:scale-105 motion-safe:active:scale-95",
	"focus-ring",
);

/**
 * Approximate Vaul slide animation duration — identique à l'entrée et à la
 * sortie. Sert de filet de sécurité quand on diffère un overlay de suite
 * (dialogue de déconnexion) ou la gestion du focus jusqu'à la fin d'une
 * transition du sheet. Source: Vaul defaults (~300ms) + marge.
 *
 * Nom volontairement neutre : la constante est utilisée pour l'ENTRÉE
 * (`menu-sheet-nav`, focus après ouverture) autant que pour la SORTIE
 * (`menu-sheet`, dialogue de déconnexion différé). L'ancien nom
 * `VAUL_EXIT_DURATION_MS` laissait croire à un bug sur le call site d'entrée.
 */
export const VAUL_TRANSITION_DURATION_MS = 450;
