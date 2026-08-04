"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

import { cn } from "@/shared/utils/cn";

function Separator({
	className,
	orientation = "horizontal",
	decorative = true,
	...props
}: SeparatorPrimitive.Props & {
	/**
	 * Retire le séparateur de l'arbre d'accessibilité.
	 *
	 * Base UI rend TOUJOURS `role="separator"` + `aria-orientation` — il n'a pas
	 * l'équivalent du prop `decorative` de Radix. Sans ce repli, les 33 appelants
	 * (tous décoratifs, aucun ne passe le prop) feraient annoncer un séparateur
	 * par les lecteurs d'écran à chaque trait de mise en page.
	 * @default true
	 */
	decorative?: boolean;
}) {
	return (
		<SeparatorPrimitive
			data-slot="separator"
			orientation={orientation}
			className={cn(
				"bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
				className,
			)}
			{...(decorative ? { role: "none", "aria-orientation": undefined } : null)}
			{...props}
		/>
	);
}

export { Separator };
