import pool from "../db/db.js";
import bcrypt from "bcrypt";
import { AppError } from "../errors/AppError.js";
import "dotenv/config";

export const registerUser = async (data: { name: string; email: string; password: string }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const passwordHash = await bcrypt.hash(data.password, 10);

        const registerUserResult = await client.query(
            `INSERT INTO users(name, email, password_hash)
        VALUES ($1, $2, $3) 
        RETURNING id, name, email`,
            [data.name, data.email, passwordHash]
        );
        const result = registerUserResult.rows[0];

        await client.query("COMMIT");

        return {
            result,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const loginUser = async (email: string, password: string) => {
    const result = await pool.query(
        `SELECT id, name, email, password_hash, role
         FROM users
         WHERE email = $1`,
        [email]
    );

    const user = result.rows[0];

    if (!user) {
        throw new AppError("Invalid email or password", 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
        throw new AppError("Invalid email or password", 401);
    }

    return { id: user.id, role: user.role };
};
