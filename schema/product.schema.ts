import { z } from "zod";

export const CreateCategorySchema = z.object({
    name: z.string().trim().min(2).max(100),
});

export const CreateProductSchema = z.object({
    name: z.string().trim().min(2).max(200),
    description: z.string().trim().min(1).max(4000),
    price: z.number().nonnegative(),
    stock: z.number().int().nonnegative(),
    category_id: z.number().int().positive(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

