import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";

interface VerificationEmailProps {
	verificationUrl: string;
}

export const VerificationEmail = ({
	verificationUrl,
}: VerificationEmailProps) => (
	<Html>
		<Head />
		<Preview>Vérifie ton adresse email</Preview>
		<Body style={{ backgroundColor: EMAIL_COLORS.background.main }}>
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
						Synclune
					</Text>
				</Section>

				{/* Titre */}
				<Section style={{ marginBottom: "24px" }}>
					<Text style={EMAIL_STYLES.heading.h2}>Vérification email</Text>
					<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
						Clique sur le bouton ci-dessous pour activer ton compte.
					</Text>
				</Section>

				{/* CTA */}
				<Section style={{ marginBottom: "24px", textAlign: "center" }}>
					<Button href={verificationUrl} style={EMAIL_STYLES.button.primary}>
						Vérifier mon email
					</Button>
				</Section>

				{/* Info */}
				<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "32px" }}>
					<Text style={EMAIL_STYLES.text.small}>
						Ce lien expire dans 24 heures.
					</Text>
				</Section>

				{/* Footer */}
				<Section
					style={{
						paddingTop: "24px",
						borderTop: `1px solid ${EMAIL_COLORS.border}`,
						textAlign: "center",
					}}
				>
					<Text style={EMAIL_STYLES.text.tiny}>
						© {new Date().getFullYear()} Synclune
					</Text>
				</Section>
			</Container>
		</Body>
	</Html>
);

VerificationEmail.PreviewProps = {
	verificationUrl: "https://synclune.fr/verifier-email?token=abc123",
} as VerificationEmailProps;

export default VerificationEmail;
