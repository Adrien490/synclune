/**
 * Pastille couleur pour emails transactionnels.
 *
 * Rend un cercle simulant `buildSwatchStyle` côté storefront — mais en HTML
 * email-compatible (Gmail / iOS Mail / Apple Mail / Outlook 365 web).
 *
 * - 1 couleur : un cercle uni `backgroundColor`.
 * - 2 couleurs : 2 demi-cercles via une table 1×2 (compatible Outlook desktop).
 * - 3+ couleurs : 3 secteurs via une table 1×3 (approximation conic-gradient).
 *
 * Outlook desktop ne supporte pas `border-radius` — on accepte le carré comme
 * fallback gracieux (la couleur reste lisible, le contexte texte clarifie).
 */
const SIZE_PX = 14;

interface EmailColorSwatchProps {
	hexes: string[];
	ariaLabel?: string;
}

export function EmailColorSwatch({ hexes, ariaLabel }: EmailColorSwatchProps) {
	if (hexes.length === 0) return null;

	const baseStyle = {
		display: "inline-block",
		width: `${SIZE_PX}px`,
		height: `${SIZE_PX}px`,
		borderRadius: "9999px",
		verticalAlign: "middle",
		marginRight: "6px",
		border: "1px solid rgba(0,0,0,0.08)",
	} as const;

	if (hexes.length === 1) {
		return (
			<span
				style={{ ...baseStyle, backgroundColor: hexes[0] }}
				aria-label={ariaLabel ?? "Pastille couleur"}
				role="img"
			/>
		);
	}

	const sliceWidth = `${100 / hexes.length}%`;

	return (
		<span
			style={{ ...baseStyle, overflow: "hidden", padding: 0 }}
			aria-label={ariaLabel ?? "Pastilles couleurs combinées"}
			role="img"
		>
			<table
				cellPadding={0}
				cellSpacing={0}
				border={0}
				style={{ width: "100%", height: "100%", borderCollapse: "collapse" }}
			>
				<tbody>
					<tr>
						{hexes.map((hex, i) => (
							<td
								key={`${hex}-${i}`}
								style={{
									backgroundColor: hex,
									width: sliceWidth,
									height: `${SIZE_PX}px`,
									padding: 0,
									lineHeight: 0,
								}}
							>
								&nbsp;
							</td>
						))}
					</tr>
				</tbody>
			</table>
		</span>
	);
}

/** Helper : parse le snapshot CSV `skuColorHexes` en array sécurisé (filtre `#xxxxxx`). */
export function parseSkuColorHexes(csv: string | null | undefined): string[] {
	if (!csv) return [];
	return csv
		.split(",")
		.map((s) => s.trim())
		.filter((s) => /^#[0-9A-Fa-f]{6}$/.test(s));
}
