"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/shared/utils/cn";

/**
 * `SliderRoot.Props` est générique sur la forme de la valeur (`number` pour un
 * curseur unique, `readonly number[]` pour une plage). On la fixe sur le tableau :
 * tous nos appelants sont des plages, et laisser l'union par défaut obligerait
 * chaque call site à re-narrower `value[0]` / `value[1]`.
 */
interface SliderProps extends SliderPrimitive.Root.Props<readonly number[]> {
	/** Formateur de valeur pour les lecteurs d'ecran (ex: "50 euros" au lieu de "50") */
	formatValue?: (value: number) => string;
}

function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	formatValue,
	"aria-label": ariaLabel,
	...props
}: SliderProps) {
	// Annotation explicite : `Array.isArray` sur un `readonly number[]` élargit le
	// type à `any[]`, ce qui contaminait `getThumbAriaValueText`.
	const _values: readonly number[] = value ?? defaultValue ?? [min, max];

	const getThumbLabel = (index: number) => {
		if (_values.length === 1) return ariaLabel ?? "Curseur";
		if (index === 0) return "Valeur minimum";
		if (index === _values.length - 1) return "Valeur maximum";
		return `Curseur ${index + 1}`;
	};

	// aria-valuetext pour contexte lecteur d'ecran (WCAG 4.1.2)
	const getThumbAriaValueText = (index: number) => {
		const currentValue = _values[index] ?? min;
		if (formatValue) {
			return formatValue(currentValue);
		}
		return `${currentValue} sur ${max}`;
	};

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			className={cn(
				"relative w-full data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto",
				className,
			)}
			{...props}
		>
			{/* `Control` est la zone de pointage : Base UI l'a extraite du Root, qui
			    n'est plus qu'un conteneur (il peut aussi porter Label et Value). */}
			<SliderPrimitive.Control
				data-slot="slider-control"
				className="flex w-full touch-pan-y items-center select-none data-[orientation=vertical]:h-full data-[orientation=vertical]:flex-col"
			>
				<SliderPrimitive.Track
					data-slot="slider-track"
					className={cn(
						"bg-muted relative grow overflow-hidden rounded-full",
						"data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:w-full",
						"data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2",
					)}
				>
					{/* `Range` côté Radix. */}
					<SliderPrimitive.Indicator
						data-slot="slider-range"
						className={cn(
							"bg-brand-rose-strong absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
							"transition-all duration-150",
						)}
					/>
					{Array.from({ length: _values.length }, (_, index) => (
						<SliderPrimitive.Thumb
							data-slot="slider-thumb"
							key={`thumb-${index}`}
							index={index}
							getAriaLabel={() => getThumbLabel(index)}
							getAriaValueText={() => getThumbAriaValueText(index)}
							className={cn(
								"relative block size-5 shrink-0 rounded-full",
								"before:absolute before:-inset-3 before:content-['']",
								"border-brand-rose-strong bg-background border-3",
								"shadow-md hover:shadow-lg",
								"ring-ring/50 transition-all duration-150",
								"hover:scale-110 hover:ring-4",
								"focus-visible:ring-4 focus-visible:outline-none",
								"active:scale-95",
								"disabled:pointer-events-none disabled:opacity-50",
							)}
						/>
					))}
				</SliderPrimitive.Track>
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
}

export { Slider };
