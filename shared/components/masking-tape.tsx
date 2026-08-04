import { cn } from "@/shared/utils/cn";

/**
 * Ruban de masking tape décoratif des cartes Atelier.
 *
 * Base partagée (couleur, ombre, coins, inertie aux clics) — la POSITION est
 * fournie par l'appelant, et les deux silhouettes sont volontairement
 * distinctes : centré en haut sur ProductCard (le tirage polaroid épinglé),
 * en coin sur CollectionCard (la planche-contact scotchée par l'angle).
 *
 * `pointer-events-none` est non négociable : le tape se superpose au cadre
 * et ne doit jamais intercepter le stretched link (`::after` z-10).
 */
export function MaskingTape({ className }: { className?: string }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"bg-primary/45 pointer-events-none absolute rounded-[2px] shadow-2xs",
				className,
			)}
		/>
	);
}
