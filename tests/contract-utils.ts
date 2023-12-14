import { newMockEvent } from "matchstick-as"
import { ethereum, Bytes } from "@graphprotocol/graph-ts"
import { ProtocolFeeUnfunded } from "../generated/Contract/Contract"

export function createProtocolFeeUnfundedEvent(
  orderHash: Bytes
): ProtocolFeeUnfunded {
  let protocolFeeUnfundedEvent = changetype<ProtocolFeeUnfunded>(newMockEvent())

  protocolFeeUnfundedEvent.parameters = new Array()

  protocolFeeUnfundedEvent.parameters.push(
    new ethereum.EventParam(
      "orderHash",
      ethereum.Value.fromFixedBytes(orderHash)
    )
  )

  return protocolFeeUnfundedEvent
}
