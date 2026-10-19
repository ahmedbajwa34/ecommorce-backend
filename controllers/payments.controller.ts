import { Request, Response } from "express";
import { payOrderservice, getPaymentByOrderservice } from "../service/payments.service.js";
import { AppError } from "../errors/AppError.js";

export const payOrder = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        throw new AppError("Invalid order id", 400);
    }

    const payment = await payOrderservice(id, req.user!.id);
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
