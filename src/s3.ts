import fs from "fs";
import { lookup } from "mime-types";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import config from "./config";

class S3Interface {
	constructor(option) {
		const s3 = new S3Client({
			endpoint: `https://${option.region}.digitaloceanspaces.com`,
			region: option.region,
			credentials: {
				accessKeyId: option.access_key,
				secretAccessKey: option.secret_key,
			},
			forcePathStyle: true,
		});

		this.s3 = s3;
	}

	async deleteFolder(location) {
		const client = this.s3;
		let count = 0; // number of files deleted
		async function recursiveDelete(token) {
			const listCommand = new ListObjectsV2Command({
				Bucket: config.spaceName,
				Prefix: location,
				ContinuationToken: token,
			});
			const list = await client.send(listCommand);

			if (list.KeyCount) {
				const deleteCommand = new DeleteObjectsCommand({
					Bucket: config.spaceName,
					Delete: {
						Objects: list.Contents.map(item => ({ Key: item.Key })),
						Quiet: false,
					},
				});
				const deleted = await client.send(deleteCommand);
				count += deleted.Deleted.length;
				if (deleted.Errors) {
					deleted.Errors.map(error => console.log(`${error.Key} could not be deleted - ${error.Code}`));
				}
			}
			// repeat if more files to delete
			if (list.NextContinuationToken) {
				recursiveDelete(list.NextContinuationToken);
			}
			// return total deleted count when finished
			return `${count} files deleted.`;
		}
		// start the recursive function
		return recursiveDelete();
	}

	async upload(file, path) {
		const fileStream = fs.createReadStream(file);

		const options = {
			Body: fileStream,
			Bucket: config.spaceName,
			Key: path.replace(/\\/g, "/"),
			ACL: config.permission,
			ContentType: lookup(file) || "text/plain",
		};

		await this.s3.send(new PutObjectCommand(options));
	}
}

export default S3Interface;
