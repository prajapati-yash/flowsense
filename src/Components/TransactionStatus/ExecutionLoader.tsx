// Transaction Execution Loader Component
// Shows progress during transaction execution

import React from 'react';
import { motion } from 'framer-motion';
import { TransactionStatus } from '@/services/flow-transactions';
import { FiLoader, FiCheck, FiX, FiClock } from 'react-icons/fi';

interface ExecutionLoaderProps {
  status: TransactionStatus;
  txId?: string;
}

const ExecutionLoader: React.FC<ExecutionLoaderProps> = ({ status, txId }) => {
  const getStatusConfig = () => {
    switch (status.status) {
      case 'pending':
        return {
          icon: <FiClock className="w-6 h-6" />,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/20',
          title: 'Preparing Transaction',
          description: 'Setting up transaction parameters...'
        };
      case 'executing':
        return {
          icon: <FiLoader className="w-6 h-6 animate-spin" />,
          color: 'text-[#00ef8b]',
          bgColor: 'bg-[#00ef8b]/20',
          title: 'Executing Transaction',
          description: 'Broadcasting to Flow network...'
        };
      case 'sealing':
        return {
          icon: <FiLoader className="w-6 h-6 animate-spin" />,
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/20',
          title: 'Sealing Transaction',
          description: 'Finalizing on blockchain...'
        };
      case 'success':
        return {
          icon: <FiCheck className="w-6 h-6" />,
          color: 'text-green-400',
          bgColor: 'bg-green-400/20',
          title: 'Transaction Successful',
          description: 'FLOW transfer completed!'
        };
      case 'failed':
        return {
          icon: <FiX className="w-6 h-6" />,
          color: 'text-red-400',
          bgColor: 'bg-red-400/20',
          title: 'Transaction Failed',
          description: status.errorMessage || 'Something went wrong'
        };
      default:
        return {
          icon: <FiLoader className="w-6 h-6 animate-spin" />,
          color: 'text-white',
          bgColor: 'bg-white/20',
          title: 'Processing',
          description: 'Please wait...'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/10 backdrop-blur-md border border-[#00ef8b]/20 rounded-2xl p-6"
    >
      {/* Status Icon and Title */}
      <div className="flex items-center space-x-4 mb-4">
        <div className={`p-3 rounded-full ${config.bgColor}`}>
          <div className={config.color}>
            {config.icon}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-viga text-white">
            {config.title}
          </h3>
          <p className="text-white/70 font-rubik text-sm">
            {config.description}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${
            ['pending', 'executing', 'sealing', 'success'].includes(status.status)
              ? 'bg-[#00ef8b]'
              : 'bg-white/30'
          }`}></div>
          <span className="text-white/70 text-sm font-rubik">
            Transaction submitted
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${
            ['executing', 'sealing', 'success'].includes(status.status)
              ? 'bg-[#00ef8b]'
              : status.status === 'failed'
              ? 'bg-red-400'
              : 'bg-white/30'
          }`}></div>
          <span className="text-white/70 text-sm font-rubik">
            Processing on blockchain
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${
            ['sealing', 'success'].includes(status.status)
              ? 'bg-[#00ef8b]'
              : status.status === 'failed'
              ? 'bg-red-400'
              : 'bg-white/30'
          }`}></div>
          <span className="text-white/70 text-sm font-rubik">
            Sealing in block
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${
            status.status === 'success'
              ? 'bg-green-400'
              : status.status === 'failed'
              ? 'bg-red-400'
              : 'bg-white/30'
          }`}></div>
          <span className="text-white/70 text-sm font-rubik">
            Completed
          </span>
        </div>
      </div>

      {/* Transaction ID */}
      {txId && (
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-sm font-rubik">
              Transaction ID:
            </span>
            <span className="font-mono text-white text-xs bg-white/10 px-2 py-1 rounded">
              {txId.slice(0, 8)}...{txId.slice(-8)}
            </span>
          </div>
        </div>
      )}

      {/* Loading Animation for Active States */}
      {['pending', 'executing', 'sealing'].includes(status.status) && (
        <div className="mt-4">
          <div className="flex space-x-1 justify-center">
            <motion.div
              className="w-2 h-2 bg-[#00ef8b] rounded-full"
              animate={{ y: [-4, 4, -4] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="w-2 h-2 bg-[#00ef8b] rounded-full"
              animate={{ y: [-4, 4, -4] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
            />
            <motion.div
              className="w-2 h-2 bg-[#00ef8b] rounded-full"
              animate={{ y: [-4, 4, -4] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            />
          </div>
        </div>
      )}

      {/* Block Height Info */}
      {status.blockHeight && (
        <div className="mt-3 text-center">
          <span className="text-white/50 text-xs font-rubik">
            Block #{status.blockHeight}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default ExecutionLoader;