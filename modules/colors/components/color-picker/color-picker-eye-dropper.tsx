"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import Color from "color";
import { PipetteIcon } from "lucide-react";
import { useColorPicker } from "./color-picker";
import type { ColorPickerEyeDropperProps } from "./types";

function parseHslFromHex(hex: string) {
	const color = Color(hex);
	const [h, s, l] = color.hsl().array();
	return { h: h ?? 0, s: s ?? 0, l: l ?? 0 };
}

export const ColorPickerEyeDropper = ({ className, ...props }: ColorPickerEyeDropperProps) => {
	const { setHue, setSaturation, setLightness, setAlpha } = useColorPicker();

	// Vérifier si l'API EyeDropper est supportée
	const isSupported = typeof window !== "undefined" && "EyeDropper" in window;

	const handleEyeDropper = async (): Promise<void> => {
		if (!isSupported) {
			return;
		}

		let hex: string;
		try {
			const eyeDropper = new EyeDropper();
			const result = await eyeDropper.open();
			hex = result.sRGBHex;
		} catch {
			// L'utilisateur a annulé la sélection
			return;
		}

		const { h, s, l } = parseHslFromHex(hex);
		setHue(h);
		setSaturation(s);
		setLightness(l);
		setAlpha(100);
	};

	// Ne pas afficher le bouton si l'API n'est pas supportée
	if (!isSupported) {
		return null;
	}

	return (
		<Button
			data-slot="color-picker-eye-dropper"
			className={cn("text-muted-foreground shrink-0", className)}
			onClick={handleEyeDropper}
			size="icon"
			variant="outline"
			type="button"
			aria-label="Pipette - sélectionner une couleur à l'écran"
			{...props}
		>
			<PipetteIcon size={16} aria-hidden="true" />
		</Button>
	);
};

ColorPickerEyeDropper.displayName = "ColorPickerEyeDropper";
