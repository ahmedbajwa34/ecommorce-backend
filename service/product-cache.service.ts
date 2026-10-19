import { redisClient } from "../db/redis.js";
import { PRODUCTS_ALL_KEY, productKey } from "../cache/keys.js";

export const invalidateProductCache = async (productIds: number | number[] = []) => {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    const keys = [PRODUCTS_ALL_KEY, ...ids.map(productKey)];

    try {
        await redisClient.del(keys);
    } catch (error) {
        console.error("Product cache invalidation failed:", error);
    }
};
