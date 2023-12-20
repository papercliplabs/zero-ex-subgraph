import { Bytes, ethereum } from "@graphprotocol/graph-ts";
import { Erc20Transfer, Transaction } from "../../generated/schema";
import { createErc20TransfersFromReceipt } from "./erc20Transfer";

export function getOrCreateTransaction(event: ethereum.Event): Transaction {
    const id = event.transaction.hash;
    let transaction = Transaction.load(id);

    if (!transaction) {
        transaction = new Transaction(id);

        transaction.hash = event.transaction.hash;
        transaction.blockNumber = event.block.number;
        transaction.timestamp = event.block.timestamp;

        transaction.from = event.transaction.from;
        transaction.to = event.transaction.to;

        transaction.gasLimit = event.transaction.gasLimit;
        transaction.gasPrice = event.transaction.gasPrice;

        transaction.erc20FillCount = 0;

        if (event.receipt) {
            transaction.gasUsed = event.receipt!.gasUsed;
        }

        transaction.erc20Transfers = createErc20TransfersFromReceipt(event).map<Bytes>((transfer) => transfer.id);
        transaction.erc20TransferCount = transaction.erc20Transfers.length;

        transaction.save();
    }

    return transaction;
}

export function getErc20TransfersForTransaction(transaction: Transaction): Erc20Transfer[] {
    return transaction.erc20Transfers.map<Erc20Transfer>((id) => Erc20Transfer.load(id)!);
}
