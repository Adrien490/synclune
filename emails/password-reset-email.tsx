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

interface PasswordResetEmailProps {
	resetUrl: string;
}

export const PasswordResetEmail = ({ resetUrl }: PasswordResetEmailProps) => (
	<Html>
		<Head />
		<Preview>Réinitialise ton mot de passe</Preview>
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
					<Text style={EMAIL_STYLES.heading.h2}>Réinitialisation</Text>
					<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
						Clique sur le bouton ci-dessous pour créer un nouveau mot de passe.
					</Text>
				</Section>

				{/* CTA */}
				<Section style={{ marginBottom: "24px", textAlign: "center" }}>
					<Button href={resetUrl} style={EMAIL_STYLES.button.primary}>
						Réinitialiser
					</Button>
				</Section>

				{/* Info */}
				<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "32px" }}>
					<Text style={EMAIL_STYLES.text.small}>
						Ce lien expire dans 1 heure. Si tu n'as pas demandé cette
						réinitialisation, ignore cet email.
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

PasswordResetEmail.PreviewProps = {
	resetUrl: "https://synclune.fr/reinitialiser-mot-de-passe?token=abc123",
} as PasswordResetEmailProps;

export default PasswordResetEmail;
