import { Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface PasswordResetEmailProps {
	resetUrl: string;
}

export const PasswordResetEmail = ({ resetUrl }: PasswordResetEmailProps) => (
	<EmailLayout preview="Réinitialisez votre mot de passe">
		<Section style={{ marginBottom: "24px" }}>
			<EmailHeading level="h1">Réinitialisation</EmailHeading>
			<Text
				className={EMAIL_CLASSES.text.body}
				style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
			>
				Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
			</Text>
		</Section>

		<EmailCTA href={resetUrl} marginBottom="24px">
			Réinitialiser
		</EmailCTA>

		<EmailCard style={{ marginBottom: "32px" }}>
			<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
				Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet
				email.
			</Text>
		</EmailCard>
	</EmailLayout>
);

PasswordResetEmail.PreviewProps = {
	resetUrl: "https://synclune.fr/reinitialiser-mot-de-passe?token=abc123",
} as PasswordResetEmailProps;

export default PasswordResetEmail;
