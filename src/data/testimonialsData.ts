export interface CustomerReview {
  id: string;
  customerName: string;
  avatarUrl?: string;
  avatarBgColor?: string;
  location: string;
  rating: number; // e.g. 5, 4.9, 4.8
  title: string;
  comment: string;
  date: string;
  verifiedPurchase: boolean;
  productName: string;
  productBrand: string;
  productCategory: string;
  productPrice: number;
  productImage: string;
  productId?: string;
  helpfulCount: number;
  tags?: string[];
}

export const TOP_RATED_TESTIMONIALS: CustomerReview[] = [
  {
    id: 'rev-1',
    customerName: 'Naledi Khumalo',
    location: 'Sandton, Johannesburg',
    avatarBgColor: 'bg-rose-500',
    rating: 5,
    title: 'Flawless quality & arrived in 24 hours!',
    comment:
      'Ordered on Tuesday afternoon and The Courier Guy delivered it to my door in Sandton by Wednesday morning! The packaging was pristine, sealed, and 100% genuine. KUD Store is now my go-to for online shopping in SA.',
    date: 'Verified Buyer • 2 days ago',
    verifiedPurchase: true,
    productName: 'Hydrating Glow Vitamin C Facial Serum',
    productBrand: 'KUD Glow',
    productCategory: 'Beauty',
    productPrice: 385,
    productImage:
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80',
    helpfulCount: 47,
    tags: ['Next-Day Delivery', 'Original Quality'],
  },
  {
    id: 'rev-2',
    customerName: 'Sipho Dlamini',
    location: 'Camps Bay, Cape Town',
    avatarBgColor: 'bg-indigo-600',
    rating: 5,
    title: 'Unbelievable sound clarity and deep bass!',
    comment:
      'These wireless earbuds blew my expectations away. Active noise cancellation blocks out all gym background noise and battery easily lasts 30+ hours with the case. Seamless checkout via Yoco card payment.',
    date: 'Verified Buyer • 4 days ago',
    verifiedPurchase: true,
    productName: 'Apex Pro Wireless ANC Earbuds',
    productBrand: 'Apex Audio',
    productCategory: 'Technology',
    productPrice: 899,
    productImage:
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
    helpfulCount: 39,
    tags: ['ANC Tech', '30hr Battery'],
  },
  {
    id: 'rev-3',
    customerName: 'Annelize van der Merwe',
    location: 'Stellenbosch, Western Cape',
    avatarBgColor: 'bg-emerald-600',
    rating: 5,
    title: 'Stunning minimalist design for my kitchen',
    comment:
      'The ceramic finish is premium and brews the cleanest cup of morning pour-over coffee. Elegant Scandinavian aesthetic that looks beautiful on the countertop. Customer support on WhatsApp answered my query immediately!',
    date: 'Verified Buyer • 1 week ago',
    verifiedPurchase: true,
    productName: 'Nordic Matte Ceramic Pour-Over Set',
    productBrand: 'Nordic Living',
    productCategory: 'Home',
    productPrice: 450,
    productImage:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    helpfulCount: 28,
    tags: ['Premium Ceramic', 'Fast Support'],
  },
  {
    id: 'rev-4',
    customerName: 'Lerato Ndlovu',
    location: 'Umhlanga, Durban',
    avatarBgColor: 'bg-amber-600',
    rating: 5,
    title: 'Keeps water ice-cold through humid Durban heat',
    comment:
      'Took this flask on a hike along the North Coast in 32°C heat and my water stayed icy cold all day. No condensation on the outside and the leak-proof lid is completely airtight. Outstanding value for money.',
    date: 'Verified Buyer • 1 week ago',
    verifiedPurchase: true,
    productName: 'HydroPeak Stainless Thermal Flask (1L)',
    productBrand: 'HydroPeak',
    productCategory: 'Sports & Leisure',
    productPrice: 320,
    productImage:
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80',
    helpfulCount: 53,
    tags: ['24h Cold', 'Leak Proof'],
  },
  {
    id: 'rev-5',
    customerName: 'Thabo Mokoena',
    location: 'Menlyn, Pretoria',
    avatarBgColor: 'bg-violet-600',
    rating: 5,
    title: 'Charges my phone & smartwatch simultaneously',
    comment:
      'Super clean bedside setup with no tangled cables. The magnetic alignment snaps into place immediately and charges at full fast-charge speeds without overheating. Great build quality and metallic finish.',
    date: 'Verified Buyer • 2 weeks ago',
    verifiedPurchase: true,
    productName: 'VoltCharge 3-in-1 Fast Wireless Station',
    productBrand: 'VoltGear',
    productCategory: 'Technology',
    productPrice: 650,
    productImage:
      'https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?auto=format&fit=crop&w=600&q=80',
    helpfulCount: 31,
    tags: ['Fast Charging', 'MagSafe Ready'],
  },
  {
    id: 'rev-6',
    customerName: 'Keanu Pieterse',
    location: 'Gqeberha (Port Elizabeth), EC',
    avatarBgColor: 'bg-sky-600',
    rating: 5,
    title: 'Eliminated my lower back stiffness while working',
    comment:
      'Working 9 hours at a desk used to cause severe posture strain. This memory foam lumbar cushion fits seamlessly on my office chair and provides instant ergonomic relief. High-density breathable mesh cover is easy to wash.',
    date: 'Verified Buyer • 3 weeks ago',
    verifiedPurchase: true,
    productName: 'ErgoRest Memory Foam Lumbar Support',
    productBrand: 'ErgoComfort',
    productCategory: 'Home',
    productPrice: 420,
    productImage:
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=600&q=80',
    helpfulCount: 22,
    tags: ['Ergonomic Relief', 'Washable Cover'],
  },
];
