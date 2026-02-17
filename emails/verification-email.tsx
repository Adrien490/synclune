import { Button, Section, Text } from "@react-email/components";
import { EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface VerificationEmailProps {
	verificationUrl: string;
}

export const VerificationEmail = ({
	verificationUrl,
}: VerificationEmailProps) => (
	<EmailLayout preview="Vérifiez votre adresse email">
		{/* Titre */}
		<Section style={{ marginBottom: "24px" }}>
			<Text style={EMAIL_STYLES.heading.h2}>Vérification email</Text>
			<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
				Cliquez sur le bouton ci-dessous pour activer votre compte.
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
	</EmailLayout>
);

VerificationEmail.PreviewProps = {
	verificationUrl: "https://synclune.fr/verifier-email?token=abc123",
} as VerificationEmailProps;

export default VerificationEmail;
