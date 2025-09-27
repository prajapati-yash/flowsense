// Transaction Preview Component
// Shows transaction details before execution

import React from 'react';
import { motion } from 'framer-motion';
import { TransactionPlan } from '@/services/transaction-router';
import { FiArrowRight, FiClock, FiZap, FiDollarSign } from 'react-icons/fi';

interface TransactionPreviewProps {
  plan: TransactionPlan;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const TransactionPreview: React.FC<TransactionPreviewProps> = ({
  plan,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  const getExecutionIcon = () => {
    switch (plan.executionMode) {
      case 'immediate':
        return <FiZap className="w-4 h-4" />;
      case 'nativeScheduled':
        return <FiClock className="w-4 h-4" />;
      default:
        return <FiClock className="w-4 h-4" />;
    }
  };

  const getExecutionColor = () => {
    switch (plan.executionMode) {
      case 'immediate':
        return 'text-[#00ef8b]';
      case 'nativeScheduled':
        return 'text-blue-400';
      default:
        return 'text-yellow-400';
    }
  };

  // Extract amount and recipient from parameters
  const amount = plan.parameters.find(p => p.type === 'UFix64')?.value || '0';
  const recipient = plan.parameters.find(p => p.type === 'Address')?.value || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-md border border-[#00ef8b]/20 rounded-2xl p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-viga text-white">
          Transaction Preview
        </h3>
        <div className={`flex items-center space-x-2 ${getExecutionColor()}`}>
          {getExecutionIcon()}
          <span className="text-sm font-medium capitalize">
            {plan.executionMode}
          </span>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="space-y-3">
        {/* Amount */}
        <div className="flex items-center justify-between py-2 border-b border-white/10">
          <div className="flex items-center space-x-2 text-white/70">
            <FiDollarSign className="w-4 h-4" />
            <span className="font-rubik text-sm">Amount</span>
          </div>
          <span className="font-viga text-white text-lg">
            {amount} FLOW
          </span>
        </div>

        {/* Recipient */}
        <div className="flex items-center justify-between py-2 border-b border-white/10">
          <div className="flex items-center space-x-2 text-white/70">
            <FiArrowRight className="w-4 h-4" />
            <span className="font-rubik text-sm">To</span>
          </div>
          <span className="font-mono text-white text-sm bg-white/5 px-2 py-1 rounded">
            {recipient.slice(0, 8)}...{recipient.slice(-6)}
          </span>
        </div>

        {/* Transaction Type */}
        <div className="flex items-center justify-between py-2 border-b border-white/10">
          <span className="font-rubik text-sm text-white/70">Type</span>
          <span className="font-medium text-white">
            {plan.type === 'immediate_transfer' ? 'Direct Transfer' : 'FlowSense Action'}
          </span>
        </div>

        {/* Execution Time */}
        <div className="flex items-center justify-between py-2 border-b border-white/10">
          <span className="font-rubik text-sm text-white/70">Execution</span>
          <span className="font-medium text-white text-sm">
            {plan.estimatedTime}
          </span>
        </div>

        {/* Gas Estimate */}
        <div className="flex items-center justify-between py-2 border-b border-white/10">
          <span className="font-rubik text-sm text-white/70">Gas Fee</span>
          <span className="font-medium text-white">
            {plan.gasEstimate}
          </span>
        </div>

        {/* Native Scheduling Info */}
        {plan.executionMode === 'nativeScheduled' && (
          <>
            {plan.schedulingFees && (
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="font-rubik text-sm text-white/70">Scheduling Fee</span>
                <span className="font-medium text-white">
                  {plan.schedulingFees} FLOW
                </span>
              </div>
            )}
            {plan.totalCost && (
              <div className="flex items-center justify-between py-2">
                <span className="font-rubik text-sm text-white/70">Total Cost</span>
                <span className="font-medium text-[#00ef8b]">
                  {plan.totalCost} FLOW
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Description */}
      <div className="bg-white/5 rounded-lg p-3">
        <p className="text-white/80 text-sm font-rubik">
          {plan.description}
        </p>
      </div>

      {/* Native Scheduling Info */}
      {plan.executionMode === 'nativeScheduled' && (
        <div className="bg-blue-500/10 rounded-lg p-3">
          <h4 className="text-blue-400 font-medium text-sm mb-2">🚀 Native Flow Scheduling</h4>
          <div className="space-y-1 text-xs text-white/70">
            <p>• <strong>Step 1:</strong> Confirm this transaction to schedule the transfer</p>
            <p>• <strong>Step 2:</strong> Flow's scheduler will automatically execute at scheduled time</p>
            <p>• <strong>No manual trigger required</strong> - completely autonomous execution</p>
            <p>• Scheduling fee covers network execution costs</p>
          </div>
        </div>
      )}

      {/* Scheduled Transfer Info */}
      {(plan.executionMode === 'scheduled' || plan.executionMode === 'nativeScheduled') && (
        <div className="bg-amber-500/10 rounded-lg p-3 mt-3">
          <h4 className="text-amber-400 font-medium text-sm mb-2">⚠️ Important: Understanding Scheduled Transfers</h4>
          <div className="space-y-1 text-xs text-white/70">
            <p>• <strong>Confirming this transaction will NOT transfer the tokens immediately</strong></p>
            <p>• It will schedule the transfer for the specified future time</p>
            <p>• The actual transfer will happen automatically at the scheduled time</p>
            <p>• You will see "Transfer scheduled successfully" after confirmation</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        <motion.button
          onClick={onCancel}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-3 px-4 rounded-lg border border-white/20 text-white font-medium hover:bg-white/5 transition-all duration-300"
          disabled={isLoading}
        >
          Cancel
        </motion.button>

        <motion.button
          onClick={onConfirm}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isLoading}
          className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-[#00ef8b] to-white text-black font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
              <span>
                {plan.executionMode === 'nativeScheduled' || plan.executionMode === 'scheduled'
                  ? 'Scheduling...'
                  : 'Confirming...'}
              </span>
            </div>
          ) : (
            plan.executionMode === 'immediate'
              ? 'Confirm Transfer'
              : plan.executionMode === 'nativeScheduled'
              ? 'Schedule Transfer'
              : plan.executionMode === 'scheduled'
              ? 'Schedule Transfer'
              : 'Confirm Transaction'
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default TransactionPreview;