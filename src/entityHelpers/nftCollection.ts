import { Address, BigDecimal, ethereum, log } from "@graphprotocol/graph-ts";
import { NftCollection, NftCollectionMetrics } from "../../generated/schema";
import { NftCollectionType, ONE_BI, ZERO_BD, ZERO_BI } from "../common/constants";
import { Erc721 as Erc721Contract } from "../../generated/ZeroExProxy/Erc721";

// type is NftCollectionType
export function getOrCreateNftCollection(
    collectionAddress: Address,
    type: string,
    event: ethereum.Event
): NftCollection {
    let collection = NftCollection.load(collectionAddress);

    if (!collection) {
        collection = new NftCollection(collectionAddress);

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

        const metrics = new NftCollectionMetrics(collectionAddress);
        metrics.fillCount = ZERO_BI;
        metrics.erc20VolumeUsd = ZERO_BD;
        metrics.averageFillPriceUsd = ZERO_BD;
        metrics.save();

        collection.metrics = metrics.id;

        collection.save();
    }

    return collection;
}

export function updateNftCollectionMetricsForNftFill(
    collectionAddress: Address,
    type: string,
    erc20FillAmountUsd: BigDecimal,
    event: ethereum.Event
): void {
    const collection = getOrCreateNftCollection(collectionAddress, type, event);
    const metrics = NftCollectionMetrics.load(collection.id)!; // Guaranteed to exist

    metrics.fillCount = metrics.fillCount.plus(ONE_BI);
    metrics.erc20VolumeUsd = metrics.erc20VolumeUsd.plus(erc20FillAmountUsd);
    metrics.averageFillPriceUsd = metrics.erc20VolumeUsd.div(metrics.fillCount.toBigDecimal()); // Denom can't be 0 (incremented above)

    metrics.save();

    // Create snapshots
    createNftCollectionMetricsSnapshotsIfNecessary(metrics, event);
}

function createNftCollectionMetricsSnapshotsIfNecessary(metrics: NftCollectionMetrics, event: ethereum.Event): void {
    // TODO
}
