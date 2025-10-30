import * as fcl from "@onflow/fcl";

// Network configuration
export const FLOW_NETWORK = process.env.NEXT_PUBLIC_FLOW_NETWORK || "testnet";

// Configure FCL based on network
export const configureFCL = () => {
  if (FLOW_NETWORK === "mainnet") {
    fcl.config({
      "accessNode.api": "https://rest-mainnet.onflow.org",
      "discovery.wallet": "https://fcl-discovery.onflow.org/authn",
      "app.detail.title": "FlowSense",
      "app.detail.icon": "https://flowsense.app/favicon.png",
    });
  } else if (FLOW_NETWORK === "testnet") {
    fcl.config({
      "accessNode.api": "https://rest-testnet.onflow.org",
      "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
      "app.detail.title": "FlowSense",
      "app.detail.icon": "https://flowsense.app/favicon.png",
    });
  } else {
    // Local emulator
    fcl.config({
      "accessNode.api": "http://localhost:8888",
      "discovery.wallet": "http://localhost:8701/fcl/authn",
      "app.detail.title": "FlowSense",
      "app.detail.icon": "https://flowsense.app/favicon.png",
    });
  }
};

// Helper to get current network info
export const getNetworkInfo = () => {
  return {
    network: FLOW_NETWORK,
    isMainnet: FLOW_NETWORK === "mainnet",
    isTestnet: FLOW_NETWORK === "testnet",
    isEmulator: FLOW_NETWORK === "emulator",
  };
};