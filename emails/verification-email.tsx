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
							fontSize: "28px",
							fontWeight: "bold",
							color: EMAIL_COLORS.primary,
						}}
					>
						Bienvenue sur Synclune
					</Text>
					<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}>
						Vérifie ton email
					</Text>
				</Section>

				<Text style={{ ...EMAIL_STYLES.text.body, marginBottom: "24px" }}>
					Merci de t'être inscrit sur Synclune. Pour activer ton compte,
					clique sur le bouton ci-dessous :
				</Text>

				{/* CTA */}
				<Section style={{ marginBottom: "32px", textAlign: "center" }}>
					<Button href={verificationUrl} style={EMAIL_STYLES.button.primary}>
						Vérifier mon email
					</Button>
				</Section>

				{/* Info */}
				<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "32px" }}>
					<Text
						style={{
							margin: 0,
							fontSize: "14px",
							lineHeight: "1.6",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						Ce lien expire dans 24 heures. Si tu n'as pas créé de compte,
						tu peux ignorer cet email.
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

VerificationEmail.PreviewProps = {
	verificationUrl: "https://synclune.com/verifier-email?token=abc123",
} as VerificationEmailProps;

export default VerificationEmail;
