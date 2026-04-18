"use client";

import Link, { type LinkProps } from "next/link";
import { type AnchorHTMLAttributes, type ReactNode } from "react";

type StopPropagationLinkProps = LinkProps &
	Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
		children: ReactNode;
	};

/**
 * Drop-in remplaçant de `next/link` qui interrompt click / pointerdown / keydown
 * pour éviter de déclencher un parent interactif (ex. `SelectableMobileCard`).
 *
 * Permet de garder le composant parent en Server Component : les event
 * handlers restent isolés dans ce Client Component.
 */
export function StopPropagationLink({ children, ...props }: StopPropagationLinkProps) {
	return (
		<Link
			{...props}
			onClick={(e) => e.stopPropagation()}
			onPointerDown={(e) => e.stopPropagation()}
			onKeyDown={(e) => e.stopPropagation()}
		>
			{children}
		</Link>
	);
}
