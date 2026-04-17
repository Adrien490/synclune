"use client";

import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/utils/cn";
import Color from "color";
import { type ChangeEvent, type FocusEvent, useId, useState } from "react";
import { useColorPicker } from "./color-picker";
import { normalizeHex } from "../../utils/hex-normalizer";

type ColorPickerHexInputProps = {
	className?: string;
	disabled?: boolean;
	"aria-label"?: string;
};

function isValidHexLength(raw: string): boolean {
	return /^[0-9A-Fa-f]{3}$/.test(raw) || /^[0-9A-Fa-f]{6}$/.test(raw);
}

export function ColorPickerHexInput({
	className,
	disabled,
	"aria-label": ariaLabel = "Code couleur hexadécimal",
}: ColorPickerHexInputProps) {
	const { hue, saturation, lightness, setFromHex } = useColorPicker();
	const errorId = useId();

	const currentHex = Color.hsl(hue, saturation, lightness).hex();

	const [draft, setDraft] = useState<string>(currentHex);
	const [focused, setFocused] = useState(false);
	const [lastSeenHex, setLastSeenHex] = useState<string>(currentHex);

	// Sync draft with external hex changes without setState-in-effect.
	if (!focused && currentHex !== lastSeenHex) {
		setLastSeenHex(currentHex);
		setDraft(currentHex);
	}

	const cleaned = draft.replace(/^#/, "");
	const isDraftValid = cleaned.length === 0 || isValidHexLength(cleaned);
	const showError = focused && cleaned.length > 0 && !isDraftValid && cleaned.length >= 3;

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		let next = e.target.value.replace(/[^#0-9A-Fa-f]/g, "");
		if (next.length > 7) next = next.slice(0, 7);
		setDraft(next);

		const cleanNext = next.replace(/^#/, "");
		if (isValidHexLength(cleanNext)) {
			setFromHex(normalizeHex(next));
		}
	};

	const commit = () => {
		const value = draft.replace(/^#/, "");
		if (isValidHexLength(value)) {
			const normalized = normalizeHex(draft);
			setDraft(normalized);
			setFromHex(normalized);
		} else {
			setDraft(currentHex);
		}
	};

	const handleBlur = (_e: FocusEvent<HTMLInputElement>) => {
		setFocused(false);
		commit();
	};

	const handleFocus = () => {
		setFocused(true);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			commit();
			(e.target as HTMLInputElement).blur();
		} else if (e.key === "Escape") {
			setDraft(currentHex);
			(e.target as HTMLInputElement).blur();
		}
	};

	return (
		<div className={cn("flex flex-col gap-1", className)}>
			<Input
				data-slot="color-picker-hex-input"
				type="text"
				value={draft}
				onChange={handleChange}
				onBlur={handleBlur}
				onFocus={handleFocus}
				onKeyDown={handleKeyDown}
				disabled={disabled}
				maxLength={7}
				inputMode="text"
				autoCapitalize="characters"
				autoCorrect="off"
				spellCheck={false}
				aria-label={ariaLabel}
				aria-invalid={showError}
				aria-describedby={showError ? errorId : undefined}
				placeholder="#RRGGBB"
				className="font-mono uppercase"
			/>
			{showError && (
				<p id={errorId} className="text-destructive text-xs" role="alert">
					Format invalide. Utilisez #RRGGBB (ex: #FF5733) ou #RGB
				</p>
			)}
		</div>
	);
}

ColorPickerHexInput.displayName = "ColorPickerHexInput";
