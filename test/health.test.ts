import request from "supertest";
import { createApp } from "../src/app";

describe("GET /api/health", () => {
  it("returns liveness payload", async () => {
    const { app } = createApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.uptime).toBe("number");
  });
});
