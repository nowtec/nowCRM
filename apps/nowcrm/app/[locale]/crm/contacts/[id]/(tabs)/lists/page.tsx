import type { Metadata } from "next";
import type { Session } from "next-auth";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import DataTable from "@/components/dataTable/dataTable";
import ErrorMessage from "@/components/ErrorMessage";
import createListDialog from "./components/addToListDialog";
import { columns } from "./components/columns/listsColumns";
import MassActionsLists from "./components/massActions/massActions";
import { PaginationParams } from "@nowcrm/services";
import { DocumentId } from "@nowcrm/services";
import { listsService } from "@nowcrm/services/server";
export const metadata: Metadata = {
	title: "Lists",
};

export default async function Page(props: {
	searchParams: Promise<PaginationParams>;
	params: Promise<{ id: DocumentId }>;
}) {
	const t = await getTranslations();
	const params = await props.params;
	const searchParams = await props.searchParams;
	const {
		page = 1,
		pageSize = 10,
		search = "",
		sortBy = "id",
		sortOrder = "desc",
	} = searchParams;
	// Fetch data from the contactService
	const session = await auth();
	const response = await listsService.find(session?.jwt, {
		fields: ["id", "name", "createdAt", "updatedAt"],
		populate: {},
		sort: [`${sortBy}:${sortOrder}` as any],
		pagination: {
			page,
			pageSize,
		},
		filters: {
			$or: [{ name: { $containsi: search } }],
			contacts: { documentId: { $in: params.id } },
		},
	});

	if (!response.success || !response.data || !response.meta) {
		return <ErrorMessage response={response} />;
	}
	const { meta } = response;

	return (
		<DataTable
			data={response.data}
			columns={columns}
			table_name="lists"
			table_title={t("Contacts.lists.table_title")}
			mass_actions={MassActionsLists}
			pagination={meta.pagination}
			session={session as Session}
			createDialog={createListDialog}
			sorting={{ sortBy, sortOrder }}
		/>
	);
}
