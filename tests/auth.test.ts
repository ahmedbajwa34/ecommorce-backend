import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

const createUser = async () => {
    const email = `test${Date.now()}${Math.random()}@example.com`;
    const password = "Password123";

    await request(app)
        .post("/api/register")
        .send({
            name: "Test User",
            email,
            password,
        });

    return { email, password };
};

describe("POST /api/register", () => {
    it("should register a user successfully", async () => {
        const email = `register${Date.now()}@example.com`;

        const response = await request(app)
            .post("/api/register")
            .send({
                name: "Test User",
                email,
                password: "Password123",
            });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe("User Created");
    });

    it("should reject an invalid email", async () => {
        const response = await request(app)
            .post("/api/register")
            .send({
                name: "Test User",
                email: "invalid-email",
                password: "Password123",
            });

        expect(response.status).toBe(500);
    });

    it("should reject duplicate email registration", async () => {
        const email = `duplicate${Date.now()}@example.com`;

        const user = {
            name: "Test User",
            email,
            password: "Password123",
        };

        await request(app).post("/api/register").send(user);

        const response = await request(app)
            .post("/api/register")
            .send(user);

        expect(response.status).toBe(500);
    });
});

describe("POST /api/login", () => {
    it("should login successfully and set authentication cookies", async () => {
        const { email, password } = await createUser();

        const response = await request(app)
            .post("/api/login")
            .send({ email, password });

        expect(response.status).toBe(200);
        expect(response.headers["set-cookie"]).toBeDefined();

        const cookies = getCookies(response.headers["set-cookie"])

        expect(cookies).toHaveLength(2);
        expect(cookies.some(cookie => cookie.startsWith("token="))).toBe(true);
        expect(cookies.some(cookie => cookie.startsWith("refresh_token="))).toBe(true);
    });

    it("should reject an incorrect password", async () => {
        const { email } = await createUser();

        const response = await request(app)
            .post("/api/login")
            .send({
                email,
                password: "WrongPassword123",
            });

        expect(response.status).toBe(401);
    });

    it("should reject a nonexistent user", async () => {
        const response = await request(app)
            .post("/api/login")
            .send({
                email: `missing${Date.now()}@example.com`,
                password: "Password123",
            });

        expect(response.status).toBe(401);
    });

    it("should reject an invalid email", async () => {
        const response = await request(app)
            .post("/api/login")
            .send({
                email: "invalid-email",
                password: "Password123",
            });

        expect(response.status).toBe(500);
    });

    it("should reject a missing password", async () => {
        const response = await request(app)
            .post("/api/login")
            .send({
                email: "test@example.com",
            });

        expect(response.status).toBe(500);
    });
});

const getCookies = (value: string | string[] | undefined): string[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
};

describe("POST /api/auth/refresh", () => {
    it("should refresh the access token with a valid refresh token", async () => {
        const { email, password } = await createUser();

        const loginResponse = await request(app)
            .post("/api/login")
            .send({ email, password });

        const cookies = getCookies(loginResponse.headers["set-cookie"]);

        const refreshCookie = cookies.find(cookie =>
            cookie.startsWith("refresh_token=")
        );

        expect(refreshCookie).toBeDefined();

        const response = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", refreshCookie!);

        expect(response.status).toBe(200);
        expect(response.headers["set-cookie"]).toBeDefined();
    });

    it("should reject a request without a refresh cookie", async () => {
        const response = await request(app)
            .post("/api/auth/refresh");

        expect(response.status).toBe(401);
    });

    it("should reject an invalid refresh token", async () => {
        const response = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", "refresh_token=invalid-token");

        expect(response.status).toBe(401);
    });
});

describe("POST /api/logout", () => {
    it("should logout and clear authentication cookies", async () => {
        const { email, password } = await createUser();

        const loginResponse = await request(app)
            .post("/api/login")
            .send({ email, password });

        const cookies = getCookies(loginResponse.headers["set-cookie"]);

        const response = await request(app)
            .post("/api/logout")
            .set("Cookie", cookies);

        expect(response.status).toBe(200);

        const clearedCookies = getCookies(response.headers["set-cookie"]);

        expect(clearedCookies.some(cookie => cookie.startsWith("token="))).toBe(true);
        expect(clearedCookies.some(cookie => cookie.startsWith("refresh_token="))).toBe(true);
    });

    it("should logout even without authentication cookies", async () => {
        const response = await request(app)
            .post("/api/logout");

        expect(response.status).toBe(200);
    });
});