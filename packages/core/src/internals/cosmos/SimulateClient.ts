import { calculateFee, GasPrice } from "@cosmjs/stargate";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";

import { DEFAULT_GAS_MULTIPLIER, DEFAULT_GAS_PRICE, Network } from "../../internals/network";
import { WalletConnection } from "../../internals/wallet";
import { SimulateResult, TransactionMsg } from "../../internals/transactions";
import { Fee } from "../../internals/cosmos";
import FakeOfflineSigner from "./FakeOfflineSigner";

export class SimulateClient {
  static async run({
    network,
    wallet,
    messages,
    overrides,
  }: {
    network: Network;
    wallet: WalletConnection;
    messages: TransactionMsg[];
    overrides?: {
      rpc?: string;
      rest?: string;
    };
  }): Promise<SimulateResult> {
    return await this.cosmos({ network, wallet, messages, overrides });
  }

  static async cosmos({
    network,
    wallet,
    messages,
    overrides,
  }: {
    network: Network;
    wallet: WalletConnection;
    messages: TransactionMsg[];
    overrides?: {
      rpc?: string;
      rest?: string;
    };
  }): Promise<SimulateResult> {
    const signer = new FakeOfflineSigner(wallet);
    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    const client = await SigningCosmWasmClient.connectWithSigner(overrides?.rpc ?? network.rpc, signer, { gasPrice });

    const processedMessages = messages.map((message) => message.toCosmosMsg());

    try {
      const gasEstimation = await client.simulate(wallet.account.address, processedMessages, "");

      const fee = calculateFee(
        Math.round(gasEstimation * DEFAULT_GAS_MULTIPLIER),
        network.gasPrice || DEFAULT_GAS_PRICE,
      ) as Fee;

      return {
        success: true,
        fee,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message,
      };
    }
  }
}

export default SimulateClient;
