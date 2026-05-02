"use client";

import Color from "color";
import { CheckIcon } from "lucide-react";
import { useRef } from "react";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { JEWELRY_PALETTE, type JewelryPaletteColor } from "../constants/jewelry-palette";
import { normalizeHex } from "../utils/hex-normalizer";

type ColorPaletteProps = {
	value?: string;
	onChange?: (hex: string) => void;
	disabled?: boolean;
	className?: string;
	colors?: readonly JewelryPaletteColor[];
};

export function ColorPalette({
	value,
	onChange,
	disabled,
	className,
	colors = JEWELRY_PALETTE,
}: ColorPaletteProps) {
	const haptic = useHaptic();
	const groupRef = useRef<HTMLDivElement>(null);
	const currentHex = value ? normalizeHex(value) : null;
	const hasMatch = colors.some((c) => normalizeHex(c.hex) === currentHex);

	const focusIndex = (index: number) => {
		const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>(
			'button[data-slot="color-palette-swatch"]',
		);
		if (!buttons || buttons.length === 0) return;
		const clamped = ((index % buttons.length) + buttons.length) % buttons.length;
		buttons[clamped]?.focus();
	};

	const select = (hex: string) => {
		if (disabled) return;
		haptic("selection");
		onChange?.(normalizeHex(hex));
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
		<div
			data-slot="color-palette"
			aria-disabled={disabled}
			className={cn("flex flex-col gap-2", disabled && "pointer-events-none opacity-50", className)}
		>
			<p className="text-muted-foreground text-xs font-medium" id="color-palette-label">
				Palette bijoux
			</p>
			<div
				ref={groupRef}
				role="radiogroup"
				aria-labelledby="color-palette-label"
				className="grid grid-cols-4 gap-2 sm:grid-cols-6"
			>
				{colors.map((swatch, index) => {
					const normalized = normalizeHex(swatch.hex);
					const selected = normalized === currentHex;
					const isLight = Color(swatch.hex).isLight();
					return (
						<button
							key={swatch.hex}
							type="button"
							role="radio"
							aria-checked={selected}
							aria-label={`${swatch.name} (${normalized})`}
							data-slot="color-palette-swatch"
							disabled={disabled}
							tabIndex={selected || (!hasMatch && index === 0) ? 0 : -1}
							onClick={() => select(normalized)}
							onKeyDown={(e) => {
								if (e.key === " " || e.key === "Enter") {
									e.preventDefault();
									select(normalized);
								} else {
									onKeyDown(e, index);
								}
							}}
							className={cn(
								"focus-visible:ring-ring relative flex h-11 w-11 items-center justify-center rounded-md border transition-transform focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-safe:hover:scale-105 motion-reduce:transition-none",
								selected ? "border-foreground ring-foreground/40 ring-2" : "border-border",
							)}
							style={{ backgroundColor: swatch.hex }}
							title={`${swatch.name} — ${normalized}`}
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

ColorPalette.displayName = "ColorPalette";
