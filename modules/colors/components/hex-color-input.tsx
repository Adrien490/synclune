"use client";

import { useEffect, useRef, useState } from "react";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { normalizeHex } from "../utils/hex-normalizer";

type HexColorInputProps = {
	value: string;
	onChange: (hex: string) => void;
	disabled?: boolean;
	id?: string;
};

function stripHash(hex: string): string {
	return hex.replace(/^#/, "").toUpperCase();
}

function expandToSixDigit(hex: string): string {
	const cleaned = stripHash(hex);
	if (cleaned.length === 3) {
		return `#${cleaned
			.split("")
			.map((c) => c + c)
			.join("")}`;
	}
	if (cleaned.length === 6) return `#${cleaned}`;
	return "#000000";
}

export function HexColorInput({ value, onChange, disabled, id }: HexColorInputProps) {
	const haptic = useHaptic();
	const [text, setText] = useState(() => stripHash(value));
	const lastEmittedRef = useRef<string>(normalizeHex(value));

	useEffect(() => {
		const normalized = normalizeHex(value);
		if (normalized !== lastEmittedRef.current) {
			setText(stripHash(normalized));
			lastEmittedRef.current = normalized;
		}
	}, [value]);

	const isPartial = text.length > 0 && text.length !== 6;

	const inputId = id ?? "hex-color-input";

	const handleTextChange = (raw: string) => {
		const cleaned = raw
			.replace(/[^0-9A-Fa-f]/g, "")
			.slice(0, 6)
			.toUpperCase();
		setText(cleaned);
		if (cleaned.length === 6) {
			const normalized = normalizeHex(`#${cleaned}`);
			if (normalized !== lastEmittedRef.current) {
				lastEmittedRef.current = normalized;
				onChange(normalized);
				haptic("light");
			}
		}
	};

	const handleTextBlur = () => {
		if (text.length === 0 || text.length === 6) return;
		if (text.length === 3) {
			const normalized = normalizeHex(`#${text}`);
			if (normalized !== lastEmittedRef.current) {
				lastEmittedRef.current = normalized;
				setText(stripHash(normalized));
				onChange(normalized);
				haptic("light");
			}
			return;
		}
		setText(stripHash(lastEmittedRef.current));
	};

	const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (disabled) return;
		const normalized = normalizeHex(e.target.value);
		if (normalized === lastEmittedRef.current) return;
		lastEmittedRef.current = normalized;
		setText(stripHash(normalized));
		onChange(normalized);
		haptic("selection");
	};

	return (
		<div className="flex flex-col gap-2" data-slot="hex-color-input">
			<label htmlFor={inputId} className="text-muted-foreground text-xs font-medium">
				Ou code personnalisé
			</label>
			<div className="flex items-stretch gap-3">
				<div className="border-border relative size-11 shrink-0 overflow-hidden rounded-md border">
					<input
						type="color"
						aria-label="Sélecteur de couleur visuel"
						value={expandToSixDigit(value)}
						onChange={handleNativeChange}
						disabled={disabled}
						className="absolute inset-0 size-full cursor-pointer appearance-none border-0 bg-transparent p-0 disabled:cursor-not-allowed [&::-moz-color-swatch]:rounded-none [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-none [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
					/>
				</div>
				<div className="relative flex-1">
					<span
						className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-base select-none md:text-sm"
						aria-hidden="true"
					>
						#
					</span>
					<input
						id={inputId}
						type="text"
						value={text}
						onChange={(e) => handleTextChange(e.target.value)}
						onBlur={handleTextBlur}
						disabled={disabled}
						placeholder="FF5733"
						inputMode="text"
						autoCapitalize="characters"
						autoComplete="off"
						autoCorrect="off"
						spellCheck={false}
						maxLength={6}
						aria-invalid={isPartial}
						aria-describedby={`${inputId}-help`}
						className={cn(
							"border-input min-h-11 w-full min-w-0 rounded-md border bg-transparent py-2 pr-3 pl-7 font-mono text-base tracking-wider shadow-xs transition-[color,box-shadow,border-color] outline-none md:text-sm",
							"hover:border-ring/70",
							"focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-[3px]",
							"aria-invalid:border-destructive aria-invalid:ring-destructive/20",
							"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
						)}
					/>
				</div>
			</div>
			<p id={`${inputId}-help`} className="text-muted-foreground text-xs">
				Format hexadécimal sur 3 ou 6 caractères (ex : F57 ou FF5733)
			</p>
		</div>
	);
}

HexColorInput.displayName = "HexColorInput";
