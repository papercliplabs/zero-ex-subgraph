import { Address, BigDecimal, ByteArray, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { Protocol, ProtocolMetrics, _ActiveUser } from "../../generated/schema";
import { ONE_BI, UniqueUserUsageId, ZERO_BD, ZERO_BI } from "../common/constants";
import { isUniqueUser } from "../common/utils";

const PROTOCOL_ID = Bytes.fromHexString("0x0");

export function getOrCreateProtocol(event: ethereum.Event): Protocol {
    let protocol = Protocol.load(PROTOCOL_ID);

    if (!protocol) {
        protocol = new Protocol(PROTOCOL_ID);

        const metrics = new ProtocolMetrics(protocol.id);

        metrics.erc20FillVolumeUsd = ZERO_BD;
        metrics.erc20FillCount = ZERO_BI;

        metrics.save();

        protocol.metrics = metrics.id;

        protocol.save();
    }

    return protocol;
}

export function updateProtocolMetricsForErc20Fill(fillAmountUsd: BigDecimal, event: ethereum.Event): void {
    const protocol = getOrCreateProtocol(event);
    const metrics = ProtocolMetrics.load(protocol.id)!; // Guaranteed to exist

    metrics.erc20FillVolumeUsd = metrics.erc20FillVolumeUsd.plus(fillAmountUsd);

    metrics.erc20FillCount = metrics.erc20FillCount.plus(ONE_BI);

    if (isUniqueUser(event.transaction.from, UniqueUserUsageId.Protocol)) {
        metrics.uniqueUserCount = metrics.uniqueUserCount.plus(ONE_BI);
    }

    metrics.save();

    createProtocolMetricsSnapshotsIfNecessary(metrics, event);
}

function createProtocolMetricsSnapshotsIfNecessary(metrics: ProtocolMetrics, event: ethereum.Event): void {
    // TODO
}
