// Menu items
export const menuItems = [
  { name: "หน้าแรก", href: "/", type: "link" },
  {
    name: "บริการ",
    type: "dropdown",
    children: [
      { name: "ค้นหาแพทย์", desc: "ค้นหาแพทย์ผู้เชี่ยวชาญ", href: "/doctors", icon: "mdi:doctor" },
      { name: "นัดหมาย", desc: "นัดหมายแพทย์ออนไลน์", href: "/appointment", icon: "mdi:calendar-clock" },
      { name: "แนะนำบริการ", desc: "บริการทั้งหมดของเรา", href: "/services", icon: "mdi:hand-heart" },
      { name: "แพ็กเกจ & โปรโมชั่น", desc: "โปรโมชั่นและแพ็กเกจพิเศษ", href: "/packages", icon: "mdi:tag-multiple" },
      { name: "ศูนย์ทางการแพทย์", desc: "ศูนย์การแพทย์เฉพาะทาง", href: "/medical-center", icon: "mdi:hospital-building" },
      { name: "ชำระค่าบริการ", desc: "ชำระเงินออนไลน์", href: "/payment", icon: "mdi:credit-card" },
      { name: "นโยบายการคืนเงิน", desc: "เงื่อนไขการคืนเงิน", href: "/refund-policy", icon: "mdi:cash-refund" },
    ],
  },
  {
    name: "บทความ",
    type: "dropdown",
    children: [
      { name: "บทความสุขภาพ", desc: "ความรู้ด้านสุขภาพ วิเคราะห์ เทคนิคดูแลตัวเอง", href: "/articles", icon: "mdi:notebook-outline" },
      { name: "ข่าวสาร", desc: "ข่าวสาร กิจกรรม และรายงานเหตุการณ์", href: "/news", icon: "mdi:bullhorn" },
    ],
  },
];

// Clinic branch data
export const hospitals = {
  thailand: [
    {
      name: "Whocare Clinic สยาม",
      location: "สยามสแควร์, กรุงเทพฯ",
      phone: "02-123-4567",
      services: ["ศัลยกรรมจมูก", "ร้อยไหม", "เลเซอร์"],
      image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=80",
    },
    {
      name: "Whocare Clinic ทองหล่อ",
      location: "สุขุมวิท 55, กรุงเทพฯ",
      phone: "02-234-5678",
      services: ["ฟิลเลอร์", "โบท็อกซ์", "สกินแคร์"],
      image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&q=80",
    },
    {
      name: "Whocare Clinic เชียงใหม่",
      location: "นิมมานเหมินท์, เชียงใหม่",
      phone: "053-456-789",
      services: ["ศัลยกรรมตา", "ดูดไขมัน", "เลเซอร์"],
      image: "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=400&q=80",
    },
    {
      name: "Whocare Clinic ภูเก็ต",
      location: "ป่าตอง, ภูเก็ต",
      phone: "076-567-890",
      services: ["ศัลยกรรมหน้าอก", "ร้อยไหม", "ฟิลเลอร์"],
      image: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&q=80",
    },
  ],
  international: [
    {
      name: "Whocare Clinic Seoul",
      location: "Gangnam, Seoul",
      phone: "+82-2-xxxx-xxxx",
      services: ["Rhinoplasty", "V-Line", "Dermal Filler"],
      image: "https://images.unsplash.com/photo-1580281657702-257584239a55?w=400&q=80",
    },
    {
      name: "Whocare Clinic Tokyo",
      location: "Ginza, Tokyo",
      phone: "+81-3-xxxx-xxxx",
      services: ["Laser Treatment", "Botox", "Skin Care"],
      image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&q=80",
    },
    {
      name: "Whocare Clinic Singapore",
      location: "Orchard Road, Singapore",
      phone: "+65-xxxx-xxxx",
      services: ["Liposuction", "Thread Lift", "PRP"],
      image: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=400&q=80",
    },
  ],
};

