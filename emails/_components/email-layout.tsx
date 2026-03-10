import { Body, Container, Head, Html, Link, Preview, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_COLORS_DARK, EMAIL_STYLES } from "../email-colors";

interface EmailLayoutProps {
	preview: string;
	headerText?: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
}

/**
 * Dark mode CSS injected into <Head>.
 * Targets body, container, cards, text, and buttons.
 * Uses !important to override inline styles in dark mode clients.
 */
const DARK_MODE_STYLES = `
	:root { color-scheme: light dark; }
	@media (prefers-color-scheme: dark) {
		body { background-color: ${EMAIL_COLORS_DARK.background.main} !important; }
		.email-container {
			background-color: ${EMAIL_COLORS_DARK.background.white} !important;
			border-color: ${EMAIL_COLORS_DARK.border} !important;
		}
		.email-card { background-color: ${EMAIL_COLORS_DARK.background.card} !important; }
		.email-footer { border-color: ${EMAIL_COLORS_DARK.border} !important; }
		h1, h2, h3, .email-text-primary { color: ${EMAIL_COLORS_DARK.text.primary} !important; }
		.email-text-secondary { color: ${EMAIL_COLORS_DARK.text.secondary} !important; }
		.email-header { color: ${EMAIL_COLORS_DARK.primary} !important; }
		.email-code-block { background-color: #111111 !important; }
	}
`;

/**
 * Shared email layout with lang="fr", dark mode, consistent header/footer, font-family
 */
export function EmailLayout({
	preview,
	headerText = "Synclune",
	children,
	footer,
}: EmailLayoutProps) {
	return (
		<Html lang="fr">
			<Head>
				<meta name="color-scheme" content="light dark" />
				<meta name="supported-color-schemes" content="light dark" />
				<style dangerouslySetInnerHTML={{ __html: DARK_MODE_STYLES }} />
			</Head>
			<Preview>{preview}</Preview>
			<Body
				style={{
					backgroundColor: EMAIL_COLORS.background.main,
					...EMAIL_STYLES.body,
				}}
			>
				<Container className="email-container" style={EMAIL_STYLES.container}>
					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Text
							className="email-header"
							style={{
								margin: 0,
								fontSize: "24px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							{headerText}
						</Text>
					</Section>

					{children}

					{/* Footer */}
					<Section
						className="email-footer"
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
							textAlign: "center",
						}}
					>
						{footer}
						<Text
							className="email-text-secondary"
							style={{
								...EMAIL_STYLES.text.tiny,
								...(footer ? { marginTop: "12px" } : {}),
							}}
						>
							&copy; {new Date().getFullYear()} Synclune — Bijoux artisanaux faits main
						</Text>
						<Text
							className="email-text-secondary"
							style={{
								...EMAIL_STYLES.text.tiny,
								marginTop: "4px",
							}}
						>
							33600 Pessac, France
						</Text>
						<Text
							className="email-text-secondary"
							style={{
								...EMAIL_STYLES.text.tiny,
								marginTop: "4px",
							}}
						>
							Micro-entreprise — SIREN 839 183 027
						</Text>
						<Text
							className="email-text-secondary"
							style={{
								...EMAIL_STYLES.text.tiny,
								marginTop: "4px",
							}}
						>
							TVA non applicable, article 293 B du CGI
						</Text>
						<Text
							className="email-text-secondary"
							style={{
								...EMAIL_STYLES.text.tiny,
								marginTop: "4px",
							}}
						>
							<Link
								href="https://synclune.fr/contact"
								style={{
									color: EMAIL_COLORS.text.secondary,
									textDecoration: "underline",
								}}
							>
								Nous contacter
							</Link>
							{" · "}
							<Link
								href="https://synclune.fr/mentions-legales"
								style={{
									color: EMAIL_COLORS.text.secondary,
									textDecoration: "underline",
								}}
							>
								Mentions légales
							</Link>
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}
