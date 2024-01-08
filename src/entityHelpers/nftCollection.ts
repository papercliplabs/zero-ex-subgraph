import { Address, BigDecimal, ethereum, log } from "@graphprotocol/graph-ts";
import { NftCollection, NftCollectionData } from "../../generated/schema";
import { NftCollectionType, ONE_BI, ZERO_BD, ZERO_BI } from "../common/constants";
import { Erc721 as Erc721Contract } from "../../generated/ZeroExProxy/Erc721";
import { getOrCreateProtocol } from "./protocol";

// type is NftCollectionType
export function getOrCreateNftCollection(
    collectionAddress: Address,
    type: string,
    event: ethereum.Event
): NftCollection {
    let collection = NftCollection.load(collectionAddress);

    if (!collection) {
        collection = new NftCollection(collectionAddress);

        collection._protocol = getOrCreateProtocol(event).id;

        collection.type = type;
        collection.address = collectionAddress;

        if (NftCollectionType.Erc721 == type) {
            const erc721Contract = Erc721Contract.bind(collectionAddress);

            const tryName = erc721Contract.try_name();
            const trySymbol = erc721Contract.try_symbol();

            collection.name = tryName.reverted ? null : tryName.value;
            collection.symbol = trySymbol.reverted ? null : trySymbol.value;
        } else if (NftCollectionType.Erc1155 == type) {
            // Nothing, no name or symbol here
        } else {
            log.error("getOrCreateNftCollection: unsupported type - {}", [type]);
        }

        const data = new NftCollectionData(collectionAddress);
        data.fillCount = ZERO_BI;
        data.erc20VolumeUsd = ZERO_BD;
        data.averageFillPriceUsd = ZERO_BD;
        data.save();

        collection.data = data.id;

        collection.save();
    }

    return collection;
}

export function updateNftCollectionDataForNftFill(
    collectionAddress: Address,
    type: string,
    erc20FillAmountUsd: BigDecimal,
    event: ethereum.Event
): void {
    const collection = getOrCreateNftCollection(collectionAddress, type, event);
    const data = NftCollectionData.load(collection.id)!; // Guaranteed to exist

    data.fillCount = data.fillCount.plus(ONE_BI);
    data.erc20VolumeUsd = data.erc20VolumeUsd.plus(erc20FillAmountUsd);
    data.averageFillPriceUsd = data.erc20VolumeUsd.div(data.fillCount.toBigDecimal()); // Denom can't be 0 (incremented above)

    data.save();

    // Create snapshots
    createNftCollectionDataSnapshotsIfNecessary(data, event);
}

function createNftCollectionDataSnapshotsIfNecessary(data: NftCollectionData, event: ethereum.Event): void {
    // TODO
}
