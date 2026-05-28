"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "@/shared/utils/cn";

function Switch({
	className,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
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
					"peer focus-ring data-[state=checked]:bg-primary data-[state=unchecked]:bg-input can-hover:hover:data-[state=unchecked]:bg-input/70 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[background-color]",
					className,
				)}
				{...props}
			>
				<SwitchPrimitive.Thumb
					data-slot="switch-thumb"
					className={cn(
						"bg-background pointer-events-none block size-4 rounded-full ring-0 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 motion-safe:transition-transform",
					)}
				/>
			</SwitchPrimitive.Root>
		</span>
	);
}

export { Switch };
