import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { authenticate } from "../middleware/auth.middleware.js";

const app = express();

app.use(cookieParser());

app.get("/protected", authenticate, (req, res) => {
    res.status(200).json({
        message: "Access granted",
        user: req.user,
    });
});

const JWT_SECRET = process.env.JWT_ACCESS_SECRET!;

describe("Authentication Middleware", () => {
    it("should reject a request without an access token", async () => {
        const response = await request(app).get("/protected");

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Unauthorized token");
    });

    it("should reject an invalid access token", async () => {
        const response = await request(app)
            .get("/protected")
            .set("Cookie", "token=invalid-token");

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Invalid Token");
    });

    it("should allow a request with a valid access token", async () => {
        const token = jwt.sign(
            { id: 1, role: "customer" },
            JWT_SECRET,
            { expiresIn: "15m" }
        );

        const response = await request(app)
            .get("/protected")
            .set("Cookie", `token=${token}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Access granted");
        expect(response.body.user.id).toBe(1);
        expect(response.body.user.role).toBe("customer");
    });

    it("should reject an expired access token", async () => {
        const token = jwt.sign(
            { id: 1, role: "customer" },
            JWT_SECRET,
            { expiresIn: -1 }
        );

        const response = await request(app)
            .get("/protected")
            .set("Cookie", `token=${token}`);

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Invalid Token");
    });
});