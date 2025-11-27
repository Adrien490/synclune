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
							fontSize: "28px",
							fontWeight: "bold",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						Réinitialisation de mot de passe
					</Text>
					<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}>
						Synclune
					</Text>
				</Section>

				<Text style={{ ...EMAIL_STYLES.text.body, marginBottom: "24px" }}>
					Tu as demandé à réinitialiser ton mot de passe. Clique sur le
					bouton ci-dessous pour créer un nouveau mot de passe :
				</Text>

				{/* CTA */}
				<Section style={{ marginBottom: "32px", textAlign: "center" }}>
					<Button href={resetUrl} style={EMAIL_STYLES.button.primary}>
						Réinitialiser mon mot de passe
					</Button>
				</Section>

				{/* Warning */}
				<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "16px" }}>
					<Text
						style={{
							margin: 0,
							fontSize: "14px",
							fontWeight: "600",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						Sécurité
					</Text>
					<Text
						style={{
							margin: "8px 0",
							fontSize: "14px",
							lineHeight: "1.6",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						Ce lien expire dans 1 heure.
					</Text>
					<Text
						style={{
							margin: 0,
							fontSize: "14px",
							lineHeight: "1.6",
							color: EMAIL_COLORS.text.secondary,
						}}
					>
						Si tu n'as pas demandé cette réinitialisation, tu peux
						ignorer cet email. Ton mot de passe actuel reste inchangé.
					</Text>
				</Section>

				{/* Signature */}
				<Section
					style={{
						marginTop: "32px",
						paddingTop: "24px",
						borderTop: `1px solid ${EMAIL_COLORS.border}`,
						textAlign: "center",
					}}
				>
					<Text
						style={{
							margin: 0,
							fontSize: "16px",
							fontWeight: "600",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						Synclune
					</Text>
					<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "4px" }}>
						Créations artisanales
					</Text>
				</Section>
			</Container>
		</Body>
	</Html>
);

PasswordResetEmail.PreviewProps = {
	resetUrl: "https://synclune.com/reinitialiser-mot-de-passe?token=abc123",
} as PasswordResetEmailProps;

export default PasswordResetEmail;
