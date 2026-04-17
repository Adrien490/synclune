"use client";

import Color from "color";
import { useRef } from "react";
import { cn } from "@/shared/utils/cn";
import { CheckIcon } from "lucide-react";
import { useColorPicker } from "./color-picker";
import { JEWELRY_PALETTE, type JewelryPaletteColor } from "../../constants/jewelry-palette";
import { normalizeHex } from "../../utils/hex-normalizer";

type ColorPickerPaletteProps = {
	className?: string;
	title?: string;
	colors?: readonly JewelryPaletteColor[];
};

export function ColorPickerPalette({
	className,
	title = "Palette bijoux",
	colors = JEWELRY_PALETTE,
}: ColorPickerPaletteProps) {
	const { hue, saturation, lightness, setFromHex } = useColorPicker();
	const currentHex = normalizeHex(Color.hsl(hue, saturation, lightness).hex());

	const groupRef = useRef<HTMLDivElement>(null);

	const focusIndex = (index: number) => {
		const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>(
			'button[data-slot="color-picker-palette-swatch"]',
		);
		if (!buttons || buttons.length === 0) return;
		const clamped = ((index % buttons.length) + buttons.length) % buttons.length;
		buttons[clamped]?.focus();
	};

	const onKeyDown = (e: React.KeyboardEvent, index: number) => {
		switch (e.key) {
			case "ArrowRight":
				e.preventDefault();
				focusIndex(index + 1);
				break;
			case "ArrowLeft":
				e.preventDefault();
				focusIndex(index - 1);
				break;
			case "ArrowDown":
				e.preventDefault();
				focusIndex(index + 4);
				break;
			case "ArrowUp":
				e.preventDefault();
				focusIndex(index - 4);
				break;
			case "Home":
				e.preventDefault();
				focusIndex(0);
				break;
			case "End":
				e.preventDefault();
				focusIndex(colors.length - 1);
				break;
		}
	};

	return (
		<div data-slot="color-picker-palette" className={cn("flex flex-col gap-2", className)}>
			<p className="text-muted-foreground text-xs font-medium" id="color-picker-palette-label">
				{title}
			</p>
			<div
				ref={groupRef}
				role="radiogroup"
				aria-labelledby="color-picker-palette-label"
				className="grid grid-cols-4 gap-2 sm:grid-cols-6"
			>
				{colors.map((swatch, index) => {
					const normalizedSwatch = normalizeHex(swatch.hex);
					const selected = normalizedSwatch === currentHex;
					const isLight = Color(swatch.hex).isLight();
					return (
						<button
							key={swatch.hex}
							type="button"
							role="radio"
							aria-checked={selected}
							aria-label={`${swatch.name} (${normalizedSwatch})`}
							data-slot="color-picker-palette-swatch"
							tabIndex={
								selected || (!colors.some((c) => normalizeHex(c.hex) === currentHex) && index === 0)
									? 0
									: -1
							}
							onClick={() => setFromHex(normalizedSwatch)}
							onKeyDown={(e) => {
								if (e.key === " " || e.key === "Enter") {
									e.preventDefault();
									setFromHex(normalizedSwatch);
								} else {
									onKeyDown(e, index);
								}
							}}
							className={cn(
								"focus-visible:ring-ring relative flex h-11 w-11 items-center justify-center rounded-md border transition-transform focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-safe:hover:scale-105 motion-reduce:transition-none",
								selected ? "border-foreground ring-foreground/40 ring-2" : "border-border",
							)}
							style={{ backgroundColor: swatch.hex }}
							title={`${swatch.name} — ${normalizedSwatch}`}
						>
							{selected && (
								<CheckIcon
									className={cn("size-4", isLight ? "text-neutral-900" : "text-white")}
									aria-hidden="true"
								/>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}

ColorPickerPalette.displayName = "ColorPickerPalette";
