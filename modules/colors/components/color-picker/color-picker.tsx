"use client";

import { cn } from "@/shared/utils/cn";
import Color from "color";
import { createContext, useContext, useEffect, useEffectEvent, useReducer, useRef } from "react";
import type { ColorPickerContextValue, ColorPickerProps } from "./types";
import { normalizeHex } from "../../utils/hex-normalizer";

type ColorState = {
	hue: number;
	saturation: number;
	lightness: number;
};

type ColorAction =
	| { type: "SET_HUE"; hue: number }
	| { type: "SET_SATURATION"; saturation: number }
	| { type: "SET_LIGHTNESS"; lightness: number }
	| { type: "SET_FROM_HSL"; hue: number; saturation: number; lightness: number };

function colorReducer(state: ColorState, action: ColorAction): ColorState {
	switch (action.type) {
		case "SET_HUE":
			return { ...state, hue: action.hue };
		case "SET_SATURATION":
			return { ...state, saturation: action.saturation };
		case "SET_LIGHTNESS":
			return { ...state, lightness: action.lightness };
		case "SET_FROM_HSL":
			return {
				hue: action.hue,
				saturation: action.saturation,
				lightness: action.lightness,
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

function hexToHsl(hex: string): { hue: number; saturation: number; lightness: number } {
	const color = Color(hex);
	const [h, s, l] = color.hsl().array();
	return {
		hue: h ?? 0,
		saturation: s ?? 0,
		lightness: l ?? 0,
	};
}

export const ColorPicker = ({
	value,
	defaultValue = "#000000",
	onChange,
	className,
	...props
}: ColorPickerProps) => {
	const initialHsl = hexToHsl(
		(typeof value === "string" && value) ||
			(typeof defaultValue === "string" && defaultValue) ||
			"#000000",
	);

	const [state, dispatch] = useReducer(colorReducer, initialHsl);
	const { hue, saturation, lightness } = state;

	// Guard to avoid ping-pong between "value prop → state" sync and "state → onChange" notification.
	const isUpdatingFromValue = useRef(false);

	const onNotifyChange = useEffectEvent(() => {
		if (!onChange) return;
		const hex = Color.hsl(hue, saturation, lightness).hex();
		onChange(normalizeHex(hex));
	});

	const prevValueRef = useRef(value);
	useEffect(() => {
		if (typeof value !== "string" || value === prevValueRef.current) return;
		prevValueRef.current = value;
		isUpdatingFromValue.current = true;
		const next = hexToHsl(value);
		dispatch({ type: "SET_FROM_HSL", ...next });
	}, [value]);

	useEffect(() => {
		if (isUpdatingFromValue.current) {
			isUpdatingFromValue.current = false;
			return;
		}
		onNotifyChange();
	}, [hue, saturation, lightness]);

	const setFromHex = (hex: string) => {
		const next = hexToHsl(hex);
		dispatch({ type: "SET_FROM_HSL", ...next });
	};

	return (
		<ColorPickerContext.Provider
			value={{
				hue,
				saturation,
				lightness,
				setHue: (h: number) => dispatch({ type: "SET_HUE", hue: h }),
				setSaturation: (s: number) => dispatch({ type: "SET_SATURATION", saturation: s }),
				setLightness: (l: number) => dispatch({ type: "SET_LIGHTNESS", lightness: l }),
				setFromHex,
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
