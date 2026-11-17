import "dotenv/config";
import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

export const getStripe = () => {
    if (!stripe) {
        throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    return stripe;
};
