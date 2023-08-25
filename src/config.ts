import path from "path";
import { getInput } from "action-input-parser";

const config = {
	source: getInput({
		key: "source",
		required: true,
		modifier: val => {
			return path.join(process.cwd(), val);
		},
	}),
	exclude: getInput({
		key: "exclude",
		default: "subapp/*",
	}),
	destination: getInput({
		key: "destination",
		default: "",
	}),
	spaceName: getInput({
		key: "space_name",
		required: true,
	}),
	spaceRegion: getInput({
		key: "space_region",
		required: true,
	}),
	accessKey: getInput({
		key: "access_key",
		required: true,
	}),
	secretKey: getInput({
		key: "secret_key",
		required: true,
	}),
	versioning: getInput({
		key: "versioning",
		default: "false",
	}),
	cdnDomain: getInput({
		key: "cdn_domain",
	}),
	permission: getInput({
		key: "permission",
		default: "public-read",
	}),
};

export default config;
