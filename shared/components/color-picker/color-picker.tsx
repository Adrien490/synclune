"use client";

import { cn } from "@/shared/utils/cn";
import Color from "color";
import { createContext, useContext, useEffect, useEffectEvent, useRef, useState } from "react";
import type { ColorPickerContextValue, ColorPickerProps } from "./types";

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(
	undefined
);

export const useColorPicker = (): ColorPickerContextValue => {
	const context = useContext(ColorPickerContext);

	if (!context) {
		throw new Error("useColorPicker must be used within a ColorPickerProvider");
	}

	return context;
};

export const ColorPicker = ({
	value,
	defaultValue = "#000000",
	onChange,
	className,
	...props
}: ColorPickerProps) => {
	const selectedColor = Color(value);
	const defaultColor = Color(defaultValue);

	const [hue, setHue] = useState(
		selectedColor.hue() || defaultColor.hue() || 0
	);
	const [saturation, setSaturation] = useState(
		selectedColor.saturationl() || defaultColor.saturationl() || 100
	);
	const [lightness, setLightness] = useState(
		selectedColor.lightness() || defaultColor.lightness() || 50
	);
	const [alpha, setAlpha] = useState(() => {
		const normalizeAlpha = (v: number) => (isNaN(v) ? 1 : v);
		const selectedAlpha = normalizeAlpha(selectedColor.alpha()) * 100;
		const defaultAlpha = normalizeAlpha(defaultColor.alpha()) * 100;
		return selectedAlpha || defaultAlpha || 100;
	});
	const [mode, setMode] = useState("hex");

	// Refs pour éviter les boucles infinies
	const isUpdatingFromValue = useRef(false);

	// Effect Event: notify parent without re-triggering the effect on onChange identity changes
	const onNotifyChange = useEffectEvent(() => {
		if (onChange) {
			const color = Color.hsl(hue, saturation, lightness).alpha(alpha / 100);
			const rgba = color.rgb().array();
			onChange([rgba[0], rgba[1], rgba[2], alpha / 100]);
		}
	});

	// Sync controlled value → internal state (nécessaire pour composant contrôlé)
	const prevValueRef = useRef(value);
	useEffect(() => {
		if (value && value !== prevValueRef.current) {
			prevValueRef.current = value;
			isUpdatingFromValue.current = true;
			const color = Color(value);
			const hslValues = color.hsl().array();

			setHue(hslValues[0] || 0);
			setSaturation(hslValues[1] || 100);
			setLightness(hslValues[2] || 50);
			const normalizedAlpha = isNaN(color.alpha()) ? 1 : color.alpha();
			setAlpha(normalizedAlpha * 100 || 100);
		}
	}, [value]);

	// Notify parent of changes (skip if updating from controlled value to avoid loop)
	useEffect(() => {
		if (isUpdatingFromValue.current) {
			isUpdatingFromValue.current = false;
			return;
		}
		onNotifyChange();
	}, [hue, saturation, lightness, alpha]);

	return (
		<ColorPickerContext.Provider
			value={{
				hue,
				saturation,
				lightness,
				alpha,
				mode,
				setHue,
				setSaturation,
				setLightness,
				setAlpha,
				setMode,
			}}
		>
			<div
				data-slot="color-picker"
				role="group"
				aria-label="Sélecteur de couleur"
				className={cn("flex size-full flex-col gap-4", className)}
				{...props}
			/>
		</ColorPickerContext.Provider>
	);
};

ColorPicker.displayName = "ColorPicker";
