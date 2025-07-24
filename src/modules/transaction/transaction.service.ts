import { ApiError } from "../../utils/apiError";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTransactionDTO } from "./dto/createTransaction.dto";

export class TransactionService {
  private prisma: PrismaService;
  constructor() {
    this.prisma = new PrismaService();
  }

  createTransaction = async (
    body: CreateTransactionDTO,
    authUserId: number
  ) => {
    // validate product stock
    // if stock less than qty throw apierror
    // create data on model TRansaction and model TransactionDetail

    const { payload } = body; // [{ productId: 1, qty: 1}, {productId:2, qty:3}]

    // Step 1: Get all related products from DB
    const productIds = payload.map((item) => item.productId); // [1,2]

    // Step 2: fetch all products from DB
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
    });

    // Step 3: Validate all products exist and have enough stock
    for (const item of payload) {
      const product = products.find((p) => p.id === item.productId);

      if (!product) {
        throw new ApiError(`Product ID ${item.productId} not found`, 400);
      }

      if (product.stock < item.qty) {
        throw new ApiError(
          `Insufficient stock for product ID ${item.productId}`,
          400
        );
      }
    }

    // 4. Create the Transaction
    await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId: authUserId, // userId from token -> res.locals.user.id
        },
      });

      // 5. Create Data TransactionDetail
      const transactionDetail = payload.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          transactionId: transaction.id,
          productId: item.productId,
          qty: item.qty,
          price: product!.price,
        };
      });

      await tx.transactionDetail.createMany({
        data: transactionDetail,
      });
      // 6. Update the stock for each product
      for (const item of payload) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        });
      }
    });

    return { message: "create transaction success" };
  };
}
