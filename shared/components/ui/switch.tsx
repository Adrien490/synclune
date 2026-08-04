"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/shared/utils/cn";

function Switch({
	className,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	...props
}: SwitchPrimitive.Root.Props) {
	// Warning dev si pas de label accessible (WCAG 4.1.2)
	if (process.env.NODE_ENV === "development" && !ariaLabel && !ariaLabelledBy) {
		console.warn("[Switch] aria-label ou aria-labelledby requis pour l'accessibilité");
	}

	return (
		<span className="inline-flex min-h-11 min-w-11 items-center justify-center">
			<SwitchPrimitive.Root
				data-slot="switch"
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledBy}
				className={cn(
					"peer focus-ring data-checked:bg-primary data-unchecked:bg-input can-hover:hover:data-unchecked:bg-input/70 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[background-color]",
					className,
				)}
				{...props}
			>
				<SwitchPrimitive.Thumb
					data-slot="switch-thumb"
					className={cn(
						"bg-background pointer-events-none block size-4 rounded-full ring-0 data-checked:translate-x-[calc(100%-2px)] data-unchecked:translate-x-0 motion-safe:transition-transform",
					)}
				/>
			</SwitchPrimitive.Root>
		</span>
	);
}

export { Switch };
