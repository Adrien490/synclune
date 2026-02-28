"use client";

import { cn } from "@/shared/utils/cn";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { useColorPicker } from "./color-picker";
import type { ColorPickerAlphaProps } from "./types";

export const ColorPickerAlpha = ({ className, ...props }: ColorPickerAlphaProps) => {
	const { alpha, setAlpha } = useColorPicker();

	return (
		<SliderPrimitive.Root
			data-slot="color-picker-alpha"
			aria-label="Opacité"
			className={cn("relative flex h-6 w-full touch-none select-none", className)}
			max={100}
			onValueChange={([alpha]) => setAlpha(alpha ?? 100)}
			step={1}
			value={[alpha]}
			{...props}
		>
			<SliderPrimitive.Track
				className="relative my-0.5 h-5 w-full grow rounded-full md:h-4"
				style={{
					background:
						'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
				}}
			>
				<div className="absolute inset-0 rounded-full bg-linear-to-r from-transparent to-black/50" />
				<SliderPrimitive.Range className="absolute h-full rounded-full bg-transparent" />
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb className="border-primary/50 bg-background focus-visible:ring-ring relative block h-6 w-6 rounded-full border-2 shadow-md transition-transform before:absolute before:-inset-2 before:content-[''] hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none" />
		</SliderPrimitive.Root>
	);
};

ColorPickerAlpha.displayName = "ColorPickerAlpha";
