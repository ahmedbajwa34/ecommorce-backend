


import { z } from "zod";

export const AddCartProductSchema = z.object({
    product_id: z.number().int().positive(),
    quantity: z.number().int().positive()
});

export type AddCartProductData = z.infer<typeof AddCartProductSchema>;


export type AddCartProductServiceData = AddCartProductData & {
    userId: number;
};