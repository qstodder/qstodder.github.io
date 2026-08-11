import {
	defineWorkersConfig,
	readD1Migrations
} from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
	const migrations = await readD1Migrations("./migrations");

	return {
		test: {
			poolOptions: {
				workers: {
					wrangler: { configPath: "./wrangler.test.jsonc" },
					miniflare: {
						d1Databases: ["wedding_rsvp_db"],
						bindings: { TEST_MIGRATIONS: migrations }
					}
				}
			}
		}
	};
});
