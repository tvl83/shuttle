import { GasPrice } from "@cosmjs/stargate";
import { OfflineDirectSigner, OfflineSigner } from "@cosmjs/proto-signing";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";

import type { SigningResult } from "../../internals/transactions";
import type { TransactionMsg } from "../../internals/transactions/messages";
import type { WalletConnection } from "../../internals/wallet";
import type { Network } from "../../internals/network";
import { DEFAULT_CURRENCY, DEFAULT_GAS_PRICE } from "../../internals/network";

export class OfflineDirectSigningClient {
  static async sign(
    offlineSigner: OfflineSigner & OfflineDirectSigner,
    {
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    }: {
      network: Network;
      wallet: WalletConnection;
      messages: TransactionMsg[];
      feeAmount?: string | null;
      gasLimit?: string | null;
      memo?: string | null;
      overrides?: {
        rpc?: string;
        rest?: string;
      };
    },
  ): Promise<SigningResult> {
    return await this.cosmos(offlineSigner, {
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    });
  }

  static async cosmos(
    offlineSigner: OfflineDirectSigner,
    {
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    }: {
      network: Network;
      wallet: WalletConnection;
      messages: TransactionMsg[];
      feeAmount?: string | null;
      gasLimit?: string | null;
      memo?: string | null;
      overrides?: {
        rpc?: string;
        rest?: string;
      };
    },
  ): Promise<SigningResult> {
    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    const client = await SigningCosmWasmClient.connectWithSigner(overrides?.rpc ?? network.rpc, offlineSigner, {
      gasPrice,
    });

    const processedMessages = messages.map((message) => message.toCosmosMsg());

    const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
    const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
    const fee = {
      amount: [{ amount: feeAmount || gas, denom: feeCurrency.coinMinimalDenom }],
      gas: gasLimit || gas,
    };

    const txRaw = await client.sign(wallet.account.address, processedMessages, fee, memo || "");

    return {
      signatures: txRaw.signatures,
      response: txRaw,
    };
  }
}

export default OfflineDirectSigningClient;
