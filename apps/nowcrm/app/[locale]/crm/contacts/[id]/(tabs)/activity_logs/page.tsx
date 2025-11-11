import { Info } from "lucide-react";
import type { Metadata } from "next";
import type { Session } from "next-auth";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import DataTable from "@/components/dataTable/dataTable";
import ErrorMessage from "@/components/ErrorMessage";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { columns } from "./components/columns/tasksColumns";
import createActivityLogDialog from "./components/createDialog";
import MassActionsActivityLogs from "./components/massActions/massActions";
import { DocumentId, PaginationParams } from "@nowcrm/services";
import { activityLogsService } from "@nowcrm/services/server";

export const metadata: Metadata = {
	title: "Logs",
};

export default async function Page(props: {
	searchParams: Promise<PaginationParams>;
	params: Promise<{ id: DocumentId }>;
}) {
	const t = await getTranslations("Contacts.topBar");
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
	const response = await activityLogsService.find(session?.jwt, {
		populate: "*",
		sort: [`${sortBy}:${sortOrder}` as any],
		pagination: {
			page,
			pageSize,
		},
		filters: {
			$or: [
				{ action: { $containsi: search } },
				{ description: { $containsi: search } },
			],
			contact: { documentId: { $eq: params.id } },
		},
	});

	if (!response.success || !response.data || !response.meta) {
		return <ErrorMessage response={response} />;
	}
	const { meta } = response;

	return (
		<div className="space-y-4">
			<Alert>
				<Info className="h-4 w-4" />
				<AlertDescription>
					This tab displays all modifications made at the contact level. Use it
					to review updates, changes, and adjustments applied to this contact’s
					information.
				</AlertDescription>
			</Alert>
			<DataTable
				data={response.data}
				columns={columns}
				table_name="activity_logs"
				table_title={t("activity_logs")}
				mass_actions={MassActionsActivityLogs}
				pagination={meta.pagination}
				session={session as Session}
				createDialog={createActivityLogDialog}
				sorting={{ sortBy, sortOrder }}
			/>
		</div>
	);
}
