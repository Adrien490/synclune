/**
 * Format a Date as `YYYY-MM-DDTHH:mm` (local time) for `<input type="datetime-local">`.
 * Returns `""` for null/undefined inputs.
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
	if (!date) return "";
	const d = date instanceof Date ? date : new Date(date);
	if (Number.isNaN(d.getTime())) return "";
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	const hours = String(d.getHours()).padStart(2, "0");
	const minutes = String(d.getMinutes()).padStart(2, "0");
	return `${year}-${month}-${day}T${hours}:${minutes}`;
}
