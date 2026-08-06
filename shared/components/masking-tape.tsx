import { cn } from "@/shared/utils/cn";

/**
 * Ruban de masking tape décoratif des cartes Atelier.
 *
 * Base partagée (couleur, ombre, coins, inertie aux clics) — la POSITION est
 * fournie par l'appelant. ⚠️ Réservé aux accents UNIQUES d'une surface (carton
 * de fin d'étal, note FAQ, galerie PDP, tirage de l'atelier…) : posé en série
 * sur chaque item d'une grille, il a été retiré le 2026-08-05 (ProductCard,
 * CollectionsCard, tirages du méga-menu, chapitres de /collections) — la
 * répétition saturait le storefront de rose. Ne pas le re-poser par item.
 *
 * ⚠️ Le 2026-08-06, la **dernière** exception est tombée : les 4 notes du
 * processus de l'atelier (grille) et le papier de la confidence. L'atelier
 * concentrait à lui seul 6 des 7 rubans de la landing — « habitat scrapbook du
 * motif » ne suffit pas à racheter la série. Il reste UN ruban sur `/` : le
 * tirage polaroid de Léane, où la photo est littéralement scotchée.
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
			// `tint` sert aux appelants dont la teinte est calculée au rendu —
			// depuis le 2026-08-06 il n'en reste qu'UN, le carton de la galerie
			// (`--piece-accent`). Style inline plutôt que classe, la valeur n'est
			// pas connue au build.
			style={tint ? { backgroundColor: tint } : undefined}
		/>
	);
}
