import React, { useState } from 'react';
import { X, ShieldCheck, CreditCard, Smartphone, CheckCircle } from 'lucide-react';
import { formatETB } from '../../../lib/formatters';
import { useWallet } from '../hooks/useWallet';

export const ChapaModal = ({ isOpen, onClose }) => {
  const { addDeposit } = useWallet();
  const [selectedAmount, setSelectedAmount] = useState(500);
  const [phoneNumber, setPhoneNumber] = useState('0911234567');
  const [paymentMethod, setPaymentMethod] = useState('Telebirr');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePay = (e) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      addDeposit(selectedAmount);

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1800);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e6dfd8] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8f482f] flex items-center justify-center text-white font-bold text-sm">
              C
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#1b1c1a]">Chapa Gateway</h3>
              <p className="text-xs text-[#6c6a64]">Secure Stake Deposit & Escrow Lock</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#6c6a64] hover:text-[#1b1c1a] hover:bg-[#efeef0] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-[#5db872]/20 text-[#5db872] rounded-full flex items-center justify-center mx-auto animate-pulse">
              <CheckCircle size={36} />
            </div>
            <div>
              <h4 className="font-serif font-bold text-xl text-[#1b1c1a]">Stake Deposited!</h4>
              <p className="text-sm text-[#6c6a64] mt-1 font-mono">
                {formatETB(selectedAmount)} added to Escrow Vault
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePay} className="space-y-5">
            {/* Amount presets */}
            <div>
              <label className="block text-xs font-semibold text-[#54433e] uppercase tracking-wider mb-2">
                Select ETB Stake Amount
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSelectedAmount(amt)}
                    className={`py-2.5 px-3 rounded-lg border text-sm font-mono font-medium transition-all ${
                      selectedAmount === amt
                        ? 'border-[#8f482f] bg-[#8f482f] text-white shadow-xs'
                        : 'border-[#e6dfd8] bg-white text-[#1b1c1a] hover:border-[#8f482f]'
                    }`}
                  >
                    {formatETB(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#54433e] uppercase tracking-wider mb-2">
                Payment Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Telebirr', 'CBE Birr'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                      paymentMethod === method
                        ? 'border-[#8f482f] bg-[#f5f0e8] text-[#8f482f]'
                        : 'border-[#e6dfd8] bg-white text-[#54433e]'
                    }`}
                  >
                    <Smartphone size={16} />
                    <span>{method}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Number Input */}
            <div>
              <label className="block text-xs font-semibold text-[#54433e] uppercase tracking-wider mb-1">
                Account Mobile Number
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e6dfd8] rounded-lg text-sm font-mono text-[#1b1c1a] focus:outline-none focus:border-[#8f482f]"
                required
              />
            </div>

            {/* Escrow note */}
            <div className="p-3 bg-[#181715] text-[#faf9f5] rounded-lg text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#e8a55a]">
                <ShieldCheck size={14} />
                <span>30-Day Escrow Commitment</span>
              </div>
              <p className="text-stone-400 leading-snug">
                Your ETB deposit remains protected in the smart escrow vault as long as daily exams are passed.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3 bg-[#8f482f] hover:bg-[#a9583e] active:bg-[#75331c] text-white font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing ...</span>
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  <span>Authorize Deposit ({formatETB(selectedAmount)})</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
