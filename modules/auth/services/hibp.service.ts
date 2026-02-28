import { createHash } from "crypto";

/**
 * Check if a password has been compromised using the HIBP k-anonymity API.
 *
 * Only sends the first 5 characters of the SHA-1 hash to the API,
 * preserving password confidentiality (k-anonymity model).
 *
 * @returns The number of times the password has been seen in breaches, or 0 if not found.
 * Returns 0 on network errors to avoid blocking user actions.
 */
export async function checkPasswordBreached(password: string): Promise<number> {
	try {
		const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
		const prefix = sha1.slice(0, 5);
		const suffix = sha1.slice(5);

		const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
			headers: { "Add-Padding": "true" },
			signal: AbortSignal.timeout(3000),
		});

		if (!response.ok) {
			return 0;
		}

		const body = await response.text();

		for (const line of body.split("\n")) {
			const [hash, count] = line.split(":");
			if (hash?.trim() === suffix) {
				return parseInt(count?.trim() ?? "0", 10);
			}
		}

		return 0;
	} catch {
		// Network error, timeout, etc. — don't block the user
		return 0;
	}
}
