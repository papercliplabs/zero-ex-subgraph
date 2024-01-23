import { Bytes, ethereum } from "@graphprotocol/graph-ts";
import { Erc20Transfer, ProtocolData, Transaction } from "../../generated/schema";
import { createErc20TransfersFromReceipt } from "./erc20Transfer";
import { getOrCreateProtocol } from "./protocol";
import { ONE_BI } from "../common/constants";

export function getOrCreateTransaction(event: ethereum.Event): Transaction {
    const id = event.transaction.hash;
    let transaction = Transaction.load(id);

    if (!transaction) {
        transaction = new Transaction(id);

        transaction._protocol = getOrCreateProtocol(event).id;

        transaction.hash = event.transaction.hash;
        transaction.blockNumber = event.block.number;
        transaction.timestamp = event.block.timestamp;

        transaction.from = event.transaction.from;
        transaction.to = event.transaction.to;

        transaction.gasLimit = event.transaction.gasLimit;
        transaction.gasPrice = event.transaction.gasPrice;

        transaction.erc20FillCount = 0;
        transaction.nftFillCount = 0;

        if (event.receipt) {
            transaction.gasUsed = event.receipt!.gasUsed;
        }

        transaction.erc20Transfers = createErc20TransfersFromReceipt(event).map<Bytes>((transfer) => transfer.id);
        transaction.erc20TransferCount = transaction.erc20Transfers.length;

        transaction.save();

        // Update protocol txn count
        const protocol = getOrCreateProtocol(event);
        const data = ProtocolData.load(protocol.id)!; // Guaranteed to exist
        data.transactionCount = data.transactionCount.plus(ONE_BI);
        data.save();
    }

    return transaction;
}

export function getErc20TransfersForTransaction(transaction: Transaction): Erc20Transfer[] {
    return transaction.erc20Transfers.map<Erc20Transfer>((id) => Erc20Transfer.load(id)!);
}
