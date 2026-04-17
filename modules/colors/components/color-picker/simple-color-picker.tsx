"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/shared/utils/cn";
import { useRecentColors } from "../../hooks/use-recent-colors";
import { ColorPicker } from "./color-picker";
import { ColorPickerEyeDropper } from "./color-picker-eye-dropper";
import { ColorPickerHexInput } from "./color-picker-hex-input";
import { ColorPickerHue } from "./color-picker-hue";
import { ColorPickerPalette } from "./color-picker-palette";
import { ColorPickerPreview } from "./color-picker-preview";
import { ColorPickerRecents } from "./color-picker-recents";
import { ColorPickerSelection } from "./color-picker-selection";

type SimpleColorPickerProps = {
	value?: string;
	defaultValue?: string;
	onChange?: (hex: string) => void;
	disabled?: boolean;
	className?: string;
};

const RECENT_DEBOUNCE_MS = 1200;

export function SimpleColorPicker({
	value,
	defaultValue = "#000000",
	onChange,
	disabled,
	className,
}: SimpleColorPickerProps) {
	const { colors: recents, add: addRecent } = useRecentColors();

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		if (!value) return;
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			addRecent(value);
		}, RECENT_DEBOUNCE_MS);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [value, addRecent]);

	return (
		<div
			data-slot="simple-color-picker"
			aria-disabled={disabled}
			className={cn("flex flex-col gap-4", disabled && "pointer-events-none opacity-50", className)}
		>
			<ColorPicker value={value} defaultValue={defaultValue} onChange={onChange}>
				<ColorPickerPreview />

				<div className="flex items-start gap-2">
					<ColorPickerHexInput className="flex-1" disabled={disabled} />
					<ColorPickerEyeDropper />
				</div>

				<div className="h-52 w-full md:h-48">
					<ColorPickerSelection className="h-full w-full" />
				</div>
				<ColorPickerHue className="w-full" />

				<ColorPickerPalette />
				<ColorPickerRecents colors={recents} />
			</ColorPicker>
		</div>
	);
}

SimpleColorPicker.displayName = "SimpleColorPicker";
