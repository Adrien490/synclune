"use client";

import { cn } from "@/shared/utils/cn";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { useColorPicker } from "./color-picker";
import type { ColorPickerHueProps } from "./types";

export const ColorPickerHue = ({ className, ...props }: ColorPickerHueProps) => {
	const { hue, setHue } = useColorPicker();

	return (
		<SliderPrimitive.Root
			data-slot="color-picker-hue"
			aria-label="Teinte"
			className={cn("relative flex h-6 w-full touch-none select-none", className)}
			max={360}
			onValueChange={([hue]) => setHue(hue ?? 0)}
			step={1}
			value={[hue]}
			{...props}
		>
			<SliderPrimitive.Track className="relative my-0.5 h-5 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)] md:h-4">
				<SliderPrimitive.Range className="absolute h-full" />
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb className="border-primary/50 bg-background focus-visible:ring-ring relative block h-6 w-6 rounded-full border-2 shadow-md transition-transform before:absolute before:-inset-2 before:content-[''] hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none" />
		</SliderPrimitive.Root>
	);
};

ColorPickerHue.displayName = "ColorPickerHue";
