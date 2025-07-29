import { Job, Worker } from "bullmq";
import { connection } from "../../config/redis";
import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/apiError";

export class TransactionWorker {
  private worker: Worker;
  private prismaService: PrismaService;
  constructor() {
    this.worker = new Worker("transactionQueue", this.handleTransaction, {
      connection,
    });
    this.prismaService = new PrismaService();
  }

  private handleTransaction = async (job: Job<{ uuid: string }>) => {
    const uuid = job.data.uuid;
    const transaction = await this.prismaService.transaction.findFirst({
      where: { uuid: uuid },
    });

    if (!transaction) {
      throw new ApiError("Invalid transaction UUID", 400);
    }

    if (transaction.status === "WAITING_FOR_PAYMENT") {
      await this.prismaService.$transaction(async (tx) => {
        // UBAH STATUS TRANSAKSI MENJADI EXPIRED
        await tx.transaction.update({
          where: { uuid },
          data: { status: "EXPIRED" },
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
    }
  };
}
