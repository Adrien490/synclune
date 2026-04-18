import { Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { ErrorCodeBlock } from "./_components/error-code-block";
import { FlexRow } from "./_components/flex-row";

interface AdminCronFailedEmailProps {
	job: string;
	errors: number;
	details: Record<string, unknown>;
	dashboardUrl: string;
}

export const AdminCronFailedEmail = ({
	job,
	errors,
	details,
	dashboardUrl,
}: AdminCronFailedEmailProps) => {
	const detailLines = Object.entries(details)
		.map(([key, value]) => `${key}: ${value}`)
		.join("\n");

	return (
		<EmailLayout
			preview={`Cron ${job} — ${errors} erreur(s)`}
			headerText="Échec cron job"
			footer={
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.tiny}>
					Vérifiez les logs Vercel pour plus d'informations.
				</Text>
			}
		>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Action manuelle peut-être requise
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<FlexRow
					style={{ marginBottom: "8px" }}
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Cron job
						</Text>
					}
					right={
						<Text
							className={EMAIL_CLASSES.text.body}
							style={{
								margin: 0,
								fontFamily: "monospace",
								fontSize: "14px",
								fontWeight: "bold",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							{job}
						</Text>
					}
				/>
				<FlexRow
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Erreurs
						</Text>
					}
					right={
						<Text
							className={EMAIL_CLASSES.text.body}
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: "bold",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							{errors}
						</Text>
					}
				/>
			</EmailCard>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Détails
				</EmailHeading>
				<ErrorCodeBlock error={detailLines} />
			</Section>

			<EmailCTA href={dashboardUrl}>Voir le dashboard</EmailCTA>
		</EmailLayout>
	);
};

AdminCronFailedEmail.PreviewProps = {
	job: "cleanup-carts",
	errors: 3,
	details: {
		processed: 12,
		failed: 3,
		lastError: "Connection timeout after 30s",
	},
	dashboardUrl: "https://synclune.fr/admin",
} as AdminCronFailedEmailProps;

export default AdminCronFailedEmail;
