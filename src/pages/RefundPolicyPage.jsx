import { Icon } from '@iconify/react';
import Footer from '../components/Footer';

const SECTIONS = [
  {
    title: 'เงื่อนไขการขอคืนเงิน',
    icon: 'mdi:file-document-check',
    items: [
      'การขอคืนเงินสามารถทำได้เฉพาะบริการที่ยังไม่ได้รับการดำเนินการเท่านั้น',
      'ผู้ใช้บริการสามารถแจ้งขอคืนเงินผ่านระบบออนไลน์ได้ตลอด 24 ชั่วโมง',
      'การขอคืนเงินต้องแจ้งล่วงหน้าอย่างน้อย 24 ชั่วโมงก่อนวันนัดหมาย',
      'กรณีแจ้งยกเลิกน้อยกว่า 24 ชั่วโมง อาจมีค่าธรรมเนียมหัก 10% ของยอดที่ชำระ',
    ],
  },
  {
    title: 'ขั้นตอนการขอคืนเงิน',
    icon: 'mdi:list-status',
    items: [
      'เข้าสู่ระบบและไปที่หน้า "การจองของฉัน"',
      'เลือกรายการจองที่ต้องการขอคืนเงิน',
      'กดปุ่ม "ขอคืนเงิน" และระบุเหตุผลการขอคืน',
      'รอการอนุมัติจากทีมงาน (ภายใน 3-5 วันทำการ)',
      'เงินจะคืนเข้ากระเป๋าเงินในระบบโดยอัตโนมัติ',
    ],
  },
  {
    title: 'ระยะเวลาการคืนเงิน',
    icon: 'mdi:clock-check',
    items: [
      'คืนเข้ากระเป๋าเงินในระบบ: ภายใน 1-3 วันทำการหลังอนุมัติ',
      'คืนเข้าบัญชีธนาคาร: ภายใน 5-7 วันทำการหลังอนุมัติ',
      'คืนผ่านบัตรเครดิต: ภายใน 14-30 วันทำการ ขึ้นอยู่กับธนาคาร',
    ],
  },
  {
    title: 'กรณีที่ไม่สามารถขอคืนเงินได้',
    icon: 'mdi:cancel',
    items: [
      'บริการที่ได้รับการดำเนินการแล้วเสร็จ',
      'บริการที่ผ่านวันนัดหมายไปแล้วโดยไม่มีการแจ้งล่วงหน้า',
      'โปรโมชั่นพิเศษที่ระบุว่า "ไม่รับคืนเงิน" ไว้ในเงื่อนไข',
      'กรณีพบว่ามีการใช้งานระบบไม่ถูกต้องหรือทุจริต',
    ],
  },
  {
    title: 'การอนุมัติคืนเงิน',
    icon: 'mdi:shield-check',
    items: [
      'ระบบการคืนเงินผ่านกระบวนการตรวจสอบ 3 ระดับ เพื่อความโปร่งใส',
      'ระดับ 1: แผนกบัญชี ตรวจสอบยอดเงินและความถูกต้อง',
      'ระดับ 2: แผนกต้อนรับ ตรวจสอบประวัติการนัดหมาย',
      'ระดับ 3: ผู้จัดการ อนุมัติขั้นสุดท้าย',
      'ทุกขั้นตอนจะมีการแจ้งสถานะผ่านระบบอัตโนมัติ',
    ],
  },
];

const FAQ = [
  { q: 'ขอคืนเงินได้ภายในกี่วัน?', a: 'คุณสามารถขอคืนเงินได้ตลอดเวลาก่อนวันนัดหมาย โดยแนะนำให้แจ้งล่วงหน้าอย่างน้อย 24 ชั่วโมง' },
  { q: 'จะได้เงินคืนเมื่อไหร่?', a: 'หลังจากได้รับการอนุมัติ เงินจะคืนเข้ากระเป๋าเงินในระบบภายใน 1-3 วันทำการ หรือเข้าบัญชีธนาคารภายใน 5-7 วันทำการ' },
  { q: 'มีค่าธรรมเนียมการคืนเงินหรือไม่?', a: 'หากแจ้งล่วงหน้ามากกว่า 24 ชั่วโมง ไม่มีค่าธรรมเนียม หากน้อยกว่า 24 ชั่วโมง อาจมีค่าธรรมเนียม 10%' },
  { q: 'ตรวจสอบสถานะการคืนเงินได้ที่ไหน?', a: 'เข้าสู่ระบบ ไปที่หน้า "การจองของฉัน" จะเห็นสถานะการขอคืนเงินของแต่ละรายการ' },
];

const RefundPolicyPage = () => {
  return (
    <>
      <main className="min-h-screen bg-section dark:bg-darkmode pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-10" data-aos="fade-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Icon icon="mdi:cash-refund" width="20" />
              เงื่อนไขการคืนเงิน
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-midnight_text dark:text-white mb-3">นโยบายการคืนเงิน</h1>
            <p className="text-grey dark:text-gray-400 max-w-2xl mx-auto">ข้อมูลเงื่อนไขและขั้นตอนการขอคืนเงินสำหรับบริการของ Whocare</p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5 mb-8 flex items-start gap-3" data-aos="fade-up" data-aos-delay="100">
            <Icon icon="mdi:information" width="22" className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">สิทธิ์ของผู้ใช้บริการ</p>
              <p className="text-sm text-blue-700/80 dark:text-blue-400/80">ผู้ใช้บริการมีสิทธิ์ขอคืนเงินตามเงื่อนไขที่กำหนด โดยระบบของเรามีกระบวนการตรวจสอบ 3 ระดับเพื่อความโปร่งใสและเป็นธรรม</p>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {SECTIONS.map((sec, i) => (
              <div
                key={i}
                className="bg-white dark:bg-darklight rounded-2xl p-6 shadow-service dark:shadow-dark-md border border-border/50 dark:border-gray-700/50"
                data-aos="fade-up"
                data-aos-delay={100 + i * 60}
              >
                <h2 className="text-lg font-bold text-midnight_text dark:text-white mb-4 flex items-center gap-2">
                  <Icon icon={sec.icon} width="22" className="text-primary" />
                  {sec.title}
                </h2>
                <ul className="space-y-2.5">
                  {sec.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-grey dark:text-gray-300">
                      <Icon icon="mdi:check-circle" width="18" className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mt-10" data-aos="fade-up">
            <h2 className="text-2xl font-bold text-midnight_text dark:text-white mb-6 text-center">คำถามที่พบบ่อย</h2>
            <div className="space-y-4">
              {FAQ.map((f, i) => (
                <div key={i} className="bg-white dark:bg-darklight rounded-2xl p-5 shadow-service dark:shadow-dark-md border border-border/50 dark:border-gray-700/50">
                  <h3 className="font-semibold text-midnight_text dark:text-white mb-2 flex items-center gap-2">
                    <Icon icon="mdi:help-circle" width="18" className="text-primary" />
                    {f.q}
                  </h3>
                  <p className="text-sm text-grey dark:text-gray-400 pl-6">{f.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="mt-10 bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-6 md:p-8 text-white text-center" data-aos="fade-up">
            <Icon icon="mdi:headset" width="40" className="mx-auto mb-3 text-white/80" />
            <h3 className="text-xl font-bold mb-2">ต้องการความช่วยเหลือเพิ่มเติม?</h3>
            <p className="text-white/70 mb-4">ติดต่อทีมงานของเราได้ตลอด 24 ชั่วโมง</p>
            <div className="flex justify-center gap-4 flex-wrap">
              <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <Icon icon="mdi:phone" width="16" /> 02-123-4567
              </span>
              <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <Icon icon="mdi:email" width="16" /> support@whocare.com
              </span>
              <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <Icon icon="mdi:chat" width="16" /> LINE: @whocare
              </span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default RefundPolicyPage;
