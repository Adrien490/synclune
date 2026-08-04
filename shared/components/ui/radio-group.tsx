"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { CircleIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/shared/utils/cn";

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
	return (
		<RadioGroupPrimitive
			data-slot="radio-group"
			className={cn("grid gap-3", className)}
			{...props}
		/>
	);
}

/**
 * Base UI éclate l'item en un composant à part (`Radio.Root`) au lieu d'un
 * `RadioGroup.Item` — le nom public reste `RadioGroupItem`.
 */
function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
	return (
		<RadioPrimitive.Root
			data-slot="radio-group-item"
			className={cn(
				"border-input text-primary can-hover:hover:border-ring/70 focus-ring aria-invalid:ring-destructive/20 aria-invalid:border-destructive aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow,transform] disabled:cursor-not-allowed disabled:opacity-50 motion-safe:active:scale-95",
				className,
			)}
			{...props}
		>
			<RadioPrimitive.Indicator
				data-slot="radio-group-indicator"
				className="relative flex items-center justify-center"
			>
				{/* Rose PROFOND, pas --primary : le point est le seul porteur de l'état
				 « sélectionné », et le pastel n'était qu'à 1,6:1 sur un fond de carte
				 (1:1 s'il se trouvait sur un aplat rose). WCAG 1.4.11 demande 3:1. */}
				<CircleIcon
					weight="fill"
					className="text-brand-rose-strong absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2"
				/>
			</RadioPrimitive.Indicator>
		</RadioPrimitive.Root>
	);
}

export { RadioGroup, RadioGroupItem };
