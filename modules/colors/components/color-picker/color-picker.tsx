"use client";

import { cn } from "@/shared/utils/cn";
import Color from "color";
import { createContext, useContext, useEffect, useEffectEvent, useReducer, useRef } from "react";
import type { ColorPickerContextValue, ColorPickerProps } from "./types";

type ColorState = {
	hue: number;
	saturation: number;
	lightness: number;
	alpha: number;
	mode: string;
};

type ColorAction =
	| { type: "SET_HUE"; hue: number }
	| { type: "SET_SATURATION"; saturation: number }
	| { type: "SET_LIGHTNESS"; lightness: number }
	| { type: "SET_ALPHA"; alpha: number }
	| { type: "SET_MODE"; mode: string }
	| { type: "SET_FROM_VALUE"; hue: number; saturation: number; lightness: number; alpha: number };

function colorReducer(state: ColorState, action: ColorAction): ColorState {
	switch (action.type) {
		case "SET_HUE":
			return { ...state, hue: action.hue };
		case "SET_SATURATION":
			return { ...state, saturation: action.saturation };
		case "SET_LIGHTNESS":
			return { ...state, lightness: action.lightness };
		case "SET_ALPHA":
			return { ...state, alpha: action.alpha };
		case "SET_MODE":
			return { ...state, mode: action.mode };
		case "SET_FROM_VALUE":
			return {
				...state,
				hue: action.hue,
				saturation: action.saturation,
				lightness: action.lightness,
				alpha: action.alpha,
			};
	}
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(undefined);

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

	const normalizeAlpha = (v: number) => (isNaN(v) ? 1 : v);

	const [state, dispatch] = useReducer(colorReducer, {
		hue: selectedColor.hue() || defaultColor.hue() || 0,
		saturation: selectedColor.saturationl() || defaultColor.saturationl() || 100,
		lightness: selectedColor.lightness() || defaultColor.lightness() || 50,
		alpha:
			normalizeAlpha(selectedColor.alpha()) * 100 ||
			normalizeAlpha(defaultColor.alpha()) * 100 ||
			100,
		mode: "hex",
	});

	const { hue, saturation, lightness, alpha } = state;

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
			const normalizedAlpha = isNaN(color.alpha()) ? 1 : color.alpha();

			dispatch({
				type: "SET_FROM_VALUE",
				hue: hslValues[0] ?? 0,
				saturation: hslValues[1] ?? 100,
				lightness: hslValues[2] ?? 50,
				alpha: normalizedAlpha * 100 || 100,
			});
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
				mode: state.mode,
				setHue: (h: number) => dispatch({ type: "SET_HUE", hue: h }),
				setSaturation: (s: number) => dispatch({ type: "SET_SATURATION", saturation: s }),
				setLightness: (l: number) => dispatch({ type: "SET_LIGHTNESS", lightness: l }),
				setAlpha: (a: number) => dispatch({ type: "SET_ALPHA", alpha: a }),
				setMode: (m: string) => dispatch({ type: "SET_MODE", mode: m }),
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
