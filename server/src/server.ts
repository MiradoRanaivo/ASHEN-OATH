import { app } from "./app";
import { env } from "./config/env";
import { pool } from "./db/pool";

const server = app.listen(env.PORT, () => {
  console.info(`ASHEN OATH API listening on port ${env.PORT}`);
});

const shutdown = (signal: string): void => {
  console.info(`${signal} received. Closing HTTP server...`);
  server.close((error) => {
    if (error) {
      console.error("Error while closing HTTP server:", error);
      process.exitCode = 1;
    }

    void pool.end().catch((poolError: unknown) => {
      console.error("Error while closing MySQL pool:", poolError);
      process.exitCode = 1;
    });
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
