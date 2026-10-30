import { describe, it, expect } from "vitest";
import pool from "../db/db.js";

describe("Test database connection", () => {
    it("should connect to ecommerce_test", async () => {
        const result = await pool.query("SELECT current_database()");

        expect(result.rows[0].current_database).toBe("ecommerce_test");
    });
});