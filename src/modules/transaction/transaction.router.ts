import { Router } from "express";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { TransactionController } from "./transaction.controller";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreateTransactionDTO } from "./dto/createTransaction.dto";

export class TransactionRouter {
  private transactionController: TransactionController;
  private router: Router;
  private jwtMiddleware: JwtMiddleware;
  constructor() {
    this.router = Router();
    this.transactionController = new TransactionController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      validateBody(CreateTransactionDTO),
      this.transactionController.createTransaction
    );
  };

  getRouter = () => {
    return this.router;
  };
}
