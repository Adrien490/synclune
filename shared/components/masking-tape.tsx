import { cn } from "@/shared/utils/cn";

/**
 * Ruban de masking tape décoratif des cartes Atelier.
 *
 * Base partagée (couleur, ombre, coins, inertie aux clics) — la POSITION est
 * fournie par l'appelant. ⚠️ Réservé aux accents UNIQUES d'une surface (carton
 * de fin d'étal, note FAQ, galerie PDP, atelier…) : posé en série sur chaque
 * item d'une grille, il a été retiré le 2026-08-05 (ProductCard,
 * CollectionsCard, tirages du méga-menu, chapitres de /collections) — la
 * répétition saturait le storefront de rose. Ne pas le re-poser par item.
 *
 * `pointer-events-none` est non négociable : le tape se superpose au cadre
 * et ne doit jamais intercepter le stretched link (`::after` z-10).
 */
export function MaskingTape({ className, tint }: { className?: string; tint?: string }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"bg-primary/45 pointer-events-none absolute rounded-[2px] shadow-2xs",
				className,
			)}
			// `tint` sert aux appelants dont la teinte est calculée au rendu : le
			// carton de la galerie (`--piece-accent`) et les notes de l'atelier
			// (`STEP_ACCENTS[].tapeTint`). Style inline plutôt que classe, la
			// valeur n'est pas connue au build.
			style={tint ? { backgroundColor: tint } : undefined}
		/>
	);
}
