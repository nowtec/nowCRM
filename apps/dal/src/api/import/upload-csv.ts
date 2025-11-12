import { APIRoutesDAL } from "@nowcrm/services";
import express, { type Request, type Response } from "express";
import multer from "multer";
import { csvContactsQueue } from "../../jobs_pipeline/csv-import/contacts/csv-contacts-queue";
import { csvOrganizationsQueue } from "../../jobs_pipeline/csv-import/orgs/csv-organizations-queue";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

interface MulterRequest extends Request {
	file?: Express.Multer.File;
}

router.post(
	`/${APIRoutesDAL.UPLOAD}`,
	upload.single("file"),
	async (req: MulterRequest, res: Response): Promise<void> => {
		if (!req.file) {
			res.status(400).json({ error: "No file uploaded" });
			return;
		}

		const csvContent = req.file.buffer.toString("utf-8");
		if (!csvContent.trim()) {
			res.status(400).json({ error: "Uploaded file is empty" });
			return;
		}
		res.status(200).json({ message: "CSV received." });

		setImmediate(() => {
			try {
				const filename =
					req.body.filename || req.file?.originalname || "unnamed.csv";
				const type = req.body.type?.toLowerCase() || "contacts";
				const mapping = JSON.parse(req.body.mapping || "{}");
				const requiredColumns = JSON.parse(req.body.requiredColumns || "[]");
				const selectedColumns = JSON.parse(req.body.selectedColumns || "[]");
				const extraColumns = JSON.parse(req.body.extraColumns || "[]");
				const subscribeAll = JSON.parse(req.body.subscribeAll || "false");
				const deduplicateByRequired = JSON.parse(
					req.body.deduplicateByRequired || "false",
				);
				const listMode = req.body.listMode || "new";
				const listId = req.body.listId ? Number(req.body.listId) : null;

				const jobData = {
					csv: csvContent,
					filename,
					type,
					mapping,
					requiredColumns,
					selectedColumns,
					extraColumns,
					subscribeAll,
					deduplicateByRequired,
					listMode,
					listId,
				};

				if (type === "contacts") {
					csvContactsQueue
						.add("processFile", jobData)
						.catch((err) => console.error("Queue error (contacts):", err));
				} else if (type === "organizations") {
					csvOrganizationsQueue
						.add("processFile", jobData)
						.catch((err) => console.error("Queue error (orgs):", err));
				} else {
					console.error("Invalid type provided:", type);
				}
			} catch (err) {
				console.error("Background processing error:", err);
			}
		});
	},
);

export default router;
