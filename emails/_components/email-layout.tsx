import {
	Body,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "../email-colors";

interface EmailLayoutProps {
	preview: string;
	headerText?: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
}

/**
 * Shared email layout with lang="fr", consistent header/footer, font-family
 */
export function EmailLayout({
	preview,
	headerText = "Synclune",
	children,
	footer,
}: EmailLayoutProps) {
	return (
		<Html lang="fr">
			<Head />
			<Preview>{preview}</Preview>
			<Body
				style={{
					backgroundColor: EMAIL_COLORS.background.main,
					...EMAIL_STYLES.body,
				}}
			>
				<Container style={EMAIL_STYLES.container}>
					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Text
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
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
							textAlign: "center",
						}}
					>
						{footer}
						<Text
							style={{
								...EMAIL_STYLES.text.tiny,
								...(footer ? { marginTop: "12px" } : {}),
							}}
						>
							&copy; {new Date().getFullYear()} Synclune
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}
