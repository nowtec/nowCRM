// app/page.tsx //

import type { Metadata } from "next";
import type { Session } from "next-auth";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import ErrorMessage from "@/components/ErrorMessage";
import { HelloMessage } from "@/components/HelloMessage";
import ContactsTableClient from "./ContactsTableClient";
import { contactsService } from "@nowcrm/services/server";
import { PaginationParams } from "@nowcrm/services";

export const metadata: Metadata = { title: "Contacts" };

export default async function Page(props: {
	searchParams: Promise<PaginationParams>;
}) {
	const t = await getTranslations("Contacts");
	const {
		page = 1,
		pageSize = 10,
		sortBy = "id",
		sortOrder = "desc",
	} = await props.searchParams;
	const finalFilters = {};

	const session = await auth();

	const response = await contactsService.find(session?.jwt, {
		fields: [
			"id",
			"first_name",
			"last_name",
			"email",
			"country",
			"job_description",
			"duration_role",
			"connection_degree",
		],
		populate: {
			tags: {
				fields: ["name"],
			},
			industry: {
				fields: ["name"],
			},
			contact_types: {
				fields: ["name"],
			},
			title: {
				fields: ["name"],
			},
			salutation: {
				fields: ["name"],
			},
			job_title: {
				fields: ["name"],
			},
		},
		sort: [`${sortBy}:${sortOrder}` as any],
		pagination: { page, pageSize },
		filters: finalFilters,
	});

	if (!response.success || !response.data || !response.meta) {
		return <ErrorMessage response={response} />;
	}
	const { meta } = response;
	return (
		<div className="container">
			<HelloMessage />
			<ContactsTableClient
				initialData={response.data}
				initialPagination={meta.pagination}
				sortBy={sortBy}
				sortOrder={sortOrder}
				tableTitle={t("table_title")}
				tableName="contacts"
				session={session as Session}
				serverFilters={finalFilters}
			/>
		</div>
	);
}
