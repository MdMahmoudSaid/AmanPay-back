import "reflect-metadata";
import { AppDataSource } from "./config/database";
import { loadEnv } from "./config/env";
import { seedDefaultAdmin } from "./utils/seedDefaultAdmin";

async function main() {
  const env = loadEnv();
  await AppDataSource.initialize();

  try {
    if (env.RUN_MIGRATIONS_ON_START && !env.DB_SYNC) {
      await AppDataSource.runMigrations();
    }
    await seedDefaultAdmin();
    console.info("Seed completed.");
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
