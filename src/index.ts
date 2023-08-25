import * as core from "@actions/core";
import path from "path";
import fs from "fs";

import S3 from "./s3";
import config from "./config";
import { forEach, getVersion } from "./helpers";

const run = async () => {
	const shouldVersion = config.versioning !== "false";

	let destination = config.destination.startsWith("/") ? config.destination.substring(1) : config.destination;
	if (shouldVersion) {
		const version = getVersion(config.versioning);

		core.debug("using version: " + version);

		destination = path.join(config.destination, version);
	}

	core.debug(destination);

	const s3 = new S3({
		region: config.spaceRegion,
		access_key: config.accessKey,
		secret_key: config.secretKey,
	});

	const fileStat = await fs.promises.stat(config.source);
	const isFile = fileStat.isFile();

	const deleteLocation = `${config.destination}/${config.forcedDir}`;
	core.debug("Removing folder: " + deleteLocation);
	await s3.deleteFolder(deleteLocation);

	if (isFile) {
		const fileName = path.basename(config.source);
		const s3Path = path.join(destination, fileName);

		core.debug("Uploading file: " + s3Path);
		await s3.upload(config.source, s3Path);

		if (shouldVersion) {
			const s3PathLatest = path.join(config.destination, "latest", fileName);

			core.debug("Uploading file to latest: " + s3PathLatest);
			await s3.upload(config.source, s3PathLatest);
		}
	} else {
		core.debug("Uploading directory");

		const uploadFolder = async currentFolder => {
			const files = await fs.promises.readdir(currentFolder);

			await forEach(files, async file => {
				const fullPath = path.join(currentFolder, file);
				const stat = await fs.promises.stat(fullPath);

				if (stat.isFile()) {
					const s3Path = path.join(destination, path.relative(config.source, fullPath));

					core.debug("Uploading file: " + s3Path);
					await s3.upload(fullPath, s3Path);

					if (shouldVersion) {
						const s3PathLatest = path.join(config.destination, "latest", path.relative(config.source, fullPath));

						core.debug("Uploading file to latest: " + s3PathLatest);
						await s3.upload(fullPath, s3PathLatest);
					}
				} else {
					uploadFolder(fullPath);
				}
			});
		};

		await uploadFolder(config.source);
	}

	const outputPath = config.cdnDomain
		? `https://${config.cdnDomain}/${destination}`
		: `https://${config.spaceName}.${config.spaceRegion}.digitaloceanspaces.com/${destination}`;

	core.info(`Files uploaded to ${outputPath}`);
	core.setOutput("output_url", outputPath);
};

run()
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	.then(() => {})
	.catch(err => {
		core.error(err);
		core.setFailed(err.message);
	});
