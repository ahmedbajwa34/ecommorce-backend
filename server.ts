
import "dotenv/config";

import app from "./app.js";
import { connectRedis } from "./db/redis.js";

const PORT = Number(process.env.PORT) || 3000;

const startServer = async (): Promise<void> => {
    try {
        await connectRedis();

        app.listen(PORT, () => {
            console.log(`Server running at PORT: ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
