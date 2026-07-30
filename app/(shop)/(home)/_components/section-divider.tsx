import type { CSSProperties } from "react";

import { cn } from "@/shared/utils/cn";

/**
 * Séparateur de section « fait main » — trait ondulé irrégulier dessiné au
 * scroll (`hand-draw-inview`, cf. app/styles/entrance.css : état fini par
 * défaut sous reduced-motion et Safari ≤ 18).
 *
 * Rendu DANS la section (avant le SectionHeader) : il hérite de l'accent par
 * cascade (`--section-accent` posé par `data-accent`) et disparaît avec les
 * sections auto-masquées (jamais de séparateur orphelin). Usage parcimonieux :
 * Collections (lavande), FAQ (rose).
 */
export function SectionDivider({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 160 24"
			width={160}
			height={24}
			className={cn("mx-auto mb-8 block sm:mb-10", className)}
			fill="none"
			aria-hidden="true"
			focusable="false"
		>
			{/* 3 ondulations volontairement asymétriques (amplitudes inégales = trait manuel) */}
			<path
				d="M4 14 C22 6, 38 20, 58 13 C74 7, 86 19, 104 12 C120 6, 140 17, 156 10"
				pathLength={1}
				stroke="var(--section-accent, var(--primary))"
				strokeWidth={2}
				strokeLinecap="round"
				className="hand-draw-inview"
				style={{ "--hand-duration": "900ms" } as CSSProperties}
			/>
		</svg>
	);
}
