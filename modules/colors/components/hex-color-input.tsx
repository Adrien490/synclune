"use client";

import { Pipette, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { normalizeHex } from "../utils/hex-normalizer";

// EyeDropper API feature detect — Chrome 95+ / Edge 95+ desktop only.
// useSyncExternalStore garantit la cohérence SSR (false) → CSR (true) sans
// hydration mismatch et sans hook useEffect+useState (anti-pattern React 19).
type EyeDropperWindow = Window & {
	EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
};
const noopSubscribe = () => () => {};
const getEyeDropperSnapshot = () =>
	typeof window !== "undefined" && "EyeDropper" in (window as EyeDropperWindow);
const getEyeDropperServerSnapshot = () => false;

type HexColorInputProps = {
	value: string;
	onChange: (hex: string) => void;
	disabled?: boolean;
	id?: string;
	name?: string;
	"aria-invalid"?: boolean;
	"aria-describedby"?: string;
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

export function HexColorInput({
	value,
	onChange,
	disabled,
	id,
	name,
	"aria-invalid": ariaInvalid,
	"aria-describedby": ariaDescribedBy,
}: HexColorInputProps) {
	const haptic = useHaptic();
	const hasEyeDropper = useSyncExternalStore(
		noopSubscribe,
		getEyeDropperSnapshot,
		getEyeDropperServerSnapshot,
	);
	// Local text state for the raw input being typed (allows partial input "F5").
	// Sync with the controlled `value` prop using "Adjusting state during render"
	// (React docs) — only resets when the parent updates the prop, not when
	// handlers emit (which would clobber typed-in characters). Stored in state
	// (not a ref) so the eslint react-hooks/refs rule stays clean.
	const [text, setText] = useState(() => stripHash(normalizeHex(value)));
	const [lastSyncedValue, setLastSyncedValue] = useState(value);
	if (lastSyncedValue !== value) {
		setLastSyncedValue(value);
		setText(stripHash(normalizeHex(value)));
	}

	const inputId = id ?? "hex-color-input";

	const handleTextChange = (raw: string) => {
		const cleaned = raw
			.replace(/[^0-9A-Fa-f]/g, "")
			.slice(0, 6)
			.toUpperCase();
		setText(cleaned);
		if (cleaned.length === 6) {
			const normalized = normalizeHex(`#${cleaned}`);
			if (normalized !== normalizeHex(value)) {
				onChange(normalized);
				haptic("light");
			}
		}
	};

	const handleTextBlur = () => {
		if (text.length === 0 || text.length === 6) return;
		if (text.length === 3) {
			const normalized = normalizeHex(`#${text}`);
			setText(stripHash(normalized));
			if (normalized !== normalizeHex(value)) {
				onChange(normalized);
				haptic("light");
			}
			return;
		}
		// Invalid intermediate length: revert to last committed value
		setText(stripHash(normalizeHex(value)));
	};

	const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (disabled) return;
		const normalized = normalizeHex(e.target.value);
		if (normalized !== normalizeHex(value)) {
			onChange(normalized);
			haptic("selection");
		}
	};

	const handleEyeDropper = async () => {
		if (disabled || !hasEyeDropper) return;
		try {
			const eyeDropper = new (window as EyeDropperWindow).EyeDropper!();
			const result = await eyeDropper.open();
			const normalized = normalizeHex(result.sRGBHex);
			if (normalized !== normalizeHex(value)) {
				onChange(normalized);
				haptic("success");
			}
		} catch {
			// User cancelled (AbortError) — no-op
		}
	};

	const handleClear = () => {
		if (disabled) return;
		setText("");
		onChange("");
	};

	return (
		<div className="flex flex-col gap-2" data-slot="hex-color-input">
			<div className="flex items-stretch gap-2">
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
				{hasEyeDropper && (
					<button
						type="button"
						onClick={handleEyeDropper}
						disabled={disabled}
						aria-label="Piocher une couleur à l'écran"
						title="Piocher une couleur à l'écran"
						className="border-border bg-background hover:bg-muted focus-visible:ring-ring inline-flex size-11 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Pipette className="size-4" aria-hidden="true" />
					</button>
				)}
				<div className="relative flex-1">
					<span
						className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-base select-none md:text-sm"
						aria-hidden="true"
					>
						#
					</span>
					<input
						id={inputId}
						name={name}
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
						aria-invalid={ariaInvalid ?? false}
						aria-describedby={ariaDescribedBy ?? `${inputId}-help`}
						className={cn(
							"border-input min-h-11 w-full min-w-0 rounded-md border bg-transparent py-2 pl-7 font-mono text-base tracking-wider shadow-xs transition-[color,box-shadow,border-color] outline-none md:text-sm",
							text.length > 0 ? "pr-9" : "pr-3",
							"hover:border-ring/70",
							"focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-[3px]",
							"aria-invalid:border-destructive aria-invalid:ring-destructive/20",
							"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
						)}
					/>
					{text.length > 0 && !disabled && (
						<button
							type="button"
							onClick={handleClear}
							aria-label="Effacer le code couleur"
							className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
						>
							<X className="size-3.5" aria-hidden="true" />
						</button>
					)}
				</div>
			</div>
			<p id={`${inputId}-help`} className="text-muted-foreground text-xs">
				Format hexadécimal sur 3 ou 6 caractères (ex : F57 ou FF5733)
			</p>
		</div>
	);
}

HexColorInput.displayName = "HexColorInput";
