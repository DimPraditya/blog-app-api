import { Router } from "express";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { TransactionController } from "./transaction.controller";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreateTransactionDTO } from "./dto/create-transaction.dto";
import { UploadPaymentProofDTO } from "./dto/upload-payment-proof.dto";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { UpdateTransactionDTO } from "./dto/update-transaction.dto";

export class TransactionRouter {
  private transactionController: TransactionController;
  private router: Router;
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploaderMiddleware;
  constructor() {
    this.router = Router();
    this.transactionController = new TransactionController();
    this.jwtMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["USER"]),
      validateBody(CreateTransactionDTO),
      this.transactionController.createTransaction
    );
    this.router.patch(
      "/payment-proof",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["USER"]),
      this.uploaderMiddleware
        .upload()
        .fields([{ name: "paymentProof", maxCount: 1 }]),
      this.uploaderMiddleware.fileFilter([
        "image/jpeg",
        "image/png",
        "image/heic",
        "image/avif",
      ]),
      validateBody(UploadPaymentProofDTO),
      this.transactionController.uploadPaymentProof
    );
    this.router.patch(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["ADMIN"]),
      validateBody(UpdateTransactionDTO),
      this.transactionController.updateTransaction
    );
  };

  getRouter = () => {
    return this.router;
  };
}
