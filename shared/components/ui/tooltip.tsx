"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/shared/utils/cn";

function TooltipProvider({ delay = 150, ...props }: TooltipPrimitive.Provider.Props) {
	return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />;
}

/**
 * Chaque `Tooltip` embarque son propre `Provider` (groupe de délai isolé).
 *
 * ⚠️ Le délai n'est plus un prop du Root comme le `delayDuration` de Radix :
 * Base UI le porte sur le Provider. On l'accepte ici et on le fait redescendre,
 * pour que les appelants gardent un seul composant à piloter.
 */
function Tooltip({
	delay,
	closeDelay,
	...props
}: TooltipPrimitive.Root.Props & Pick<TooltipPrimitive.Provider.Props, "delay" | "closeDelay">) {
	return (
		<TooltipProvider delay={delay} closeDelay={closeDelay}>
			<TooltipPrimitive.Root data-slot="tooltip" {...props} />
		</TooltipProvider>
	);
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
	className,
	side = "top",
	sideOffset = 0,
	align = "center",
	alignOffset = 0,
	children,
	...props
}: TooltipPrimitive.Popup.Props &
	Pick<TooltipPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
	return (
		<TooltipPrimitive.Portal>
			{/* Base UI sépare le placement (Positioner) de la surface (Popup) :
			    `side`/`align`/`sideOffset` vont sur le premier, le style sur le second. */}
			<TooltipPrimitive.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				className="isolate z-(--z-float)"
			>
				<TooltipPrimitive.Popup
					data-slot="tooltip-content"
					className={cn(
						"bg-foreground text-background w-fit origin-(--transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
						"motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95",
						"motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0 motion-safe:data-closed:zoom-out-95",
						"motion-safe:data-[side=bottom]:slide-in-from-top-2 motion-safe:data-[side=left]:slide-in-from-right-2",
						"motion-safe:data-[side=right]:slide-in-from-left-2 motion-safe:data-[side=top]:slide-in-from-bottom-2",
						// cf. `ui/popover.tsx` — `animate-out` exige un fill mode.
						"fill-mode-forwards",
						className,
					)}
					{...props}
				>
					{children}
					{/* Base UI positionne la flèche lui-même et l'oriente via `data-side` —
					    d'où les décalages par côté, absents de la version Radix. */}
					<TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-(--z-float) size-2.5 rotate-45 rounded-[2px] data-[side=bottom]:top-1 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
				</TooltipPrimitive.Popup>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
