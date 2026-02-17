import { Button, Section, Text } from "@react-email/components";
import { EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface PasswordResetEmailProps {
	resetUrl: string;
}

export const PasswordResetEmail = ({ resetUrl }: PasswordResetEmailProps) => (
	<EmailLayout preview="Réinitialisez votre mot de passe">
		{/* Titre */}
		<Section style={{ marginBottom: "24px" }}>
			<Text style={EMAIL_STYLES.heading.h2}>Réinitialisation</Text>
			<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
				Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
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
				Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette
				réinitialisation, ignorez cet email.
			</Text>
		</Section>
	</EmailLayout>
);

PasswordResetEmail.PreviewProps = {
	resetUrl: "https://synclune.fr/reinitialiser-mot-de-passe?token=abc123",
} as PasswordResetEmailProps;

export default PasswordResetEmail;
