import { BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { Protocol, ProtocolData, _ActiveUser } from "../../generated/schema";
import { ONE_BI, UniqueUserUsageId, ZERO_BD, ZERO_BI } from "../common/constants";
import { isUniqueUser } from "../common/utils";

const PROTOCOL_ID = Bytes.fromHexString("0x00");

export function getOrCreateProtocol(event: ethereum.Event): Protocol {
    let protocol = Protocol.load(PROTOCOL_ID);

    if (!protocol) {
        protocol = new Protocol(PROTOCOL_ID);

        const data = new ProtocolData(protocol.id);

        data.erc20FillVolumeUsd = ZERO_BD;
        data.erc20FillCount = ZERO_BI;

        data.nftFillErc20VolumeUsd = ZERO_BD;
        data.nftFillCount = ZERO_BI;

        data.uniqueUserCount = ZERO_BI;

        data.save();

        protocol.data = data.id;

        protocol.save();
    }

    return protocol;
}

export function updateProtocolDataForErc20Fill(fillAmountUsd: BigDecimal, event: ethereum.Event): void {
    const protocol = getOrCreateProtocol(event);
    const data = ProtocolData.load(protocol.id)!; // Guaranteed to exist

    data.erc20FillVolumeUsd = data.erc20FillVolumeUsd.plus(fillAmountUsd);

    data.erc20FillCount = data.erc20FillCount.plus(ONE_BI);

    if (isUniqueUser(event.transaction.from, UniqueUserUsageId.Protocol)) {
        data.uniqueUserCount = data.uniqueUserCount.plus(ONE_BI);
    }

    data.save();

    createProtocolDataSnapshotsIfNecessary(data, event);
}

export function updateProtocolDataForNftFill(fillAmountUsd: BigDecimal, event: ethereum.Event): void {
    const protocol = getOrCreateProtocol(event);
    const data = ProtocolData.load(protocol.id)!; // Guaranteed to exist

    data.nftFillErc20VolumeUsd = data.nftFillErc20VolumeUsd.plus(fillAmountUsd);
    data.nftFillCount = data.nftFillCount.plus(ONE_BI);

    if (isUniqueUser(event.transaction.from, UniqueUserUsageId.Protocol)) {
        data.uniqueUserCount = data.uniqueUserCount.plus(ONE_BI);
    }

    data.save();

    createProtocolDataSnapshotsIfNecessary(data, event);
}

function createProtocolDataSnapshotsIfNecessary(data: ProtocolData, event: ethereum.Event): void {
    // TODO
}
