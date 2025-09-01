import express from "express";

import cors from "cors";

import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("pubic"));
app.use(cookieParser());

// routes import...

import userRouter from "./routes/user.routes.js";

// routes declaration...
// Jse hi /api/v1/users hua wse hi control pass ho gya user.routes ke pas fir uske bd jitne method apply hoge whi se hi hoge
// EX: http://localhost:8000/api/v1/users/register

app.use("/api/v1/users", userRouter);

export { app };
