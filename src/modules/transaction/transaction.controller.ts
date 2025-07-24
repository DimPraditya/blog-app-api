import { Request, Response } from "express";
import { TransactionService } from "./transaction.service";

export class TransactionController {
  private transactionService: TransactionService;
  constructor() {
    this.transactionService = new TransactionService();
  }

  createTransaction = async (req: Request, res: Response) => {
    const authUserId = res.locals.user.id;
    const result = await this.transactionService.createTransaction(
      req.body,
      authUserId
    );
    res.status(200).send(result);
  };
}
