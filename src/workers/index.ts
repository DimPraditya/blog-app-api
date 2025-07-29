import { TransactionWorker } from "../modules/transaction/transaction.worker";

export const initializeWorkers = () => {
  // add other worker here
  new TransactionWorker();
};
