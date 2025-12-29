"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import Color from "color";
import { PipetteIcon } from "lucide-react";
import { useColorPicker } from "./color-picker";
import type { ColorPickerEyeDropperProps } from "./types";

export const ColorPickerEyeDropper = ({
	className,
	...props
}: ColorPickerEyeDropperProps) => {
	const { setHue, setSaturation, setLightness, setAlpha } = useColorPicker();

	// Vérifier si l'API EyeDropper est supportée
	const isSupported = typeof window !== "undefined" && "EyeDropper" in window;

	const handleEyeDropper = async (): Promise<void> => {
		if (!isSupported) {
			return;
		}

		try {
			// @ts-expect-error - EyeDropper API is experimental
			const eyeDropper = new EyeDropper();
			const result = await eyeDropper.open();
			const color = Color(result.sRGBHex);
			const [h, s, l] = color.hsl().array();

			setHue(h);
			setSaturation(s);
			setLightness(l);
			setAlpha(100);
		} catch {
			// L'utilisateur a annulé la sélection
		}
	};

	// Ne pas afficher le bouton si l'API n'est pas supportée
	if (!isSupported) {
		return null;
	}

	return (
		<Button
			data-slot="color-picker-eye-dropper"
			className={cn("shrink-0 text-muted-foreground", className)}
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
