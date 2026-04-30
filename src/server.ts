import "reflect-metadata";
import { loadEnv } from "./config/env";
import { createApp } from "./app";
import { AppDataSource } from "./config/database";
import { seedDefaultAdmin } from "./utils/seedDefaultAdmin";

async function main() {
  const env = loadEnv();
  const { app, logger } = createApp();

  await AppDataSource.initialize();
  logger.info("Database connection initialized");

  if (env.RUN_MIGRATIONS_ON_START && !env.DB_SYNC) {
    const executed = await AppDataSource.runMigrations();
    logger.info({ count: executed.length }, "Migrations executed");
  }

  await seedDefaultAdmin();

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Server listening");
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
