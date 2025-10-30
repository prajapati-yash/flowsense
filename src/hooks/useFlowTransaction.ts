"use client";

import { useState, useCallback, useRef } from "react";
import * as fcl from "@onflow/fcl";
import { useToast } from "@/Components/Toast/ToastProvider";

export interface TransactionStatus {
  status: "idle" | "pending" | "processing" | "success" | "error";
  transactionId?: string;
  errorMessage?: string;
}

export type TransactionResult =
  | { success: true; transactionId: string; transaction: unknown }
  | { success: false; error: string };

export type ScriptResult =
  | { success: true; result: unknown }
  | { success: false; error: string };

export function useFlowTransaction() {
  const { showToast } = useToast();
  const [txStatus, setTxStatus] = useState<TransactionStatus>({ status: "idle" });

  // Use ref to avoid breaking user gesture chain
  const txStatusRef = useRef<TransactionStatus>({ status: "idle" });

  // Execute a Cadence transaction
  const executeTransaction = useCallback(
    async (cadenceCode: string, args: unknown[] = [], statusCallback?: (status: TransactionStatus) => void): Promise<TransactionResult> => {
      try {
        // Reset status
        const initialStatus: TransactionStatus = { status: "pending" };
        txStatusRef.current = initialStatus;
        setTxStatus(initialStatus);
        statusCallback?.(initialStatus);

        showToast("Waiting for wallet approval...", "info");

        // Send transaction - This will trigger wallet popup
        // IMPORTANT: Must be called synchronously from user gesture
        const transactionId = await fcl.mutate({
          cadence: cadenceCode,
          args: () => args,
          limit: 9999,
        });

        console.log("[useFlowTransaction] Transaction sent:", transactionId);

        const processingStatus: TransactionStatus = {
          status: "processing",
          transactionId,
        };
        txStatusRef.current = processingStatus;
        setTxStatus(processingStatus);
        statusCallback?.(processingStatus);

        showToast("Transaction submitted! Processing...", "info");

        // Wait for transaction to be sealed
        const transaction = await fcl.tx(transactionId).onceSealed();

        console.log("[useFlowTransaction] Transaction sealed:", transaction);

        if (transaction.statusCode === 0) {
          const successStatus: TransactionStatus = {
            status: "success",
            transactionId,
          };
          txStatusRef.current = successStatus;
          setTxStatus(successStatus);
          statusCallback?.(successStatus);

          showToast("Transaction successful!", "success");
          return { success: true, transactionId, transaction };
        } else {
          throw new Error(`Transaction failed with status code: ${transaction.statusCode}`);
        }
      } catch (error: unknown) {
        console.error("[useFlowTransaction] Transaction error:", error);

        const errorMessage = error instanceof Error ? error.message : "Transaction failed";
        const errorStatus: TransactionStatus = {
          status: "error",
          errorMessage,
        };
        txStatusRef.current = errorStatus;
        setTxStatus(errorStatus);
        statusCallback?.(errorStatus);

        showToast(errorMessage, "error");
        return { success: false, error: errorMessage };
      }
    },
    [showToast]
  );

  // Execute a Cadence script (read-only, no transaction)
  const executeScript = useCallback(async (cadenceCode: string, args: unknown[] = []): Promise<ScriptResult> => {
    try {
      const result = await fcl.query({
        cadence: cadenceCode,
        args: () => args,
      });

      return { success: true, result };
    } catch (error: unknown) {
      console.error("[useFlowTransaction] Script error:", error);
      const errorMessage = error instanceof Error ? error.message : "Script execution failed";
      showToast(errorMessage, "error");
      return { success: false, error: errorMessage };
    }
  }, [showToast]);

  return {
    executeTransaction,
    executeScript,
    txStatus,
    isProcessing: txStatus.status === "pending" || txStatus.status === "processing",
  };
}