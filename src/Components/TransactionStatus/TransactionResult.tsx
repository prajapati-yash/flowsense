// Transaction Result Component
// Shows final result with explorer link and details

import React from 'react';
import { motion } from 'framer-motion';
import { TransactionResult as TxResult } from '@/services/flow-transactions';
import { FiCheck, FiX, FiExternalLink, FiCopy, FiClock } from 'react-icons/fi';

interface TransactionResultProps {
  result: TxResult;
  onNewTransaction?: () => void;
}

const TransactionResult: React.FC<TransactionResultProps> = ({
  result,
  onNewTransaction
}) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getResultConfig = () => {
    if (result.success) {
      return {
        icon: <FiCheck className="w-8 h-8" />,
        color: 'text-green-400',
        bgColor: 'bg-green-400/20',
        borderColor: 'border-green-400/40',
        title: 'Transaction Successful! 🎉',
        titleColor: 'text-green-400'
      };
    } else {
      return {
        icon: <FiX className="w-8 h-8" />,
        color: 'text-red-400',
        bgColor: 'bg-red-400/20',
        borderColor: 'border-red-400/40',
        title: 'Transaction Failed',
        titleColor: 'text-red-400'
      };
    }
  };

  const config = getResultConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/10 backdrop-blur-md border ${config.borderColor} rounded-2xl p-6 space-y-4`}
    >
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-full ${config.bgColor}`}>
          <div className={config.color}>
            {config.icon}
          </div>
        </div>
        <div>
          <h3 className={`text-xl font-viga ${config.titleColor}`}>
            {config.title}
          </h3>
          <p className="text-white/70 font-rubik text-sm">
            {result.message}
          </p>
        </div>
      </div>

      {/* Transaction Details */}
      {result.success && result.txId && (
        <div className="space-y-3">
          {/* Transaction ID */}
          <div className="bg-white/5 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm font-rubik">
                Transaction ID:
              </span>
              <button
                onClick={() => copyToClipboard(result.txId!)}
                className="flex items-center space-x-1 text-[#00ef8b] hover:text-[#00ef8b]/80 transition-colors"
              >
                {copied ? (
                  <FiCheck className="w-4 h-4" />
                ) : (
                  <FiCopy className="w-4 h-4" />
                )}
                <span className="text-xs">
                  {copied ? 'Copied!' : 'Copy'}
                </span>
              </button>
            </div>
            <div className="font-mono text-white text-sm bg-white/10 px-3 py-2 rounded break-all">
              {result.txId}
            </div>
          </div>

          {/* Explorer Link */}
          {result.explorerUrl && (
            <motion.a
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-lg bg-gradient-to-r from-[#00ef8b] to-white text-black font-medium shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <FiExternalLink className="w-4 h-4" />
              <span>View on Flow Explorer</span>
            </motion.a>
          )}

          {/* Additional Details */}
          <div className="grid grid-cols-2 gap-4">
            {result.executionTime && (
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center space-x-1 text-white/70 mb-1">
                  <FiClock className="w-4 h-4" />
                  <span className="text-xs font-rubik">Execution Time</span>
                </div>
                <span className="text-white font-viga">
                  {result.executionTime}s
                </span>
              </div>
            )}

            {result.gasUsed && (
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-white/70 text-xs font-rubik mb-1">
                  Gas Used
                </div>
                <span className="text-white font-viga">
                  {result.gasUsed}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Details */}
      {!result.success && result.status.errorMessage && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4">
          <h4 className="text-red-400 font-medium mb-2">Error Details:</h4>
          <p className="text-white/80 text-sm font-rubik">
            {result.status.errorMessage}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        {onNewTransaction && (
          <motion.button
            onClick={onNewTransaction}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-3 px-4 rounded-lg border border-[#00ef8b]/40 text-[#00ef8b] font-medium hover:bg-[#00ef8b]/10 transition-all duration-300"
          >
            New Transaction
          </motion.button>
        )}

        {result.explorerUrl && (
          <motion.button
            onClick={() => copyToClipboard(result.explorerUrl!)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-300"
          >
            <FiCopy className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Success Animation */}
      {result.success && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center"
        >
          <FiCheck className="w-3 h-3 text-white" />
        </motion.div>
      )}
    </motion.div>
  );
};

export default TransactionResult;