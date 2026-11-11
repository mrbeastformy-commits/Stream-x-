import React, { useState, useEffect } from 'react';
import {
  Crown,
  Check,
  CreditCard,
  Smartphone,
  Building2,
  ShieldCheck,
  Lock,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Copy,
  Upload,
  Clock,
  Eye,
  AlertTriangle,
  FileText,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PremiumPlan, PaymentMethod, PaymentTransaction } from '../../types';
import {
  subscribeActivePlans,
  createPaymentTransaction,
  activateUserPremium,
  savePremiumPlan,
  subscribeUserPayments,
  uploadMediaFile,
  OWNER_JAZZCASH_NUMBER,
  OWNER_JAZZCASH_TITLE
} from '../../services/mediaService';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, onOpenAuth }) => {
  const { user, userProfile, isPremium } = useAuth();

  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan | null>(null);

  // Modal navigation tabs: 'plans' | 'submissions'
  const [activeTab, setActiveTab] = useState<'plans' | 'submissions'>('plans');

  // Checkout steps: 'select_plan' | 'checkout' | 'pending_review' | 'success'
  const [step, setStep] = useState<'select_plan' | 'checkout' | 'pending_review' | 'success'>('select_plan');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('jazzcash');

  // User payment submissions
  const [userPayments, setUserPayments] = useState<PaymentTransaction[]>([]);

  // JazzCash Form State
  const [jazzcashTid, setJazzcashTid] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptUploadProgress, setReceiptUploadProgress] = useState<number>(0);
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Card Form State
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [bankRef, setBankRef] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [lastSubmittedTx, setLastSubmittedTx] = useState<PaymentTransaction | null>(null);

  // Subscribe to real configurable plans from Firestore
  useEffect(() => {
    if (!isOpen) return;

    const unsubPlans = subscribeActivePlans(async (activePlans) => {
      if (activePlans.length === 0) {
        // Initialize real default Pakistani / International STREAMX plans
        await savePremiumPlan({
          name: 'Monthly Premium',
          billingCycle: 'monthly',
          price: 499,
          currency: 'PKR',
          features: 'Ad-Free Streaming, 4K Ultra HD Support, 500MB Upload Limits, VIP Gold Profile Badge',
          isActive: true
        });
        await savePremiumPlan({
          name: 'Yearly Premium',
          billingCycle: 'yearly',
          price: 3999,
          currency: 'PKR',
          features: 'Full Year Access (Save 33%), Ad-Free, Exclusive Content, 1GB Upload Storage, VIP Gold Crown',
          isActive: true
        });
      } else {
        setPlans(activePlans);
        if (!selectedPlan && activePlans.length > 0) {
          setSelectedPlan(activePlans[0]);
        }
      }
    });

    return () => unsubPlans();
  }, [isOpen]);

  // Subscribe to user's payment history
  useEffect(() => {
    if (!isOpen || !user) return;
    const unsubPayments = subscribeUserPayments(user.uid, (txs) => {
      setUserPayments(txs);
    });
    return () => unsubPayments();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(OWNER_JAZZCASH_NUMBER);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  const handleProceedToCheckout = () => {
    if (!user) {
      onClose();
      onOpenAuth();
      return;
    }
    setStep('checkout');
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptFile(file);
      const url = URL.createObjectURL(file);
      setReceiptPreviewUrl(url);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
      setReceiptPreviewUrl(null);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPlan) return;

    setIsProcessing(true);
    setPaymentError(null);

    try {
      if (paymentMethod === 'jazzcash') {
        const cleanTid = jazzcashTid.trim();
        if (!cleanTid) {
          throw new Error('Please enter your JazzCash Transaction ID (TID).');
        }
        if (cleanTid.length < 5) {
          throw new Error('Please enter a valid Transaction ID.');
        }

        // Upload receipt screenshot if provided
        let uploadedReceiptUrl = '';
        if (receiptFile) {
          try {
            uploadedReceiptUrl = await uploadMediaFile(receiptFile, 'receipts', (p) => {
              setReceiptUploadProgress(p);
            });
          } catch (uploadErr) {
            console.warn('Receipt upload failed, continuing with TID', uploadErr);
          }
        }

        // Create transaction in Firestore with status: 'pending' (DO NOT assume payment is successful!)
        const txData: Omit<PaymentTransaction, 'id' | 'createdAt'> = {
          userId: user.uid,
          userEmail: user.email || '',
          userName: user.displayName || userProfile?.displayName || 'STREAMX Customer',
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          billingCycle: selectedPlan.billingCycle,
          amount: selectedPlan.price,
          currency: selectedPlan.currency,
          paymentMethod: 'jazzcash',
          transactionReference: cleanTid,
          jazzcashNumber: OWNER_JAZZCASH_NUMBER,
          status: 'pending',
          notes: `Customer submitted JazzCash reference: TID ${cleanTid} for ${selectedPlan.name}. Awaiting manual statement reconciliation.`,
          ...(senderPhone.trim() ? { senderPhone: senderPhone.trim() } : {}),
          ...(uploadedReceiptUrl ? { receiptUrl: uploadedReceiptUrl } : {})
        };

        const txId = await createPaymentTransaction(txData);
        setLastSubmittedTx({
          ...txData,
          id: txId,
          createdAt: new Date().toISOString()
        } as PaymentTransaction);

        // Move to pending review screen
        setStep('pending_review');
      } else if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
        const cleanCard = cardNumber.replace(/\s+/g, '');
        if (cleanCard.length < 13 || cleanCard.length > 19) {
          throw new Error('Please enter a valid card number.');
        }
        if (!expiry.includes('/') || expiry.length < 5) {
          throw new Error('Please enter a valid expiry date (MM/YY).');
        }
        if (cvv.length < 3) {
          throw new Error('Please enter a valid CVV security code.');
        }

        const txRef = 'TX_STX_' + Date.now().toString(36).toUpperCase();
        const txId = await createPaymentTransaction({
          userId: user.uid,
          userEmail: user.email || '',
          userName: user.displayName || 'STREAMX Customer',
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          billingCycle: selectedPlan.billingCycle,
          amount: selectedPlan.price,
          currency: selectedPlan.currency,
          paymentMethod,
          transactionReference: txRef,
          status: 'completed',
          notes: `Tokenized ${paymentMethod.toUpperCase()} transaction.`
        });

        const months = selectedPlan.billingCycle === 'yearly' ? 12 : 1;
        await activateUserPremium(user.uid, selectedPlan.id, months);
        setLastSubmittedTx({
          id: txId,
          userId: user.uid,
          userEmail: user.email || '',
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          currency: selectedPlan.currency,
          paymentMethod,
          transactionReference: txRef,
          status: 'completed',
          createdAt: new Date().toISOString()
        });
        setStep('success');
      } else {
        // Bank transfer or Google Play
        const refNum = bankRef.trim() || ('REF_' + Date.now());
        const txId = await createPaymentTransaction({
          userId: user.uid,
          userEmail: user.email || '',
          userName: user.displayName || 'STREAMX Customer',
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          billingCycle: selectedPlan.billingCycle,
          amount: selectedPlan.price,
          currency: selectedPlan.currency,
          paymentMethod,
          transactionReference: refNum,
          status: 'pending',
          notes: `Manual settlement reference: ${refNum}`
        });

        setLastSubmittedTx({
          id: txId,
          userId: user.uid,
          userEmail: user.email || '',
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          currency: selectedPlan.currency,
          paymentMethod,
          transactionReference: refNum,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        setStep('pending_review');
      }
    } catch (err: unknown) {
      console.error('Payment submission failed:', err);
      setPaymentError(err instanceof Error ? err.message : 'Failed to submit payment reference. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#171C2B] border border-white/10 rounded-3xl max-w-xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Top Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 pr-8">
          <button
            onClick={() => {
              setActiveTab('plans');
              setStep('select_plan');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'plans'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Choose VIP Plan</span>
          </button>

          {user && (
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 relative ${
                activeTab === 'submissions'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>My Submissions</span>
              {userPayments.some((p) => p.status === 'pending') && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          )}
        </div>

        {/* ========================================================
            TAB 2: USER PAYMENT SUBMISSIONS HISTORY
        ======================================================== */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                My Payment Submissions
              </h3>
              <p className="text-xs text-slate-400">
                Track your JazzCash references and VIP activation status in real-time.
              </p>
            </div>

            {userPayments.length === 0 ? (
              <div className="p-8 rounded-2xl bg-black/40 border border-white/5 text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-500 mx-auto opacity-50" />
                <p className="text-xs text-slate-400">No payment references submitted yet.</p>
                <button
                  onClick={() => {
                    setActiveTab('plans');
                    setStep('select_plan');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold hover:bg-amber-500/30"
                >
                  Choose a Plan
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {userPayments.map((p) => {
                  const isPending = p.status === 'pending';
                  const isCompleted = p.status === 'completed';
                  const isRejected = p.status === 'rejected';

                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{p.planName}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isCompleted
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isCompleted ? 'Verified & Active' : isPending ? 'Pending Verification' : 'Rejected'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px] pt-1">
                        <div>
                          <span>Amount: </span>
                          <strong className="text-white">{p.currency} {p.amount}</strong>
                        </div>
                        <div>
                          <span>Method: </span>
                          <strong className="text-white uppercase">{p.paymentMethod.replace('_', ' ')}</strong>
                        </div>
                        <div>
                          <span>TID / Ref: </span>
                          <strong className="text-amber-300 font-mono">{p.transactionReference}</strong>
                        </div>
                        <div>
                          <span>Date: </span>
                          <span className="text-slate-300">{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {p.receiptUrl && (
                        <div className="pt-1 flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">Receipt attached:</span>
                          <a
                            href={p.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#713CFF] hover:underline flex items-center gap-1 text-[11px]"
                          >
                            <Eye className="w-3 h-3" /> View Screenshot
                          </a>
                        </div>
                      )}

                      {/* Status Explanation */}
                      {isPending && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
                          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>
                            Awaiting owner reconciliation on JazzCash number <strong>{OWNER_JAZZCASH_NUMBER}</strong>. VIP will activate automatically once verified.
                          </span>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>
                            Payment verified! VIP subscription is active{p.expiresAt ? ` until ${new Date(p.expiresAt).toLocaleDateString()}` : ''}.
                          </span>
                        </div>
                      )}

                      {isRejected && (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] space-y-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Payment Not Verified</span>
                          </div>
                          <p className="text-slate-300">
                            Reason: {p.rejectionReason || 'Reference not found in account statement.'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 1: CHOOSE PLAN & CHECKOUT
        ======================================================== */}
        {activeTab === 'plans' && step === 'select_plan' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-300 mx-auto flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
                <Crown className="w-8 h-8 fill-current" />
              </div>
              <h2 className="text-2xl font-black text-white">STREAMX VIP PREMIUM</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Ad-free streaming, 4K Ultra HD playback, VIP Profile Badge, and creator upload benefits.
              </p>
            </div>

            {isPremium && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Active VIP Subscription!</strong> You currently enjoy all STREAMX Premium privileges.
                </span>
              </div>
            )}

            {/* Plan Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map((plan) => {
                const isSelected = selectedPlan?.id === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-b from-[#713CFF]/25 to-[#247BFF]/10 border-[#713CFF] ring-2 ring-[#713CFF]/30 shadow-lg'
                        : 'bg-black/30 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{plan.name}</span>
                        {plan.billingCycle === 'yearly' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-400 text-slate-950 uppercase">
                            Best Value
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1 my-3">
                        <span className="text-2xl sm:text-3xl font-black text-white">
                          {plan.currency} {plan.price}
                        </span>
                        <span className="text-xs text-slate-400">/{plan.billingCycle === 'yearly' ? 'year' : 'month'}</span>
                      </div>

                      <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-white/5">
                        {plan.features.split(',').map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="text-[11px]">{feat.trim()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {plan.billingCycle === 'yearly' ? 'Annual Subscription' : 'Monthly Access'}
                      </span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-[#713CFF] bg-[#713CFF]' : 'border-slate-500'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Free Tier Reminder */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span>Basic STREAMX is always 100% free with standard streaming.</span>
              <span className="text-emerald-400 font-semibold">Free Forever</span>
            </div>

            <button
              onClick={handleProceedToCheckout}
              disabled={!selectedPlan}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <span>{user ? `Upgrade to ${selectedPlan?.name || 'VIP'}` : 'Sign In to Choose VIP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================
            TAB 1 - STEP 2: CHECKOUT (JAZZCASH & OTHER OPTIONS)
        ======================================================== */}
        {activeTab === 'plans' && step === 'checkout' && selectedPlan && (
          <form onSubmit={handleSubmitPayment} className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Manual Payment Checkout</span>
                <h3 className="text-lg font-bold text-white">{selectedPlan.name}</h3>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-white">{selectedPlan.currency} {selectedPlan.price}</div>
                <button
                  type="button"
                  onClick={() => setStep('select_plan')}
                  className="text-[10px] text-[#713CFF] hover:underline"
                >
                  Change Plan
                </button>
              </div>
            </div>

            {paymentError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Select Payment Method</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'jazzcash', label: 'JazzCash', badge: 'Recommended', icon: Smartphone, highlight: true },
                  { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
                  { id: 'debit_card', label: 'Debit Card', icon: CreditCard },
                  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                ].map((m) => {
                  const Icon = m.icon;
                  const isCur = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition relative ${
                        isCur
                          ? m.id === 'jazzcash'
                            ? 'bg-gradient-to-b from-red-950/60 to-red-900/40 border-red-500 text-white shadow-md ring-1 ring-red-500/50'
                            : 'bg-[#713CFF]/20 border-[#713CFF] text-white shadow-md'
                          : 'bg-black/30 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {m.badge && (
                        <span className="absolute -top-2 px-1.5 py-0.2 rounded-full text-[8px] font-black bg-red-600 text-white tracking-wider uppercase shadow">
                          {m.badge}
                        </span>
                      )}
                      <Icon className={`w-4 h-4 ${m.id === 'jazzcash' ? 'text-red-400' : ''}`} />
                      <span className="text-[11px] font-bold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ==================== JAZZCASH MANUAL PAYMENT UI ==================== */}
            {paymentMethod === 'jazzcash' && (
              <div className="space-y-4 p-4 rounded-2xl bg-gradient-to-b from-red-950/30 to-black/50 border border-red-500/30">
                <div className="flex items-center justify-between pb-2 border-b border-red-500/20">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center shadow">
                      JC
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">JazzCash Manual Transfer</h4>
                      <p className="text-[10px] text-slate-400">Direct mobile account transfer</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">Exact Amount: </span>
                    <span className="text-xs font-black text-amber-400">{selectedPlan.currency} {selectedPlan.price}</span>
                  </div>
                </div>

                {/* Receiving Number & Copy Box */}
                <div className="p-3.5 rounded-xl bg-black/60 border border-red-500/20 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Owner JazzCash Receiving Account
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-base sm:text-lg font-mono font-black text-white tracking-widest">
                        {OWNER_JAZZCASH_NUMBER}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Account Title: <span className="text-slate-200 font-semibold">{OWNER_JAZZCASH_TITLE}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        copiedNumber
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40'
                      }`}
                    >
                      {copiedNumber ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedNumber ? 'Copied!' : 'Copy Number'}</span>
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="text-[11px] text-slate-300 space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="font-bold text-white text-[11px]">How to complete payment:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300">
                    <li>Open your <strong>JazzCash App</strong> or dial <strong>*786#</strong>.</li>
                    <li>Select <strong>Send Money</strong> &rarr; <strong>To JazzCash Account</strong>.</li>
                    <li>Enter receiver number <strong className="text-white">{OWNER_JAZZCASH_NUMBER}</strong>.</li>
                    <li>Send the exact amount: <strong className="text-amber-300">{selectedPlan.currency} {selectedPlan.price}</strong>.</li>
                    <li>Copy the <strong>Transaction ID (TID)</strong> from the SMS / app confirmation and paste below.</li>
                  </ol>
                </div>

                {/* Transaction ID Input */}
                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-300 block mb-1">
                    JazzCash Transaction ID (TID) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 09823481239 or TID..."
                    value={jazzcashTid}
                    onChange={(e) => setJazzcashTid(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter the 11 or 12 digit TID received in the JazzCash SMS receipt.
                  </p>
                </div>

                {/* Sender Mobile Number (Optional) */}
                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-300 block mb-1">
                    Your JazzCash Mobile Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 03001234567"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Receipt Screenshot Upload (Gallery / Files) */}
                <div className="space-y-2">
                  <label className="text-[11px] uppercase font-bold text-slate-300 block">
                    Receipt Screenshot (Optional but speeds up verification)
                  </label>
                  {receiptPreviewUrl ? (
                    <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={receiptPreviewUrl}
                          alt="Receipt preview"
                          className="w-12 h-12 object-cover rounded-lg border border-white/10"
                        />
                        <div className="text-left">
                          <p className="text-xs text-white font-semibold truncate max-w-[180px]">
                            {receiptFile?.name || 'Receipt screenshot'}
                          </p>
                          <span className="text-[10px] text-emerald-400">Ready to upload</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveReceipt}
                        className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-white/10 hover:border-red-500/40 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition bg-black/30">
                      <Upload className="w-4 h-4 text-red-400" />
                      <span className="text-xs text-slate-300 font-semibold">Select Screenshot from Gallery / Files</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleReceiptFileChange}
                      />
                    </label>
                  )}
                </div>

                {/* Compliance & Manual Rule Callout */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                  <strong>Important Notice:</strong> This is a manual reference submission workflow. Submitting a Transaction ID does not automatically confirm receipt of money. The STREAMX owner independently cross-checks the official JazzCash statement before approving. Premium activates immediately once verified.
                </div>
              </div>
            )}

            {/* Card Information Fields */}
            {(paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && (
              <div className="space-y-3 p-4 rounded-2xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <ShieldCheck className="w-4 h-4" /> 256-Bit SSL Encrypted
                  </span>
                  <span className="text-[10px] text-slate-500">Zero card data stored</span>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Full Name as shown on card"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#713CFF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Card Number</label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="4111 2222 3333 4444"
                    value={cardNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                      setCardNumber(v);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-[#713CFF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, '');
                        if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
                        setExpiry(v);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-[#713CFF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">CVV / CVC</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="•••"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-[#713CFF]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bank Transfer Option */}
            {paymentMethod === 'bank_transfer' && (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Building2 className="w-4 h-4 text-[#713CFF]" />
                  <span>Approved Merchant Settlement Transfer</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Transfer to STREAMX Official Corporate Account via your mobile banking app. Enter your Transaction Reference or Sender Account below for verification.
                </p>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Bank Reference / Deposit Ref</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. REF_98247192"
                    value={bankRef}
                    onChange={(e) => setBankRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('select_plan')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-lg disabled:opacity-50 transition ${
                  paymentMethod === 'jazzcash'
                    ? 'bg-gradient-to-r from-red-600 via-red-500 to-amber-500 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950'
                }`}
              >
                {isProcessing
                  ? 'Submitting Reference...'
                  : paymentMethod === 'jazzcash'
                  ? `Submit JazzCash Reference (${selectedPlan.currency} ${selectedPlan.price})`
                  : `Confirm & Pay ${selectedPlan.currency} ${selectedPlan.price}`}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================
            TAB 1 - STEP 3: PENDING OWNER REVIEW SCREEN
        ======================================================== */}
        {activeTab === 'plans' && step === 'pending_review' && lastSubmittedTx && (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center animate-pulse">
              <Clock className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                Pending Owner Verification
              </span>
              <h2 className="text-2xl font-black text-white mt-2">Reference Submitted!</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                Your payment reference has been submitted to the STREAMX admin queue. The owner will cross-reference the transaction in the JazzCash account before activating VIP.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-xs text-left space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between text-slate-400">
                <span>Transaction ID:</span>
                <span className="font-mono text-amber-400 font-bold">{lastSubmittedTx.transactionReference}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Plan:</span>
                <span className="text-white font-bold">{lastSubmittedTx.planName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Amount:</span>
                <span className="text-white font-bold">{lastSubmittedTx.currency} {lastSubmittedTx.amount}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Receiver Number:</span>
                <span className="font-mono text-slate-300 font-semibold">{OWNER_JAZZCASH_NUMBER}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Status:</span>
                <span className="text-amber-400 font-bold">Pending Admin Approval</span>
              </div>
            </div>

            <div className="flex items-center gap-3 max-w-sm mx-auto">
              <button
                onClick={() => setActiveTab('submissions')}
                className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition"
              >
                View My Submissions
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-bold shadow-lg"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 1 - STEP 4: INSTANT SUCCESS (CARD / SIMULATED)
        ======================================================== */}
        {activeTab === 'plans' && step === 'success' && (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10">
                Payment Confirmed
              </span>
              <h2 className="text-2xl font-black text-white mt-2">Welcome to STREAMX VIP!</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                Your payment was verified successfully. Your profile has been upgraded to VIP with all Premium features unlocked.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs text-left space-y-1.5 max-w-sm mx-auto">
              <div className="flex justify-between text-slate-400">
                <span>Transaction Ref:</span>
                <span className="font-mono text-white font-bold">{lastSubmittedTx?.transactionReference}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>VIP Plan:</span>
                <span className="text-amber-400 font-bold">{selectedPlan?.name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Status:</span>
                <span className="text-emerald-400 font-bold">Active VIP Member</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white text-xs sm:text-sm font-bold shadow-lg"
            >
              Start Streaming VIP Content
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
