import { z } from "zod";

export const CheckoutSchema = z.object({
    shipping_address: z.string().trim().min(8).max(255),
    payment_method: z.enum(["card", "cash_on_delivery"]),
});

export type CheckoutData = z.infer<typeof CheckoutSchema> & {
    userId: number;
};
