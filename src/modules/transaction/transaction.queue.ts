import { Queue } from "bullmq";
import { connection } from "../../config/redis";

export class TransactionQueue {
  private queue: Queue;
  constructor() {
    this.queue = new Queue("transactionQueue", { connection });
  }

  addNewTransactionQueue = async (uuid: string) => {
    return await this.queue.add(
      "newTransaction",
      { uuid: uuid },
      {
        jobId: uuid, // OPTIONAL UNTUK MENCEGAH DUPLIKAT
        delay: 5 * 60 * 1000, // OPTIONAL DELAY 1 MENIT
        attempts: 5, // OPTIONAL RETRY SAMPAI 5x
        removeOnComplete: true, // OPTIONAL HAPUS DATA SETELAH SELESAI
        backoff: { type: "exponential", delay: 1000 },
      }
    );
  };
}
