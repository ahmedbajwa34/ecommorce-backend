

import { z } from "zod";

export const CreateProductSchema = z.object({
    name: z.string(),
    description: z.string(),
    price: z.number().nonnegative(),
    stock: z.number().int().nonnegative(),
    category_id: z.number().int()
});