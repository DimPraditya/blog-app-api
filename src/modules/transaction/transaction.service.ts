import { ApiError } from "../../utils/apiError";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTransactionDTO } from "./dto/create-transaction.dto";
import { UpdateTransactionDTO } from "./dto/update-transaction.dto";
import { TransactionQueue } from "./transaction.queue";

export class TransactionService {
  private prisma: PrismaService;
  private transactionQueue: TransactionQueue;
  private mailService: MailService;
  private cloudinaryService: CloudinaryService;
  constructor() {
    this.prisma = new PrismaService();
    this.transactionQueue = new TransactionQueue();
    this.mailService = new MailService();
    this.cloudinaryService = new CloudinaryService();
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
    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId: authUserId, // userId from token -> res.locals.user.id
        },
        include: { user: true },
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
      return transaction;
    });

    // 7. Buat Delay Job untuk mengecek status transaksi
    await this.transactionQueue.addNewTransactionQueue(result.uuid);

    // 8. Kirim Email
    await this.mailService.sendMail(
      result.user.email,
      "Upload Bukti Pembayaran",
      "upload-proof",
      {
        name: result.user.name,
        uuid: result.uuid,
        expireAt: new Date(result.createdAt.getTime() + 5 * 60 * 1000), // minute
        year: new Date().getFullYear(),
      }
    );

    return { message: "create transaction success" };
  };

  uploadPaymentProof = async (
    uuid: string,
    paypmentProof: Express.Multer.File,
    authUserId: number
  ) => {
    // harus tau dulu transaksinya
    // harus user yang punya transaksi yang bisa upload payment proof

    // cari transaksi berdasarkan uuid
    const transaction = await this.prisma.transaction.findFirst({
      where: { uuid: uuid },
    });

    // kalo tidak ada throw error
    if (!transaction) {
      throw new ApiError("transaction not found", 400);
    }

    // kalo transaksi tidak sesuai dengan userid di dalam token throw error
    if (transaction.userId !== authUserId) {
      throw new ApiError("Unauthorized", 401);
    }

    // upload bukti traansfer ke cloudinary
    const { secure_url } = await this.cloudinaryService.upload(paypmentProof);

    await this.prisma.transaction.update({
      where: { uuid },
      data: { paymentProof: secure_url, status: "WAITING_FOR_CONFIRMATION" },
    });

    return { message: "Upload Payment Proof Success" };
  };

  updateTransaction = async (body: UpdateTransactionDTO) => {
    // TAMBAHKAN AUTHUSERID UNTUK EVENT MANAGEMENT

    const transaction = await this.prisma.transaction.findFirst({
      where: { uuid: body.uuid },
    });

    if (!transaction) {
      throw new ApiError(" Transaction not found", 400);
    }

    if (transaction.status !== "WAITING_FOR_CONFIRMATION") {
      throw new ApiError(
        "TRANSACTION STATUS MUST BE WAITING FOR CONFIRMATION",
        400
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { uuid: body.uuid },
        data: { status: body.type === "ACCEPT" ? "PAID" : "REJECT" },
      });

      // Ambil semua detail transaksi
      const transactionDetails = await tx.transactionDetail.findMany({
        where: { transactionId: transaction.id },
      });

      // Update stok setiap produk
      for (const detail of transactionDetails) {
        await tx.product.update({
          where: { id: detail.productId },
          data: {
            stock: {
              increment: detail.qty,
            },
          },
        });
      }
    });

    return { message: "update transaction success" };
  };
}
