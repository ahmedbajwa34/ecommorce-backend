

import type { PoolClient } from "pg";
import pool from "./db.js";

// Runs `callback` inside BEGIN/COMMIT. Any error rolls everything back,
// and the connection is always returned to the pool.
export const withTransaction = async <T>(
    callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await callback(client);

        await client.query("COMMIT");

        return result;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Transaction rollback failed:", rollbackError);
        }

        throw error;
    } finally {
        client.release();
    }
};