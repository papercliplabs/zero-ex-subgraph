import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { NftFill } from "../../generated/schema";
import { getOrCreateTransaction } from "./transaction";
import { NftFillDirection, ZERO_BD } from "../common/constants";
import { getOrCreateAccount, updateAccountDataForNftFill } from "./account";
import { getOrCreateErc20Token, updateErc20TokenDataForNftFillAndGetDerivedFillAmountUsd } from "./erc20Token";
import { getOrCreateNftCollection, updateNftCollectionDataForNftFill } from "./nftCollection";
import { getOrCreateNft } from "./nft";
import { getOrCreateProtocol, updateProtocolDataForNftFill } from "./protocol";

export function createNftFill(
    type: string, // NftCollectionType
    direction: number, // NftFillDirection
    maker: Address,
    taker: Address,
    nftAddress: Address,
    nftTokenId: BigInt,
    erc20TokenAddress: Address,
    erc20TokenAmount: BigInt,
    event: ethereum.Event
): void {
    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));
    const fill = new NftFill(id);
    const transaction = getOrCreateTransaction(event);
    const erc20Token = getOrCreateErc20Token(erc20TokenAddress, event);

    fill._protocol = getOrCreateProtocol(event).id;

    fill.blockNumber = event.block.number;
    fill.timestamp = event.block.timestamp;
    fill.transaction = transaction.id;
    fill.logIndex = event.logIndex;

    fill.type = type;

    fill.direction = direction == 0 ? NftFillDirection.Sell : NftFillDirection.Buy;

    fill.maker = getOrCreateAccount(maker, event).id;
    fill.taker = getOrCreateAccount(taker, event).id;

    fill.collection = getOrCreateNftCollection(nftAddress, type, event).id;
    fill.nft = getOrCreateNft(nftAddress, type, nftTokenId, event).id;

    fill.erc20Token = erc20Token.id;
    fill.erc20TokenAmount = erc20TokenAmount;

    fill.save();

    // Increment transaction erc20 fill count
    transaction.nftFillCount += 1;
    transaction.save();

    // Update erc20 data
    const erc20TokenAmountUsd = updateErc20TokenDataForNftFillAndGetDerivedFillAmountUsd(
        erc20TokenAddress,
        erc20TokenAmount,
        event
    );

    // Update protocol data
    updateProtocolDataForNftFill(erc20TokenAmountUsd, erc20Token.whitelisted, event);

    // Update nft collection data
    updateNftCollectionDataForNftFill(nftAddress, type, erc20TokenAmountUsd, erc20Token.whitelisted, event);

    // Update account
    updateAccountDataForNftFill(
        maker,
        true,
        fill.direction == NftFillDirection.Sell ? ZERO_BD : erc20TokenAmountUsd,
        event
    );
    updateAccountDataForNftFill(
        taker,
        false,
        fill.direction == NftFillDirection.Sell ? erc20TokenAmountUsd : ZERO_BD,
        event
    );
}
