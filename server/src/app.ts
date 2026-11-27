import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { healthRouter } from "./routes/health.routes";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "32kb" }));

app.use("/api", healthRouter);

app.use((_request, response) => {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested API route does not exist.",
    },
  });
});
