"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "@/shared/utils/cn";

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
	return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
	className,
	align = "center",
	alignOffset = 0,
	side = "bottom",
	sideOffset = 4,
	...props
}: PopoverPrimitive.Popup.Props &
	Pick<PopoverPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Positioner
				align={align}
				alignOffset={alignOffset}
				side={side}
				sideOffset={sideOffset}
				className="isolate z-(--z-float)"
			>
				<PopoverPrimitive.Popup
					data-slot="popover-content"
					className={cn(
						"bg-popover text-popover-foreground w-72 max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-md border p-4 shadow-md outline-hidden",
						"motion-safe:data-open:animate-in motion-safe:data-closed:animate-out",
						"motion-safe:data-closed:fade-out-0 motion-safe:data-open:fade-in-0",
						"motion-safe:data-closed:zoom-out-95 motion-safe:data-open:zoom-in-95",
						"motion-safe:data-[side=bottom]:slide-in-from-top-2 motion-safe:data-[side=left]:slide-in-from-right-2",
						"motion-safe:data-[side=right]:slide-in-from-left-2 motion-safe:data-[side=top]:slide-in-from-bottom-2",
						// `animate-out` sans fill mode revient au style de base en fin
						// d'animation — cf. `ui/dialog.tsx`. Inoffensif ici (Base UI démonte
						// le popup dans un `flushSync` avant la peinture), mais la règle est
						// uniforme, cf. `animate-out-fill-mode.regression.test.ts`.
						"fill-mode-forwards",
						className,
					)}
					{...props}
				/>
			</PopoverPrimitive.Positioner>
		</PopoverPrimitive.Portal>
	);
}

export { Popover, PopoverContent, PopoverTrigger };
