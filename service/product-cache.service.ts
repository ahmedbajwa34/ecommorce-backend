
import { redisClient } from "../db/redis.js";


export const invalidateProductCache = async (productId?: number) => {
    const keys = ["products:all"];

    if (productId !== undefined) {
        keys.push(`product:${productId}`);
    }

    await redisClient.del(keys);
};