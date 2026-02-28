"use client";

import PhoneInput from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";

type PhoneInputProps = React.ComponentProps<typeof PhoneInput>;

/**
 * Pre-bound PhoneInput with flags for lazy loading.
 * Keeps react-phone-number-input (~30KB + flags) out of the initial bundle.
 */
export default function PhoneInputWithFlags(props: PhoneInputProps) {
	return <PhoneInput {...props} flags={flags} />;
}

export type { Country, PhoneInputProps };
