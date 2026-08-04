import type * as React from "react";

import { cn } from "@/shared/utils/cn";

/**
 * Base UI n'expose pas de `Label` autonome (il ne vit que dans `Field.Label`),
 * et `@radix-ui/react-label` n'apportait plus rien de plus qu'un `<label>`
 * natif. Élément natif, donc.
 *
 * `htmlFor` reste volontairement optionnel : certains appelants (groupes radio,
 * légendes de fieldset) enveloppent leur contrôle au lieu de le référencer par
 * id. Ceux qui possèdent un id unique (FieldLabel) le passent bien — contrat
 * verrouillé par `field-name-id-contract.regression`.
 */
function Label({ className, ...props }: React.ComponentProps<"label">) {
	return (
		// eslint-disable-next-line jsx-a11y/label-has-associated-control -- primitive générique : l'association se fait au call site (htmlFor via FieldLabel)
		<label
			data-slot="label"
			className={cn(
				"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

export { Label };
