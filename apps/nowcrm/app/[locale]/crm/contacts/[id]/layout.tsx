import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FaEnvelope, FaUser } from "react-icons/fa";
import DeleteButton from "@/components/deleteButton/deleteButton";
import ErrorMessage from "@/components/ErrorMessage";
import { TypographyH4 } from "@/components/Typography";
import { Separator } from "@/components/ui/separator";
import { RouteConfig } from "@/lib/config/RoutesConfig";

import TopBarContacts from "./components/topbar";
import { contactsService } from "@nowcrm/services/server";
import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";

interface LayoutProps {
	children: React.ReactNode;
	params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "Contact detail",
		description: "Contact details",
	};
}

export default async function Layout(props: LayoutProps) {
	const params = await props.params;
	const t = await getTranslations();
	const { children } = props;

	const contactId = (params.id as DocumentId);
	const session = await auth();
	const contact = await contactsService.findOne(contactId, session?.jwt);
	if (!contact.data) {
		return <ErrorMessage response={contact} />;
	}
	return (
		<div className="container mt-2">
			<header className="flex justify-between">
				<TypographyH4 className="flex items-center">
					<FaUser className="mx-2 h-4 w-4 text-primary " />
					{`${contact.data.first_name} ${contact.data.last_name}`}
					<FaEnvelope className="mx-2 h-4 w-4 text-primary " />
					{contact.data.email}
				</TypographyH4>
				<DeleteButton
					label={t("common.actions.delete")}
					successMessage={t("Contacts.deleteContact")}
					redirectURL={RouteConfig.contacts.base}
					serviceName="contactsService"
					id={contactId}
				/>
			</header>
			<TopBarContacts id={contactId} />
			<Separator className="my-2" />
			<main>{children}</main>
		</div>
	);
}
