"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "@/shared/utils/cn";

function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	"aria-label": ariaLabel,
	...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
	const _values = Array.isArray(value)
		? value
		: Array.isArray(defaultValue)
			? defaultValue
			: [min, max];

	const getThumbLabel = (index: number) => {
		if (_values.length === 1) return ariaLabel || "Curseur";
		if (index === 0) return "Valeur minimum";
		if (index === _values.length - 1) return "Valeur maximum";
		return `Curseur ${index + 1}`;
	};

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			// Empêche le drag du drawer/sheet parent quand on interagit avec le slider
			data-vaul-no-drag
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			className={cn(
				"relative flex w-full touch-pan-y items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
				className
			)}
			{...props}
		>
			<SliderPrimitive.Track
				data-slot="slider-track"
				className={cn(
					"bg-muted relative grow overflow-hidden rounded-full",
					"data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:w-full",
					"data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2"
				)}
			>
				<SliderPrimitive.Range
					data-slot="slider-range"
					className={cn(
						"bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
						"transition-all duration-150"
					)}
				/>
			</SliderPrimitive.Track>
			{Array.from({ length: _values.length }, (_, index) => (
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					key={index}
					aria-label={getThumbLabel(index)}
					className={cn(
						"block size-5 shrink-0 rounded-full",
						"border-2 border-primary bg-background",
						"shadow-md hover:shadow-lg",
						"ring-ring/50 transition-all duration-150",
						"hover:ring-4 hover:scale-110",
						"focus-visible:ring-4 focus-visible:outline-none",
						"active:scale-95",
						"disabled:pointer-events-none disabled:opacity-50"
					)}
				/>
			))}
		</SliderPrimitive.Root>
	);
}

export { Slider };
