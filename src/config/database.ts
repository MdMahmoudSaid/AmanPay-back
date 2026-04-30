import "reflect-metadata";
import path from "node:path";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { RefreshToken } from "../entities/RefreshToken";
import { Wallet } from "../entities/Wallet";
import { Transfer } from "../entities/Transfer";
import { Envelope } from "../entities/Envelope";
import { Partner } from "../entities/Partner";
import { Invoice } from "../entities/Invoice";
import { PaymentTransaction } from "../entities/PaymentTransaction";
import { UnblockRequest } from "../entities/UnblockRequest";
import { MoneyRequest } from "../entities/MoneyRequest";
import { ActivityHistory } from "../entities/ActivityHistory";
import { loadEnv } from "./env";

const env = loadEnv();

const migrationExt = __dirname.includes(`${path.sep}dist${path.sep}`) ? "js" : "ts";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  synchronize: env.NODE_ENV !== "production" && env.DB_SYNC === true,
  logging: env.NODE_ENV === "development",
  entities: [
    User,
    RefreshToken,
    Wallet,
    Transfer,
    Envelope,
    Partner,
    Invoice,
    PaymentTransaction,
    UnblockRequest,
    MoneyRequest,
    ActivityHistory,
  ],
  migrations: [path.join(__dirname, "..", "migrations", `*.${migrationExt}`)],
  subscribers: [],
});

export default AppDataSource;
