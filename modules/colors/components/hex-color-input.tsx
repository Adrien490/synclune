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

const VALID_HEX_REGEX = /^#[0-9A-F]{6}$/;
const DEFAULT_PICKER_FALLBACK = "#000000";

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
	return DEFAULT_PICKER_FALLBACK;
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
	// Last valid 6-char hex seen — used as the native color picker fallback so
	// the swatch keeps showing the last meaningful colour when the controlled
	// value transitions to empty/invalid (e.g. user clicks Clear). Without this,
	// expandToSixDigit("") would surface #000000 and falsely imply a black value.
	const [lastValidHex, setLastValidHex] = useState(() => {
		const normalized = normalizeHex(value);
		return VALID_HEX_REGEX.test(normalized) ? normalized : DEFAULT_PICKER_FALLBACK;
	});
	const [blurAnnouncement, setBlurAnnouncement] = useState("");

	if (lastSyncedValue !== value) {
		setLastSyncedValue(value);
		setText(stripHash(normalizeHex(value)));
		const normalized = normalizeHex(value);
		if (VALID_HEX_REGEX.test(normalized) && normalized !== lastValidHex) {
			setLastValidHex(normalized);
		}
	}

	const inputId = id ?? "hex-color-input";

	const handleTextChange = (raw: string) => {
		if (blurAnnouncement) setBlurAnnouncement("");
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
		// Invalid intermediate length (1, 2, 4 or 5 chars): revert to last
		// committed value and announce to assistive tech so the disappearance is
		// not silent (WCAG 3.3.1 — input assistance).
		setText(stripHash(normalizeHex(value)));
		setBlurAnnouncement("Code couleur incomplet, valeur précédente restaurée");
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
		setBlurAnnouncement("");
		onChange("");
		haptic("light");
	};

	// Native color picker preserves the last meaningful hex when the controlled
	// value is empty or partial — avoids flashing #000000 mid-clear (F2 audit).
	const cleanedValue = stripHash(value);
	const pickerValue =
		cleanedValue.length === 3 || cleanedValue.length === 6 ? expandToSixDigit(value) : lastValidHex;

	return (
		<div className="flex flex-col gap-2" data-slot="hex-color-input">
			<div className="flex items-stretch gap-2">
				<div className="border-border relative size-11 shrink-0 overflow-hidden rounded-md border">
					<input
						type="color"
						aria-label="Sélecteur de couleur visuel"
						value={pickerValue}
						onChange={handleNativeChange}
						disabled={disabled}
						className="focus-ring absolute inset-0 size-full cursor-pointer appearance-none border-0 bg-transparent p-0 disabled:cursor-not-allowed [&::-moz-color-swatch]:rounded-none [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-none [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
					/>
				</div>
				{/* Placeholder rendu en SSR pour éviter le CLS quand le bouton EyeDropper
				 * monte post-hydration sur Chrome/Edge desktop. Coût : 44px+gap réservés
				 * sur tous les browsers ; CLS zero acceptée par audit. */}
				<span className="inline-block size-11 shrink-0" aria-hidden={!hasEyeDropper}>
					{hasEyeDropper && (
						<button
							type="button"
							onClick={handleEyeDropper}
							disabled={disabled}
							aria-label="Piocher une couleur à l'écran"
							title="Piocher une couleur à l'écran"
							className="focus-ring border-border bg-background hover:bg-muted inline-flex size-full items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-colors"
						>
							<Pipette className="size-4" aria-hidden="true" />
						</button>
					)}
				</span>
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
						pattern="[0-9A-Fa-f]*"
						autoCapitalize="characters"
						autoComplete="off"
						autoCorrect="off"
						spellCheck={false}
						maxLength={6}
						aria-invalid={ariaInvalid ? true : undefined}
						aria-describedby={ariaDescribedBy ?? `${inputId}-help`}
						className={cn(
							"focus-ring border-input min-h-11 w-full min-w-0 rounded-md border bg-transparent py-2 pl-7 font-mono text-base tracking-wider shadow-xs motion-safe:transition-[color,box-shadow,border-color] md:text-sm",
							text.length > 0 ? "pr-9" : "pr-3",
							"hover:border-ring/70",
							"aria-invalid:border-destructive aria-invalid:ring-destructive/20",
							"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
						)}
					/>
					{text.length > 0 && !disabled && (
						<button
							type="button"
							onClick={handleClear}
							aria-label="Effacer le code couleur"
							className="focus-ring text-muted-foreground hover:text-foreground absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded"
						>
							<X className="size-3.5" aria-hidden="true" />
						</button>
					)}
				</div>
			</div>
			<p id={`${inputId}-help`} className="text-muted-foreground text-xs">
				Format hexadécimal sur 3 ou 6 caractères (ex : F57 ou FF5733)
			</p>
			<span role="status" aria-live="polite" className="sr-only">
				{blurAnnouncement}
			</span>
		</div>
	);
}

HexColorInput.displayName = "HexColorInput";
