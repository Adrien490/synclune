"use client";

import Color from "color";
import { useRef } from "react";
import { cn } from "@/shared/utils/cn";
import { CheckIcon } from "lucide-react";
import { useColorPicker } from "./color-picker";
import { normalizeHex } from "../../utils/hex-normalizer";

type ColorPickerRecentsProps = {
	className?: string;
	title?: string;
	colors: string[];
};

export function ColorPickerRecents({
	className,
	title = "Couleurs récentes",
	colors,
}: ColorPickerRecentsProps) {
	const { hue, saturation, lightness, setFromHex } = useColorPicker();
	const currentHex = normalizeHex(Color.hsl(hue, saturation, lightness).hex());
	const groupRef = useRef<HTMLDivElement>(null);

	if (colors.length === 0) return null;

	const focusIndex = (index: number) => {
		const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>(
			'button[data-slot="color-picker-recents-swatch"]',
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

	const selectedIndex = colors.findIndex((c) => normalizeHex(c) === currentHex);

	return (
		<div data-slot="color-picker-recents" className={cn("flex flex-col gap-2", className)}>
			<p className="text-muted-foreground text-xs font-medium" id="color-picker-recents-label">
				{title}
			</p>
			<div
				ref={groupRef}
				role="radiogroup"
				aria-labelledby="color-picker-recents-label"
				className="flex flex-wrap gap-2"
			>
				{colors.map((hex, index) => {
					const normalized = normalizeHex(hex);
					const selected = normalized === currentHex;
					const isLight = (() => {
						try {
							return Color(normalized).isLight();
						} catch {
							return false;
						}
					})();
					const tabIndex = selected || (selectedIndex === -1 && index === 0) ? 0 : -1;
					return (
						<button
							key={normalized + index}
							type="button"
							role="radio"
							aria-checked={selected}
							aria-label={`Couleur récente ${normalized}`}
							data-slot="color-picker-recents-swatch"
							tabIndex={tabIndex}
							onClick={() => setFromHex(normalized)}
							onKeyDown={(e) => {
								if (e.key === " " || e.key === "Enter") {
									e.preventDefault();
									setFromHex(normalized);
								} else {
									onKeyDown(e, index);
								}
							}}
							className={cn(
								"focus-visible:ring-ring relative flex h-11 w-11 items-center justify-center rounded-md border transition-transform focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-safe:hover:scale-105 motion-reduce:transition-none",
								selected ? "border-foreground ring-foreground/40 ring-2" : "border-border",
							)}
							style={{ backgroundColor: normalized }}
							title={normalized}
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

ColorPickerRecents.displayName = "ColorPickerRecents";
