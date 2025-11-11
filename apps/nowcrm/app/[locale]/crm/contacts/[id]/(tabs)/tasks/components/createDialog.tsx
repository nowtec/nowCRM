"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ListPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useForm } from "react-hook-form";
import { GrAddCircle } from "react-icons/gr";
import * as z from "zod";
import { AsyncSelectField } from "@/components/autoComplete/asyncSelectField";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { taskStatuses } from "@nowcrm/services";

const formSchema = z.object({
	contact: z.string(),
	name: z.string(),
	description: z.string().optional(),
	action: z.string().optional(),
	assigned_to: z.object({
		value: z.string(),
		label: z.string(),
	}),
	due_date: z.string().optional(),
	status: z.enum(["planned", "in progress", "done", "expired"]).optional(),
});

export default function CreateTaskDialog() {
	const router = useRouter();
	const params = useParams<{ locale: string; id: string }>();
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const t = useTranslations();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			contact: (params.id),
			name: "",
			assigned_to: undefined,
			description: "",
			action: "",
			due_date: "",
			status: "planned",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const { default: toast } = await import("react-hot-toast");
		const { createTask } = await import("@/lib/actions/tasks/create-task");
		const updated_values = {
			...values,
			task_status: values.status as taskStatuses,
			due_date: new Date(),
			assigned_to:Number.parseInt(values.assigned_to.value),
		};
		const res = await createTask({
			...updated_values,
			publishedAt: new Date(),
		});

		if (!res.success) {
			toast.error(`${t("Contacts.tasks.error")} ${res.errorMessage}`);
		} else {
			toast.success(
				t("Contacts.tasks.success", { name: values.description || "" }),
			);
			setDialogOpen(false);
			form.reset();
			router.refresh();
		}
	}

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogTrigger asChild>
				<Button
					size="sm"
					className="ml-2 hidden h-8 lg:flex"
					onClick={() => setDialogOpen(true)}
				>
					<GrAddCircle className="mr-2 h-4 w-4" />
					{t("Contacts.tasks.createTask")}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{t("Contacts.tasks.createTask")}</DialogTitle>
					<DialogDescription>
						{t("Contacts.tasks.description")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>{t("Contacts.tasks.fields.name")}</FormLabel>
									<FormControl>
										<Input
											placeholder={t("Contacts.tasks.fields.name")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>
										{t("Contacts.tasks.fields.description")}
									</FormLabel>
									<FormControl>
										<Textarea
											placeholder={t("Contacts.tasks.fields.description")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="action"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>{t("Contacts.tasks.fields.action")}</FormLabel>
									<FormControl>
										<Input
											placeholder={t("Contacts.tasks.fields.action")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="due_date"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>{t("Contacts.tasks.fields.dueDate")}</FormLabel>
									<FormControl>
										<Input
											placeholder={t("Contacts.tasks.fields.dueDate")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<AsyncSelectField
							name="assigned_to"
							label={t("Contacts.tasks.fields.assignTo")}
							serviceName="usersService"
							form={form}
							filterKey="username"
							useFormClear={false}
						/>
						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>{t("Contacts.tasks.fields.status")}</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue
													placeholder={t("Contacts.tasks.fields.status")}
												/>
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="planned">
												{t("Contacts.tasks.fields.statusOptions.planned")}
											</SelectItem>
											<SelectItem value="in progress">
												{t("Contacts.tasks.fields.statusOptions.in progress")}
											</SelectItem>
											<SelectItem value="done">
												{t("Contacts.tasks.fields.statusOptions.done")}
											</SelectItem>
											<SelectItem value="expired">
												{t("Contacts.tasks.fields.statusOptions.expired")}
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" className="w-full">
							<ListPlus className="mr-2 h-4 w-4" />
							{t("common.actions.create")}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
