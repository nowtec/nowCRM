// app/page.tsx //

import type { PaginationParams } from "@nowcrm/services";
import { contactsService } from "@nowcrm/services/server";
import type { Metadata } from "next";
import type { Session } from "next-auth";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import ErrorMessage from "@/components/error-message";
import { HelloMessage } from "@/components/hello-message";
import { CONTACTS_POPULATE_MAPPINGS } from "@/lib/populate/contacts-populate-config";
import { buildPopulateFromVisible } from "@/lib/populate/populate-builder";
import ContactsTableClient from "./contacts-table-client";

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
	// Default visible fields - columns that are shown by default (used for initial fetch)
	const DEFAULT_VISIBLE_FIELDS = [
		"id",
		"first_name",
		"last_name",
		"email",
	] as const;

	// Build populate structure based on default visible fields
	// Note: DEFAULT_VISIBLE_FIELDS includes "tags" which needs to be populated
	const defaultVisibleIds = [...DEFAULT_VISIBLE_FIELDS, "tags"] as string[];
	const populate = buildPopulateFromVisible(
		defaultVisibleIds,
		CONTACTS_POPULATE_MAPPINGS,
	);

	const response = await contactsService.find(session?.jwt, {
		fields: DEFAULT_VISIBLE_FIELDS as any,
		populate: populate === "*" ? "*" : (populate as any),
		sort: [`${sortBy}:${sortOrder}` as any],
		pagination: { page, pageSize },
		filters: finalFilters,
	});
	if (!response.success || !response.data || !response.meta) {
		return <ErrorMessage response={response} />;
	}
	const { meta } = response;
	console.log(session.jwt);
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
