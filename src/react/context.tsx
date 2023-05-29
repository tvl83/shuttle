import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import useLocalStorageState from "use-local-storage-state";

import { WalletProvider } from "../providers/WalletProvider";
import { WalletConnection } from "../internals/wallet";
import { TransactionMsg, SimulateResult, BroadcastResult, SigningResult } from "../internals/transaction";
import { ShuttleStore, useShuttleStore } from "./store";

type ShuttleContextType = {
  providers: WalletProvider[];
  connect: (options: { providerId: string; chainId: string }) => Promise<WalletConnection>;
  wallets: WalletConnection[];
  getWallets: (filters?: { providerId?: string; chainId?: string }) => WalletConnection[];
  recentWallet: WalletConnection | null;
  disconnect: (filters?: { providerId?: string; chainId?: string }) => void;
  disconnectWallet: (wallet: WalletConnection) => void;
  simulate: (options: { messages: TransactionMsg[]; wallet?: WalletConnection | null }) => Promise<SimulateResult>;
  broadcast: (options: {
    messages: TransactionMsg[];
    wallet?: WalletConnection | null;
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    mobile?: boolean;
    overrides?: {
      rpc?: string;
      rest?: string;
    };
  }) => Promise<BroadcastResult>;
  sign: (options: {
    messages: TransactionMsg[];
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    wallet?: WalletConnection | null;
    mobile?: boolean;
  }) => Promise<SigningResult>;
};

export const ShuttleContext = createContext<ShuttleContextType | undefined>(undefined);

export const ShuttleProvider = ({
  persistent = false,
  persistentKey = "shuttle",
  providers = [],
  store,
  children,
  withLogging = false,
}: {
  persistent?: boolean;
  persistentKey?: string;
  providers: WalletProvider[];
  store?: ShuttleStore;
  children?: React.ReactNode;
  withLogging?: boolean;
}) => {
  const [availableProviders, setAvailableProviders] = useState<WalletProvider[]>([]);

  const internalStore = useShuttleStore();
  const [walletConnections, setWalletConnections] = useLocalStorageState<WalletConnection[]>(
    persistentKey || "shuttle",
    { defaultValue: [] },
  );

  const wallets = useMemo(() => {
    return store?.wallets || internalStore.wallets;
  }, [store, internalStore]);

  const getWallets = useMemo(() => {
    return store?.getWallets || internalStore.getWallets;
  }, [store, internalStore]);

  const recentWallet = useMemo(() => {
    return store?.recentWallet || internalStore.recentWallet;
  }, [store, internalStore]);

  const addWallet = useCallback(
    (wallet: WalletConnection) => {
      internalStore.addWallet(wallet);
      store?.addWallet(wallet);
      if (persistent) {
        setWalletConnections(internalStore.getWallets());
      }
    },
    [internalStore, persistent, setWalletConnections, store],
  );

  const removeWallets = useCallback(
    (filters?: { providerId?: string; chainId?: string }) => {
      internalStore.removeWallets(filters);
      store?.removeWallets(filters);
      if (persistent) {
        setWalletConnections(internalStore.getWallets());
      }
    },
    [internalStore, persistent, setWalletConnections, store],
  );

  const removeWallet = useCallback(
    (wallet: WalletConnection) => {
      internalStore.removeWallet(wallet);
      store?.removeWallet(wallet);
      if (persistent) {
        setWalletConnections(internalStore.getWallets());
      }
    },
    [internalStore, persistent, setWalletConnections, store],
  );

  const providerInterface = useMemo(() => {
    const connect = async ({
      providerId,
      chainId,
    }: {
      providerId: string;
      chainId: string;
    }): Promise<WalletConnection> => {
      const provider = availableProviders.find((provider) => provider.id === providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }
      const wallet = await provider.connect({ chainId });

      addWallet(wallet);
      return wallet;
    };

    const disconnect = (filters?: { providerId?: string; chainId?: string }) => {
      internalStore.getWallets(filters).forEach((wallet) => {
        const provider = availableProviders.find((provider) => provider.id === wallet.providerId);
        if (provider) {
          provider.disconnect({ wallet });
        }
      });

      removeWallets(filters);
    };

    const disconnectWallet = (wallet: WalletConnection) => {
      const provider = availableProviders.find((provider) => provider.id === wallet.providerId);

      if (provider) {
        provider.disconnect({ wallet });
      }

      removeWallet(wallet);
    };

    const simulate = async ({ messages, wallet }: { messages: TransactionMsg[]; wallet?: WalletConnection | null }) => {
      const walletToUse = wallet || recentWallet;
      if (!walletToUse) {
        throw new Error("No wallet to simulate with");
      }

      const provider = availableProviders.find((provider) => provider.id === walletToUse.providerId);

      if (!provider) {
        throw new Error(`Provider ${walletToUse.providerId} not found`);
      }

      return provider.simulate({ messages, wallet: walletToUse });
    };

    const broadcast = async ({
      messages,
      wallet,
      feeAmount,
      gasLimit,
      memo,
      mobile,
      overrides,
    }: {
      messages: TransactionMsg[];
      wallet?: WalletConnection | null;
      feeAmount?: string | null;
      gasLimit?: string | null;
      memo?: string | null;
      mobile?: boolean;
      overrides?: {
        rpc?: string;
        rest?: string;
      };
    }) => {
      const walletToUse = wallet || recentWallet;
      if (!walletToUse) {
        throw new Error("No wallet to broadcast with");
      }

      const provider = availableProviders.find((provider) => provider.id === walletToUse.providerId);

      if (!provider) {
        throw new Error(`Provider ${walletToUse.providerId} not found`);
      }

      return provider.broadcast({ messages, wallet: walletToUse, feeAmount, gasLimit, memo, mobile, overrides });
    };

    const sign = async ({
      messages,
      feeAmount,
      gasLimit,
      memo,
      wallet,
      mobile,
    }: {
      messages: TransactionMsg[];
      feeAmount?: string | null;
      gasLimit?: string | null;
      memo?: string | null;
      wallet?: WalletConnection | null;
      mobile?: boolean;
    }) => {
      const walletToUse = wallet || recentWallet;
      if (!walletToUse) {
        throw new Error("No wallet to sign with");
      }

      const provider = availableProviders.find((provider) => provider.id === walletToUse.providerId);

      if (!provider) {
        throw new Error(`Provider ${walletToUse.providerId} not found`);
      }

      return provider.sign({ messages, wallet: walletToUse, feeAmount, gasLimit, memo, mobile });
    };

    return {
      providers,
      connect,
      wallets,
      getWallets,
      recentWallet,
      disconnect,
      disconnectWallet,
      simulate,
      broadcast,
      sign,
    };
  }, [
    providers,
    wallets,
    getWallets,
    recentWallet,
    internalStore,
    availableProviders,
    addWallet,
    removeWallets,
    removeWallet,
  ]);

  const updateWallets = (provider: WalletProvider) => {
    getWallets({ providerId: provider.id }).forEach((providerWallet) => {
      provider
        .connect({ chainId: providerWallet.network.chainId })
        .then((wallet) => {
          if (providerWallet.id !== wallet.id) {
            removeWallet(providerWallet);
            addWallet(wallet);
          }
        })
        .catch(() => {
          removeWallet(providerWallet);
        });
    });
  };

  // Initialize store
  useEffect(() => {
    if (walletConnections && walletConnections.length > 0 && internalStore.getWallets().length === 0) {
      internalStore.restore(walletConnections);
      store?.restore(walletConnections);
    }
  }, [walletConnections, internalStore, store]);

  // Initialize providers
  useEffect(() => {
    providers
      .filter((provider) => !provider.initializing && !provider.initialized)
      .forEach((provider) => {
        provider
          .init()
          .then(() => {
            updateWallets(provider);

            provider.setOnUpdateCallback(() => {
              updateWallets(provider);
            });

            setAvailableProviders((prev) => {
              const rest = prev.filter((p) => p.id !== provider.id);
              return [...rest, provider];
            });
          })
          .catch((e) => {
            if (withLogging) {
              console.warn("Shuttle: ", e);
            }
          });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ShuttleContext.Provider value={providerInterface}>{children}</ShuttleContext.Provider>;
};

export const useShuttle = () => {
  const context = useContext(ShuttleContext);

  if (context === undefined) {
    throw new Error("Please wrap your component with ShuttleProvider to call: useShuttle");
  }

  return context;
};
