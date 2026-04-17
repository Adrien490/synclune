"use client";

import { type ReactNode } from "react";

interface StopEventPropagationProps {
	children: ReactNode;
	className?: string;
}

/**
 * Transparent wrapper qui intercepte click / pointerdown / keydown pour
 * empêcher la propagation vers un parent interactif (typiquement
 * `SelectableMobileCard` au-dessus d'un dropdown / link inline).
 *
 * Utilise `role="presentation"` pour communiquer au moteur a11y que le span
 * n'est pas une cible interactive : les enfants (boutons, liens) restent
 * eux-mêmes focusables et conservent leur sémantique.
 */
export function StopEventPropagation({ children, className }: StopEventPropagationProps) {
	return (
		<span
			role="presentation"
			className={className}
			onClick={(e) => e.stopPropagation()}
			onPointerDown={(e) => e.stopPropagation()}
			onKeyDown={(e) => e.stopPropagation()}
		>
			{children}
		</span>
	);
}
