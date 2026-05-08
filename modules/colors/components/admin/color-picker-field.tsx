"use client";

import { ColorPicker } from "@/shared/components/ui/color-picker";

import { JEWELRY_PALETTE } from "@/modules/colors/constants/jewelry-palette";

const RECENT_COLORS_STORAGE_KEY = "synclune:admin:recent-colors";

interface ColorPickerFieldProps {
	value: string;
	onChange: (hex: string) => void;
	disabled?: boolean;
	id?: string;
	className?: string;
}

export function ColorPickerField({
	value,
	onChange,
	disabled,
	id,
	className,
}: ColorPickerFieldProps) {
	return (
		<ColorPicker
			id={id}
			value={value}
			onChange={onChange}
			disabled={disabled}
			presets={JEWELRY_PALETTE}
			recentStorageKey={RECENT_COLORS_STORAGE_KEY}
			className={className}
			data-testid="color-picker-field"
		/>
	);
}
