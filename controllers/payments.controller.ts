import { Request, Response } from "express";
import {
    createCardPaymentIntent,
    confirmCardPayment,
    getPaymentByOrderservice,
    handleStripeWebhook,
} from "../service/payments.service.js";
import { AppError } from "../errors/AppError.js";

export const payOrder = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        throw new AppError("Invalid order id", 400);
    }

    const result = await createCardPaymentIntent(id, req.user!.id);
    return res.status(200).json({
        message: result.alreadyPaid ? "Payment already completed" : "Payment intent created",
        data: {
            clientSecret: result.clientSecret,
            alreadyPaid: result.alreadyPaid,
        },
    });
};

export const confirmPayOrder = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        throw new AppError("Invalid order id", 400);
    }

    const payment = await confirmCardPayment(id, req.user!.id);
    return res.status(200).json({
        message: "Payment successful",
        data: payment,
    });
};

export const getPayment = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        throw new AppError("Invalid order id", 400);
    }

    const payment = await getPaymentByOrderservice(id, req.user!);

    return res.status(200).json({
        message: "Payment fetched",
        data: payment,
    });
};

export const stripeWebhook = async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") {
        throw new AppError("Missing Stripe signature", 400);
    }

    const result = await handleStripeWebhook(req.body as Buffer, signature);
    return res.status(200).json(result);
};

export const paymentConfig = async (_req: Request, res: Response) => {
    return res.status(200).json({
        data: {
            stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
        },
    });
};
