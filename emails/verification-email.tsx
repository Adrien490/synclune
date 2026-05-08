import { Section, Text } from "react-email";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface VerificationEmailProps {
	verificationUrl: string;
}

export const VerificationEmail = ({ verificationUrl }: VerificationEmailProps) => (
	<EmailLayout preview="Vérifiez votre adresse email">
		<Section style={{ marginBottom: "24px" }}>
			<EmailHeading level="h1">Vérification email</EmailHeading>
			<Text
				className={EMAIL_CLASSES.text.body}
				style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
			>
				Cliquez sur le bouton ci-dessous pour activer votre compte.
			</Text>
		</Section>

		<EmailCTA href={verificationUrl} marginBottom="24px">
			Vérifier mon email
		</EmailCTA>

		<EmailCard style={{ marginBottom: "32px" }}>
			<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
				Ce lien expire dans 24 heures.
			</Text>
		</EmailCard>
	</EmailLayout>
);

VerificationEmail.PreviewProps = {
	verificationUrl: "https://synclune.fr/verifier-email?token=abc123",
} as VerificationEmailProps;

export default VerificationEmail;
