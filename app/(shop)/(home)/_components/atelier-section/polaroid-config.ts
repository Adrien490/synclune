import type { WashiTapeColor, WashiTapePosition } from "@/shared/components/polaroid-frame";

export type GlowColor = "pink" | "lavender" | "mint" | "yellow";

export interface PolaroidConfig {
	id: string;
	caption: string;
	label: string;
	tiltDegree: number;
	washiColor: WashiTapeColor;
	washiPosition: WashiTapePosition;
	captionColor: string;
	captionRotate: number;
	vintage: boolean;
	glowColor: GlowColor;
	scatterClass: string;
	scatterVars: React.CSSProperties;
}

export const GLOW_CLASSES: Record<GlowColor, string> = {
	pink: "hover:shadow-[0_0_25px_var(--color-glow-pink),var(--shadow-lift)]",
	lavender: "hover:shadow-[0_0_25px_var(--color-glow-lavender),var(--shadow-lift)]",
	mint: "hover:shadow-[0_0_25px_var(--color-glow-mint),var(--shadow-lift)]",
	yellow: "hover:shadow-[0_0_25px_var(--color-glow-yellow),var(--shadow-lift)]",
};

export const GLOW_CSS_VARS: Record<GlowColor, string> = {
	pink: "var(--color-glow-pink)",
	lavender: "var(--color-glow-lavender)",
	mint: "var(--color-glow-mint)",
	yellow: "var(--color-glow-yellow)",
};

export const POLAROIDS: PolaroidConfig[] = [
	{
		id: "hands",
		caption: "Les mains dans les perles !",
		label: "Mains de Léane assemblant un bijou",
		tiltDegree: -3,
		washiColor: "pink",
		washiPosition: "top-left",
		captionColor: "var(--polaroid-caption-mauve)",
		captionRotate: -1.5,
		vintage: true,
		glowColor: "pink",
		scatterClass: "lg:-translate-y-2 lg:translate-x-1",
		scatterVars: {
			"--scatter-x": "40px",
			"--scatter-y": "-60px",
			"--scatter-rotate": "-8deg",
		} as React.CSSProperties,
	},
	{
		id: "materials",
		caption: "Mes petits trésors",
		label: "Perles et matériaux colorés Synclune",
		tiltDegree: 1.5,
		washiColor: "lavender",
		washiPosition: "top-right",
		captionColor: "var(--polaroid-caption-violet)",
		captionRotate: 1,
		vintage: true,
		glowColor: "lavender",
		scatterClass: "lg:translate-y-3 lg:-translate-x-1",
		scatterVars: {
			"--scatter-x": "-30px",
			"--scatter-y": "50px",
			"--scatter-rotate": "6deg",
		} as React.CSSProperties,
	},
	{
		id: "inspiration",
		caption: "L'inspiration du jour",
		label: "Carnet d'inspiration de Léane, créatrice Synclune",
		tiltDegree: -1,
		washiColor: "mint",
		washiPosition: "top-left",
		captionColor: "var(--polaroid-caption-green)",
		captionRotate: -0.5,
		vintage: true,
		glowColor: "mint",
		scatterClass: "lg:translate-y-1 lg:translate-x-2",
		scatterVars: {
			"--scatter-x": "50px",
			"--scatter-y": "40px",
			"--scatter-rotate": "10deg",
		} as React.CSSProperties,
	},
	{
		id: "workspace",
		caption: "Mon coin créatif",
		label: "Vue de l'atelier Synclune",
		tiltDegree: 2.5,
		washiColor: "peach",
		washiPosition: "top-right",
		captionColor: "var(--polaroid-caption-brown)",
		captionRotate: 0.8,
		vintage: true,
		glowColor: "yellow",
		scatterClass: "lg:-translate-y-3 lg:-translate-x-1",
		scatterVars: {
			"--scatter-x": "-40px",
			"--scatter-y": "-50px",
			"--scatter-rotate": "-12deg",
		} as React.CSSProperties,
	},
];
