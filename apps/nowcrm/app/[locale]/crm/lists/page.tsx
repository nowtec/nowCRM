import type { PaginationParams } from "@nowcrm/services";
import { listsService } from "@nowcrm/services/server";
import type { Metadata } from "next";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import DataTable from "@/components/dataTable/dataTable";
import ErrorMessage from "@/components/ErrorMessage";
import { columns } from "./components/columns/listsColumns";
import createListDialog from "./components/createDialog";
import MassActionsLists from "./components/massActions/massActions";
export const metadata: Metadata = {
	title: "Lists",
};

export default async function Page(props: {
	searchParams: Promise<PaginationParams>;
}) {
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
		fields: ["documentId", "name", "createdAt", "updatedAt"],
		populate: {
			tags: true,
		},
		sort: [`${sortBy}:${sortOrder}` as any],
		pagination: {
			page,
			pageSize,
		},
		filters: {
			$or: [{ name: { $containsi: search } }],
		},
	});
	if (!response.success || !response.data || !response.meta) {
		return <ErrorMessage response={response} />;
	}
	const { meta } = response;
	return (
		<div className="container">
			<DataTable
				data={response.data}
				columns={columns}
				table_name="lists"
				table_title="List"
				mass_actions={MassActionsLists}
				pagination={meta.pagination}
				session={session as Session}
				createDialog={createListDialog}
				sorting={{ sortBy, sortOrder }}
			/>
		</div>
	);
}
