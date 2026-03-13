import type { ComponentProps, HTMLAttributes } from "react";
import type Color from "color";
import type { Button } from "@/shared/components/ui/button";
import type { SelectTrigger } from "@/shared/components/ui/select";
import type * as SliderPrimitive from "@radix-ui/react-slider";

export interface ColorPickerContextValue {
	hue: number;
	saturation: number;
	lightness: number;
	alpha: number;
	mode: string;
	setHue: (hue: number) => void;
	setSaturation: (saturation: number) => void;
	setLightness: (lightness: number) => void;
	setAlpha: (alpha: number) => void;
	setMode: (mode: string) => void;
}

export type ColorPickerProps = HTMLAttributes<HTMLDivElement> & {
	value?: Parameters<typeof Color>[0];
	defaultValue?: Parameters<typeof Color>[0];
	onChange?: (value: Parameters<typeof Color.rgb>[0]) => void;
};

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export type ColorPickerHueProps = ComponentProps<typeof SliderPrimitive.Root>;

export type ColorPickerAlphaProps = ComponentProps<typeof SliderPrimitive.Root>;

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>;

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;
