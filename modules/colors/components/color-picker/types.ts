import type { ComponentProps, HTMLAttributes } from "react";
import type Color from "color";
import type { Button } from "@/shared/components/ui/button";
import type * as SliderPrimitive from "@radix-ui/react-slider";

export interface ColorPickerContextValue {
	hue: number;
	saturation: number;
	lightness: number;
	setHue: (hue: number) => void;
	setSaturation: (saturation: number) => void;
	setLightness: (lightness: number) => void;
	setFromHex: (hex: string) => void;
}

export type ColorPickerProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
	value?: Parameters<typeof Color>[0];
	defaultValue?: Parameters<typeof Color>[0];
	onChange?: (hex: string) => void;
};

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export type ColorPickerHueProps = ComponentProps<typeof SliderPrimitive.Root>;

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;
