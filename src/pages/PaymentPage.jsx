import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGetBalance, apiDeposit, apiGetTransactions } from '../services/api';
import Footer from '../components/Footer';

const PaymentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (user) {
      fetchBalance();
      fetchTransactions();
    }
  }, [user]);

  const fetchBalance = async () => {
    try {
      const res = await apiGetBalance();
      if (res.success) setBalance(Number(res.data?.balance || 0));
    } catch { /* ignore */ }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await apiGetTransactions({ limit: 10 });
      if (res.success) setTransactions(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleDeposit = async () => {
    const val = Number(amount);
    if (!val || val < 1) return;
    setDepositing(true);
    setMessage(null);
    try {
      const res = await apiDeposit(val);
      if (res.success) {
        setMessage({ type: 'success', text: `เติมเงินสำเร็จ ฿${val.toLocaleString()}` });
        setAmount('');
        fetchBalance();
        fetchTransactions();
      } else {
        setMessage({ type: 'error', text: res.message || 'เกิดข้อผิดพลาด' });
      }
    } catch {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด' });
    }
    setDepositing(false);
  };

  const typeColors = {
    deposit: 'text-green-500',
    payment: 'text-red-500',
    refund: 'text-blue-500',
    withdraw: 'text-orange-500',
  };
  const typeLabels = {
    deposit: 'เติมเงิน',
    payment: 'ชำระเงิน',
    refund: 'คืนเงิน',
    withdraw: 'ถอนเงิน',
  };
  const typeIcons = {
    deposit: 'mdi:arrow-down-circle',
    payment: 'mdi:arrow-up-circle',
    refund: 'mdi:cash-refund',
    withdraw: 'mdi:bank-transfer-out',
  };

  if (!user) {
    return (
      <>
        <main className="min-h-screen bg-section dark:bg-darkmode pt-24 pb-12">
          <div className="max-w-lg mx-auto px-4 text-center py-20">
            <Icon icon="mdi:login" width="64" className="mx-auto text-grey/30 mb-4" />
            <h2 className="text-xl font-bold text-midnight_text dark:text-white mb-2">กรุณาเข้าสู่ระบบ</h2>
            <p className="text-grey dark:text-gray-400 mb-6">คุณต้องเข้าสู่ระบบก่อนใช้บริการชำระเงินออนไลน์</p>
            <button onClick={() => navigate('/login')} className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors">
              เข้าสู่ระบบ
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-section dark:bg-darkmode pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-10" data-aos="fade-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Icon icon="mdi:credit-card" width="20" />
              ชำระเงินออนไลน์
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-midnight_text dark:text-white mb-3">ชำระค่าบริการ</h1>
            <p className="text-grey dark:text-gray-400">จัดการยอดเงินในกระเป๋าและชำระค่าบริการออนไลน์</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-6 text-white" data-aos="fade-up" data-aos-delay="100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Icon icon="mdi:wallet" width="24" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">ยอดเงินคงเหลือ</p>
                  <p className="text-3xl font-bold">฿{balance.toLocaleString()}</p>
                </div>
              </div>
              <div className="border-t border-white/20 pt-4 mt-2">
                <p className="text-white/70 text-sm mb-2">เติมเงินเข้ากระเป๋า</p>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {[100, 500, 1000, 5000].map(v => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        amount === String(v) ? 'bg-white text-primary' : 'bg-white/20 hover:bg-white/30'
                      }`}
                    >
                      ฿{v.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="จำนวนเงิน"
                    min="1"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/20 text-white placeholder-white/50 outline-none focus:bg-white/30 transition-colors text-sm"
                  />
                  <button
                    onClick={handleDeposit}
                    disabled={depositing || !amount}
                    className="px-5 py-2.5 bg-white text-primary rounded-xl font-medium text-sm hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    {depositing ? 'กำลังเติม...' : 'เติมเงิน'}
                  </button>
                </div>
                {message && (
                  <p className={`mt-2 text-sm ${message.type === 'success' ? 'text-green-200' : 'text-red-200'}`}>{message.text}</p>
                )}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white dark:bg-darklight rounded-2xl p-6 shadow-service dark:shadow-dark-md border border-border/50 dark:border-gray-700/50" data-aos="fade-up" data-aos-delay="150">
              <h3 className="font-bold text-midnight_text dark:text-white mb-4 flex items-center gap-2">
                <Icon icon="mdi:credit-card-multiple" width="20" className="text-primary" />
                ช่องทางการชำระเงิน
              </h3>
              <div className="space-y-3">
                {[
                  { name: 'PromptPay / QR Code', icon: 'mdi:qrcode-scan', desc: 'สแกน QR Code ชำระผ่านแอปธนาคาร' },
                  { name: 'บัตรเครดิต / เดบิต', icon: 'mdi:credit-card', desc: 'Visa, Mastercard, JCB' },
                  { name: 'โอนผ่านธนาคาร', icon: 'mdi:bank', desc: 'โอนเงินผ่านบัญชีธนาคารโดยตรง' },
                  { name: 'TrueMoney Wallet', icon: 'mdi:cellphone', desc: 'ชำระผ่าน TrueMoney Wallet' },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-section dark:bg-darkmode border border-border/50 dark:border-gray-700/50">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon icon={m.icon} width="20" className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-midnight_text dark:text-white">{m.name}</p>
                      <p className="text-xs text-grey dark:text-gray-400">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="mt-8 bg-white dark:bg-darklight rounded-2xl p-6 shadow-service dark:shadow-dark-md border border-border/50 dark:border-gray-700/50" data-aos="fade-up" data-aos-delay="200">
            <h3 className="font-bold text-midnight_text dark:text-white mb-4 flex items-center gap-2">
              <Icon icon="mdi:history" width="20" className="text-primary" />
              ประวัติรายการ
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-section dark:bg-darkmode rounded-xl animate-pulse" />)}
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-section dark:bg-darkmode">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${typeColors[t.type]} bg-current/10`}>
                      <Icon icon={typeIcons[t.type] || 'mdi:cash'} width="18" className={typeColors[t.type]} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-midnight_text dark:text-white">{typeLabels[t.type] || t.type}</p>
                      <p className="text-xs text-grey dark:text-gray-400 truncate">{t.description || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${t.type === 'payment' || t.type === 'withdraw' ? 'text-red-500' : 'text-green-500'}`}>
                        {t.type === 'payment' || t.type === 'withdraw' ? '-' : '+'}฿{Number(t.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-grey dark:text-gray-400">
                        {new Date(t.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Icon icon="mdi:receipt-text-clock" width="48" className="mx-auto text-grey/30 mb-2" />
                <p className="text-grey dark:text-gray-400 text-sm">ยังไม่มีประวัติรายการ</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PaymentPage;
