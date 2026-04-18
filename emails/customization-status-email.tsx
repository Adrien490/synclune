import { Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

type CustomizationStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface CustomizationStatusEmailProps {
	firstName: string;
	productTypeLabel: string;
	status: CustomizationStatus;
	adminNotes?: string | null;
	details: string;
	shopUrl?: string;
}

const STATUS_CONFIG: Record<CustomizationStatus, { title: string; preview: string; body: string }> =
	{
		IN_PROGRESS: {
			title: "Personnalisation en cours",
			preview: "Votre personnalisation est en cours de réalisation",
			body: "Bonne nouvelle ! Votre demande de personnalisation est en cours de réalisation par notre artisan. Nous vous tiendrons informé(e) de l'avancement.",
		},
		COMPLETED: {
			title: "Personnalisation terminée !",
			preview: "Votre personnalisation est terminée",
			body: "Votre personnalisation est terminée ! Notre artisan a finalisé votre création avec le plus grand soin.",
		},
		CANCELLED: {
			title: "Demande de personnalisation annulée",
			preview: "Votre demande de personnalisation a été annulée",
			body: "Nous sommes désolés de vous informer que votre demande de personnalisation a été annulée. Si vous avez des questions, n'hésitez pas à nous contacter.",
		},
	};

export const CustomizationStatusEmail = ({
	firstName,
	productTypeLabel,
	status,
	adminNotes,
	details,
	shopUrl = "https://synclune.fr/creations",
}: CustomizationStatusEmailProps) => {
	const config = STATUS_CONFIG[status];

	return (
		<EmailLayout preview={config.preview}>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">{config.title}</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {firstName}, {config.body.charAt(0).toLowerCase()}
					{config.body.slice(1)}
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<Text
					className={EMAIL_CLASSES.text.secondary}
					style={{ ...EMAIL_STYLES.text.small, marginBottom: "4px" }}
				>
					Type de création
				</Text>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{
						margin: "0 0 12px 0",
						fontSize: "14px",
						fontWeight: "600",
						color: EMAIL_COLORS.text.primary,
					}}
				>
					{productTypeLabel}
				</Text>
				<Text
					className={EMAIL_CLASSES.text.secondary}
					style={{ ...EMAIL_STYLES.text.small, marginBottom: "4px" }}
				>
					Détails
				</Text>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{
						margin: 0,
						fontSize: "14px",
						color: EMAIL_COLORS.text.primary,
					}}
				>
					{details}
				</Text>
			</EmailCard>

			{adminNotes && (
				<Section style={{ marginBottom: "24px" }}>
					<EmailCard style={{ borderLeft: `3px solid ${EMAIL_COLORS.primary}` }}>
						<Text
							className={EMAIL_CLASSES.text.secondary}
							style={{ ...EMAIL_STYLES.text.small, marginBottom: "4px" }}
						>
							Note de notre artisan
						</Text>
						<Text
							className={EMAIL_CLASSES.text.body}
							style={{
								margin: 0,
								fontSize: "14px",
								color: EMAIL_COLORS.text.primary,
								fontStyle: "italic",
							}}
						>
							{adminNotes}
						</Text>
					</EmailCard>
				</Section>
			)}

			{status === "COMPLETED" && <EmailCTA href={shopUrl}>Voir les créations</EmailCTA>}

			{status === "CANCELLED" && (
				<Section style={{ marginBottom: "32px" }}>
					<Text className={EMAIL_CLASSES.text.body} style={EMAIL_STYLES.text.body}>
						Notre équipe reste à votre disposition pour toute nouvelle demande de personnalisation.
					</Text>
				</Section>
			)}
		</EmailLayout>
	);
};

CustomizationStatusEmail.PreviewProps = {
	firstName: "Marie",
	productTypeLabel: "Collier",
	status: "IN_PROGRESS",
	adminNotes: "Nous avons sélectionné une magnifique pierre de lune pour votre création.",
	details: "Collier en or rose avec pierre de lune, gravure 'Pour toujours' au dos du pendentif.",
} as CustomizationStatusEmailProps;

export default CustomizationStatusEmail;
