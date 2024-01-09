import { Address, BigDecimal, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import {
    DailyNftCollectionData,
    NftCollection,
    NftCollectionData,
    WeeklyNftCollectionData,
} from "../../generated/schema";
import {
    EXCLUDE_HISTORICAL_DATA,
    NftCollectionType,
    ONE_BI,
    SECONDS_PER_DAY,
    SECONDS_PER_HOUR,
    SECONDS_PER_WEEK,
    ZERO_BD,
    ZERO_BI,
} from "../common/constants";
import { Erc721 as Erc721Contract } from "../../generated/ZeroExProxy/Erc721";
import { getOrCreateProtocol } from "./protocol";
import { copyEntity } from "../common/utils";

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
    createNftCollectionDataSnapshotsIfNecessary(collection, data, event);
}

function createNftCollectionDataSnapshotsIfNecessary(
    collection: NftCollection,
    data: NftCollectionData,
    event: ethereum.Event
): void {
    if (EXCLUDE_HISTORICAL_DATA) {
        return;
    }

    const hour = event.block.timestamp.div(SECONDS_PER_HOUR);
    const day = event.block.timestamp.div(SECONDS_PER_DAY);
    const week = event.block.timestamp.div(SECONDS_PER_WEEK);

    const hourlyId = collection.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(hour)));
    const dailyId = collection.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(day)));
    const weeklyId = collection.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(week)));

    let dailyData = DailyNftCollectionData.load(dailyId);
    let weeklyData = WeeklyNftCollectionData.load(weeklyId);

    if (!dailyData || !weeklyData) {
        const dataId = hourlyId;
        const dataSnapshot = copyEntity(data, new NftCollectionData(dataId));
        dataSnapshot.save();

        log.warning("createNftCollectionDataSnapshotsIfNecessary: dataSnapshot.id: {}", [
            dataSnapshot.id.toHexString(),
        ]);

        if (!dailyData) {
            dailyData = new DailyNftCollectionData(dailyId);
            dailyData.day = day;
            dailyData.timestamp = event.block.timestamp;
            dailyData.collection = collection.id;
            dailyData.data = dataSnapshot.id;
            dailyData.save();
        }

        if (!weeklyData) {
            weeklyData = new WeeklyNftCollectionData(weeklyId);
            weeklyData.week = week;
            weeklyData.timestamp = event.block.timestamp;
            weeklyData.collection = collection.id;
            weeklyData.data = dataSnapshot.id;
            weeklyData.save();
        }
    }
}
