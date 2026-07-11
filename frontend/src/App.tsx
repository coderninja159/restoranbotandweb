import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ShoppingBag, 
  Plus, 
  Minus, 
  X, 
  User, 
  Check, 
  Truck, 
  Compass, 
  Grid,
  Soup, 
  Salad, 
  ChefHat, 
  Flame, 
  Beef, 
  Utensils, 
  AlertCircle, 
  Sun, 
  Moon, 
  Heart, 
  LogOut, 
  Trash2, 
  Edit,
  MapPin,
  Clock,
  Map
} from 'lucide-react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        close: () => void;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
      };
    };
  }
}

interface Product {
  id: number;
  category_id: number;
  name_uz: string;
  price: string | number;
  discount: number;
  image_url: string | null;
  is_available: boolean;
}

interface Category {
  id: number;
  name_uz: string;
  slug: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  user_id: number;
  user_name: string;
  user_phone: string;
  total_amount: number;
  order_type: 'delivery' | 'pickup' | 'table';
  table_number: string | null;
  address: string | null;
  status: string;
  created_at: string;
  items: OrderItem[];
}

const API_BASE = import.meta.env.VITE_API_BASE || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://restoranbotandweb.onrender.com'
);

// Override global fetch to bypass localtunnel landing page
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  const url = String(input);
  if (url.includes('loca.lt')) {
    init = init || {};
    const headers = new Headers(init.headers || {});
    headers.set('Bypass-Tunnel-Reminder', 'true');
    init.headers = headers;
  }
  return originalFetch(input, init);
};

const translations = {
  uz: {
    welcome: "Xush kelibsiz!",
    searchPlaceholder: "Mahsulotlarni qidirish...",
    addressLabel: "Sirdaryo shahri, Mo‘ljal: Abu Bakr masjidi oldida",
    landmarkLabel: "Mo‘ljal: Abu Bakr masjidi oldida",
    workingHoursLabel: "Ish vaqti: 08:00 - 23:00",
    viewOnMap: "Xarita",
    loadingMenu: "Yuklanmoqda...",
    reload: "Qayta yuklash",
    noProducts: "Mahsulotlar topilmadi",
    cartTitle: "Savat",
    checkoutBtn: "Buyurtma berish",
    serviceType: "Xizmat turi",
    delivery: "Yetkazib berish",
    takeaway: "Olib ketish",
    table: "Stolda",
    nameLabel: "Ismingiz",
    phoneLabel: "Telefon raqamingiz",
    tableLabel: "Stol raqami",
    addressPlaceholder: "Yetkazib berish manzili",
    totalPayable: "Jami to‘lov",
    confirmOrder: "Buyurtmani tasdiqlash",
    cartEmpty: "Savatchangiz hozircha bo'sh",
    orderAccepted: "Buyurtma qabul qilindi!",
    successText: "Sizning buyurtmangiz muvaffaqiyatli saqlandi. Telegram bot orqali sizga bildirishnoma yuborildi.",
    orderIdLabel: "Buyurtma ID",
    customerLabel: "Mijoz",
    paymentTypeLabel: "To‘lov turi",
    paymentValue: "Naqd / Terminal / Payme",
    closeBtn: "Yopish",
    phoneError: "Telefon raqami noto‘g‘ri formatda!",
    tableBadge: "Stol",
    all: "Hamma",
    itemsCountLabel: "ta mahsulot",
    totalItemsPriceLabel: "Jami mahsulotlar:",
    freeService: "Yetkazish xizmati",
    freeValue: "Bepul",
    viewCartBtn: "Savatchani ko‘rish",
    orderContents: "Buyurtma tarkibi",
    namePlaceholder: "Ismingizni kiriting",
    addressInputPlaceholder: "Ko‘cha, uy raqami, xonadon...",
    tableInputPlaceholder: "Stol raqamini kiriting (masalan, 5)",
    sending: "Yuborilmoqda..."
  },
  uz_cyr: {
    welcome: "Хуш келибсиз!",
    searchPlaceholder: "Маҳсулотларни қидириш...",
    addressLabel: "Сирдарё шаҳри, Мўлжал: Абу Бакр масжиди олдида",
    landmarkLabel: "Мўлжал: Абу Бакр масжиди олдида",
    workingHoursLabel: "Иш вақти: 08:00 - 23:00",
    viewOnMap: "Харита",
    loadingMenu: "Юкланмоқда...",
    reload: "Қайта юклаш",
    noProducts: "Маҳсулотлар топилмади",
    cartTitle: "Сават",
    checkoutBtn: "Буюртма бериш",
    serviceType: "Хизмат тури",
    delivery: "Етказиб бериш",
    takeaway: "Олиб кетиш",
    table: "Столда",
    nameLabel: "Исмингиз",
    phoneLabel: "Телефон рақамингиз",
    tableLabel: "Стол рақами",
    addressPlaceholder: "Етказиб бериш манзили",
    totalPayable: "Жами тўлов",
    confirmOrder: "Буюртмани тасдиқлаш",
    cartEmpty: "Саватчангиз ҳозирча бўш",
    orderAccepted: "Буюртма қабул қилинди!",
    successText: "Сизнинг буюртмангиз муваффақиятли сақланди. Телеграм бот орқали сизга билдиришнома юборилди.",
    orderIdLabel: "Буюртма ID",
    customerLabel: "Мижоз",
    paymentTypeLabel: "Тўлов тури",
    paymentValue: "Нақд / Терминал / Payme",
    closeBtn: "Ёпиш",
    phoneError: "Телефон рақами нотўғри форматда!",
    tableBadge: "Стол",
    all: "Ҳамма",
    itemsCountLabel: "та маҳсулот",
    totalItemsPriceLabel: "Жами маҳсулотлар:",
    freeService: "Етказиш хизмати",
    freeValue: "Бепул",
    viewCartBtn: "Саватни кўриш",
    orderContents: "Буюртма таркиби",
    namePlaceholder: "Исмингизни киритинг",
    addressInputPlaceholder: "Кўча, уй рақами, хонадон...",
    tableInputPlaceholder: "Стол рақамини киритинг (масалан, 5)",
    sending: "Юборилмоқда..."
  },
  ru: {
    welcome: "Добро пожаловать!",
    searchPlaceholder: "Поиск товаров...",
    addressLabel: "г. Сырдарья, Ориентир: возле мечети Абу Бакр",
    landmarkLabel: "Ориентир: возле мечети Абу Бакр",
    workingHoursLabel: "Режим работы: 08:00 - 23:00",
    viewOnMap: "Карта",
    loadingMenu: "Загрузка...",
    reload: "Обновить",
    noProducts: "Товары не найдены",
    cartTitle: "Корзина",
    checkoutBtn: "Оформить заказ",
    serviceType: "Тип услуги",
    delivery: "Доставка",
    takeaway: "Самовывоз",
    table: "За столом",
    nameLabel: "Ваше имя",
    phoneLabel: "Номер телефона",
    tableLabel: "Номер стола",
    addressPlaceholder: "Адрес доставки",
    totalPayable: "Итого к оплате",
    confirmOrder: "Подтвердить заказ",
    cartEmpty: "Ваша корзина пуста",
    orderAccepted: "Заказ принят!",
    successText: "Ваш заказ успешно сохранен. Вам отправлено уведомление в Telegram-боте.",
    orderIdLabel: "ID Заказа",
    customerLabel: "Клиент",
    paymentTypeLabel: "Способ оплаты",
    paymentValue: "Наличные / Терминал / Payme",
    closeBtn: "Закрыть",
    phoneError: "Неверный формат номера телефона!",
    tableBadge: "Стол",
    all: "Все",
    itemsCountLabel: "товар(ов)",
    totalItemsPriceLabel: "Стоимость товаров:",
    freeService: "Служба доставки",
    freeValue: "Бесплатно",
    viewCartBtn: "Посмотреть корзину",
    orderContents: "Содержимое заказа",
    namePlaceholder: "Введите ваше имя",
    addressInputPlaceholder: "Улица, номер дома, квартира...",
    tableInputPlaceholder: "Введите номер стола (например, 5)",
    sending: "Отправка..."
  }
};

const categoryTranslations: Record<string, { ru: string; uz_cyr: string }> = {
  "Birinchi taomlar": { ru: "Первые блюда", uz_cyr: "Биринчи таомлар" },
  "Ikkinchi taomlar": { ru: "Вторые блюда", uz_cyr: "Иккинчи таомлар" },
  "Salatlar": { ru: "Салаты", uz_cyr: "Салатлар" },
  "Somsa": { ru: "Самса", uz_cyr: "Сомса" },
  "Goryachie zakuski": { ru: "Горячие закуски", uz_cyr: "Горячие закуски" },
  "Shashliklar": { ru: "Шашлыки", uz_cyr: "Шашликлар" }
};

const productTranslations: Record<string, { ru: string; uz_cyr: string }> = {
  "Sho'rva": { ru: "Шурпа", uz_cyr: "Шўрва" },
  "Mastava": { ru: "Мастава", uz_cyr: "Мастава" },
  "Lagmon suyuq": { ru: "Жидкий лагман", uz_cyr: "Лағмон суюқ" },
  "Manti (dona)": { ru: "Манты (шт.)", uz_cyr: "Манти (dona)" },
  "Kozon kabob": { ru: "Казан кабоб", uz_cyr: "Қозон кабоб" },
  "Tushonka": { ru: "Тушёнка", uz_cyr: "Тушонка" },
  "Vaguri": { ru: "Вагури", uz_cyr: "Вагури" },
  "Tabaka 1 kg": { ru: "Цыпленок табака 1 кг", uz_cyr: "Табака 1 кг" },
  "Osh + bedana tuxum": { ru: "Плов + перепелиное яйцо", uz_cyr: "Ош + бедана тухум" },
  "Baklajan xrustyashiy": { ru: "Хрустящий баклажан", uz_cyr: "Баклажан хрустящий" },
  "Achu-chuchuk": { ru: "Ачу-чучук", uz_cyr: "Ачу-чучук" },
  "Suzma": { ru: "Сузьма", uz_cyr: "Сузма" },
  "Choban": { ru: "Чобан", uz_cyr: "Чобан" },
  "Svejiy": { ru: "Свежий салат", uz_cyr: "Свежий салат" },
  "Sezar": { ru: "Цезарь", uz_cyr: "Цезарь" },
  "Olivye": { ru: "Оливье", uz_cyr: "Оливье" },
  "Toshkent": { ru: "Ташкентский салат", uz_cyr: "Тошкент" },
  "Vesenniy": { ru: "Весенний салат", uz_cyr: "Весенний" },
  "Fri": { ru: "Фри", uz_cyr: "Фри" },
  "Mujskoy kapris": { ru: "Мужской каприз", uz_cyr: "Мужской каприз" },
  "Solyonniy assorti": { ru: "Соленое ассорти", uz_cyr: "Солённый assorti" },
  "Achik suzma": { ru: "Ачик сузьма", uz_cyr: "Ачиқ suzma" },
  "Katik domashniy": { ru: "Катык домашний", uz_cyr: "Қатиқ domashniy" },
  "Kazi (dona)": { ru: "Казы (шт.)", uz_cyr: "Қази (dona)" },
  "Til mol go'sht": { ru: "Язык говяжий", uz_cyr: "Тил mol go'sht" },
  "Go'sht somsa": { ru: "Самса с мясом", uz_cyr: "Гўшт сомса" },
  "Ko'k somsa": { ru: "Самса с зеленью", uz_cyr: "Кўк сомса" },
  "Ovoshnoy somsa": { ru: "Самса овощная", uz_cyr: "Овощной сомса" },
  "Kartoshka fri": { ru: "Картофель фри", uz_cyr: "Картошка фри" },
  "Qaynatilgan guruch": { ru: "Отварной рис", uz_cyr: "Қайнатилган гуруч" },
  "Kovurilgan chuchvara": { ru: "Жареные пельмени (чучвара)", uz_cyr: "Қовурилган чучвара" },
  "Semechki shashlik": { ru: "Шашлык семечки", uz_cyr: "Семечки шашлик" },
  "Mol jaz shashlik": { ru: "Шашлык кусковой из говядины (джаз)", uz_cyr: "Мол жаз шашлик" },
  "Qo'y jaz shashlik": { ru: "Шашлык кусковой из баранины (джаз)", uz_cyr: "Қўй жаз shashlik" },
  "Qiyma shashlik": { ru: "Шашлык люля-кебаб (қийма)", uz_cyr: "Қийма шашлик" },
  "Tovug file shashlik": { ru: "Шашлык из куриного филе", uz_cyr: "Товуқ филе шашлик" },
  "Tovug ganot shashlik": { ru: "Шашлык из куриных крылышек", uz_cyr: "Товуқ қанот шашлик" },
  "Ovoshnoy shashlik": { ru: "Овощной шашлык", uz_cyr: "Овощной шашлик" },
  "Gribnoy shashlik": { ru: "Грибной шашлык", uz_cyr: "Грибной шашлик" },
  "Napoleon shashlik": { ru: "Шашлык Наполеон", uz_cyr: "Наполеон шашлик" },
  "Rulet shashlik": { ru: "Шашлык рулет", uz_cyr: "Рулет шашлик" },
  "Koreyka shashlik": { ru: "Шашлык из корейки", uz_cyr: "Корейка шашлик" },
  "Jigar shashlik": { ru: "Шашлык из печени (джигар)", uz_cyr: "Жигар шашлик" },
  "Tovug bedro shashlik": { ru: "Шашлык из куриного бедра", uz_cyr: "Товуқ бедро шашлик" },
  "Yangi kartoshka shashlik": { ru: "Шашлык из молодого картофеля", uz_cyr: "Янги картошка шашлик" }
};

const getCategoryName = (nameUz: string, lang: 'uz' | 'uz_cyr' | 'ru') => {
  if (lang === 'uz') return nameUz;
  const match = categoryTranslations[nameUz];
  return match ? match[lang] : nameUz;
};

const getProductName = (nameUz: string, lang: 'uz' | 'uz_cyr' | 'ru') => {
  if (lang === 'uz') return nameUz;
  const match = productTranslations[nameUz];
  return match ? match[lang] : nameUz;
};

const formatPrice = (price: number | string, lang: 'uz' | 'uz_cyr' | 'ru') => {
  const num = typeof price === 'number' ? price : parseFloat(price);
  if (isNaN(num)) return '0';
  const formatted = num.toLocaleString('ru-RU').replace(/,/g, ' ');
  if (lang === 'ru') return `${formatted} сум`;
  return `${formatted} UZS`;
};

const renderCategoryIcon = (categoryId: number) => {
  switch (categoryId) {
    case 1: return <Soup size={28} strokeWidth={1.5} />;
    case 2: return <Utensils size={28} strokeWidth={1.5} />;
    case 3: return <Salad size={28} strokeWidth={1.5} />;
    case 4: return <ChefHat size={28} strokeWidth={1.5} />;
    case 5: return <Flame size={28} strokeWidth={1.5} />;
    case 6: return <Beef size={28} strokeWidth={1.5} />;
    default: return <Utensils size={28} strokeWidth={1.5} />;
  }
};

function App() {
  const tgUser = useMemo(() => window.Telegram?.WebApp?.initDataUnsafe?.user, []);
  const userId = tgUser?.id || 12345;
  const initialName = tgUser?.first_name 
    ? `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}` 
    : 'Mijoz';

  const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const urlTable = queryParams.get('table') || '';

  // App States
  const [lang, setLang] = useState<'uz' | 'uz_cyr' | 'ru'>('uz');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [activeTab, setActiveTab] = useState<'home' | 'catalog' | 'cart' | 'favorites' | 'cabinet'>('home');

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState<number[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (productId: number) => {
    triggerHaptic('light');
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );
  };

  const t = (key: keyof typeof translations['uz']) => {
    return translations[lang][key] || translations['uz'][key] || '';
  };

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Menu and Products States
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Cart state persisted in localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Cabinet & Order History States
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Form States
  const [orderType, setOrderType] = useState<'delivery' | 'pickup' | 'table'>(
    urlTable ? 'table' : 'delivery'
  );
  
  const [customerName, setCustomerName] = useState<string>(() => {
    const saved = localStorage.getItem('customerName');
    return saved || initialName;
  });
  
  const [customerPhone, setCustomerPhone] = useState<string>(() => {
    const saved = localStorage.getItem('customerPhone');
    return saved || '+998';
  });
  
  const [address, setAddress] = useState<string>(() => {
    const saved = localStorage.getItem('address');
    return saved || '';
  });

  const [tableNumber, setTableNumber] = useState<string>(urlTable);

  useEffect(() => {
    localStorage.setItem('customerName', customerName);
  }, [customerName]);

  useEffect(() => {
    localStorage.setItem('customerPhone', customerPhone);
  }, [customerPhone]);

  useEffect(() => {
    localStorage.setItem('address', address);
  }, [address]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderIdCreated, setOrderIdCreated] = useState<number | null>(null);

  // Admin Panel states
  const [isAdmin, setIsAdmin] = useState(() => 
    window.location.pathname === '/admin' || window.location.hash === '#/admin'
  );
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminActiveTab, setAdminActiveTab] = useState<'orders' | 'products' | 'categories'>('orders');
  const [orderSubTab, setOrderSubTab] = useState<'all' | 'pending' | 'confirmed' | 'completed_cancelled'>('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [ordersSearchQuery, setOrdersSearchQuery] = useState('');
  const [ordersTypeFilter, setOrdersTypeFilter] = useState<'all' | 'delivery' | 'pickup' | 'table'>('all');
  const [ordersSortBy, setOrdersSortBy] = useState<'newest' | 'oldest' | 'highest_price' | 'lowest_price'>('newest');
  const [ordersDateFilter, setOrdersDateFilter] = useState<'all' | 'today' | 'yesterday'>('all');
  
  // Product Edit modal states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name_uz: '',
    category_id: 1,
    price: '',
    discount: '0',
    image_url: '',
    is_available: true
  });

  // Watch for Admin hash trigger
  useEffect(() => {
    const handleHashChange = () => {
      setIsAdmin(window.location.pathname === '/admin' || window.location.hash === '#/admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fetch Categories & Products from Backend
  const loadMenuData = async () => {
    try {
      setLoading(true);
      const catRes = await fetch(`${API_BASE}/api/categories`);
      if (!catRes.ok) throw new Error('Kategoriyalarni yuklashda xatolik yuz berdi');
      const catData = await catRes.json();
      setCategories(catData);

      const prodRes = await fetch(`${API_BASE}/api/products`);
      if (!prodRes.ok) throw new Error('Mahsulotlarni yuklashda xatolik yuz berdi');
      const prodData = await prodRes.json();
      setProducts(prodData);
      
      setErrorMsg(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Serverga ulanib bo‘lmadi.');
    } finally {
      setLoading(false);
    }
  };

  // Load Menu and User Details on Mount
  useEffect(() => {
    loadMenuData();

    const fetchUserDetails = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/${userId}`);
        if (res.ok) {
          const user = await res.json();
          if (user && user.name) {
            setCustomerName(user.name);
            localStorage.setItem('customerName', user.name);
            if (user.phone) {
              setCustomerPhone(user.phone);
              localStorage.setItem('customerPhone', user.phone);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch user details:', err);
      }
    };
    fetchUserDetails();
  }, [userId]);

  // Load Order History for user
  useEffect(() => {
    if (activeTab === 'cabinet') {
      const fetchHistory = async () => {
        try {
          setLoadingHistory(true);
          const res = await fetch(`${API_BASE}/api/orders/history/${userId}`);
          if (res.ok) {
            const data = await res.json();
            setOrderHistory(data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [activeTab, userId]);

  // Auto login admin if running inside Telegram WebApp
  useEffect(() => {
    if (isAdmin && !isAdminAuthenticated) {
      const tg = (window as any).Telegram?.WebApp;
      const tgUser = tg?.initDataUnsafe?.user;
      if (tgUser?.id) {
        fetch(`${API_BASE}/api/admin/verify-admin?telegram_id=${tgUser.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.isAdmin) {
              setIsAdminAuthenticated(true);
            }
          })
          .catch(err => console.error('Failed to verify admin via Telegram:', err));
      }
    }
  }, [isAdmin, isAdminAuthenticated]);

  // Load Admin Data when authenticated
  useEffect(() => {
    if (isAdmin && isAdminAuthenticated) {
      fetchAdminOrders();
      loadMenuData();
    }
  }, [isAdmin, isAdminAuthenticated]);

  const fetchAdminOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/orders`);
      if (res.ok) {
        const data = await res.json();
        setAdminOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin orders:', err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      triggerHaptic('medium');
      const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchAdminOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      triggerHaptic('medium');
      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct 
        ? `${API_BASE}/api/admin/products/${editingProduct.id}`
        : `${API_BASE}/api/admin/products`;

      const payload = {
        ...newProductForm,
        category_id: Number(newProductForm.category_id),
        price: Number(newProductForm.price),
        discount: Number(newProductForm.discount || 0)
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowProductModal(false);
        setEditingProduct(null);
        loadMenuData();
        setNewProductForm({
          name_uz: '',
          category_id: 1,
          price: '',
          discount: '0',
          image_url: '',
          is_available: true
        });
      } else {
        alert('Mahsulotni saqlashda xatolik yuz berdi.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!window.confirm('Haqiqatdan ham ushbu mahsulotni o‘chirmoqchimisiz?')) return;
    try {
      triggerHaptic('heavy');
      const res = await fetch(`${API_BASE}/api/admin/products/${productId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadMenuData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      triggerHaptic('medium');
      const res = await fetch(`${API_BASE}/api/admin/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_uz: newCategoryName.trim() })
      });
      if (res.ok) {
        setNewCategoryName('');
        loadMenuData();
      } else {
        alert('Kategoriyani saqlashda xatolik yuz berdi.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!window.confirm('Diqqat! Ushbu kategoriyani o‘chirish undagi barcha mahsulotlarning o‘chib ketishiga olib keladi. Davom etasizmi?')) return;
    try {
      triggerHaptic('heavy');
      const res = await fetch(`${API_BASE}/api/admin/categories/${categoryId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadMenuData();
      } else {
        alert('Kategoriyani o‘chirishda xatolik yuz berdi.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setNewProductForm({
      name_uz: prod.name_uz,
      category_id: prod.category_id,
      price: String(prod.price),
      discount: String(prod.discount || 0),
      image_url: prod.image_url || '',
      is_available: prod.is_available
    });
    setShowProductModal(true);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'barokat2026') {
      triggerHaptic('medium');
      setIsAdminAuthenticated(true);
      setErrorMsg(null);
    } else {
      triggerNotification('error');
      alert('Noto‘g‘ri parol!');
    }
  };

  // SDK helpers
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  const triggerNotification = (type: 'success' | 'error' | 'warning') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
    }
  };

  // Cart operations
  const addToCart = (product: Product) => {
    triggerHaptic('light');
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        return prevCart.map((item) => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    triggerHaptic('light');
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === productId);
      if (!existing) return prevCart;
      if (existing.quantity === 1) {
        return prevCart.filter((item) => item.product.id !== productId);
      }
      return prevCart.map((item) => 
        item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  };

  const getProductQuantity = (productId: number): number => {
    const item = cart.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const totalItemsCount = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  const totalAmount = useMemo(() => {
    return cart.reduce((total, item) => {
      const price = Number(item.product.price);
      return total + (price * item.quantity);
    }, 0);
  }, [cart]);

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCategory = activeCategory === 'all' || prod.category_id === activeCategory;
      const matchesSearch = prod.name_uz.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch && prod.is_available;
    });
  }, [products, activeCategory, searchQuery]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerName.trim()) {
      alert('Iltimos, ismingizni kiriting.');
      return;
    }

    const phoneRegex = /^\+998\d{9}$/;
    if (!phoneRegex.test(customerPhone.trim())) {
      alert('Iltimos, telefon raqamingizni to‘g‘ri formatda kiriting (masalan: +998931234567).');
      return;
    }

    if (orderType === 'delivery' && !address.trim()) {
      alert('Etkazib berish uchun manzilni kiriting.');
      return;
    }

    if (orderType === 'table' && !tableNumber.trim()) {
      alert('Stol raqamini kiriting.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        user_id: userId,
        user_name: customerName,
        user_phone: customerPhone,
        total_amount: totalAmount,
        order_type: orderType,
        table_number: orderType === 'table' ? tableNumber : null,
        address: orderType === 'delivery' ? address : null,
        items: cart.map((item) => ({
          id: item.product.id,
          name_uz: item.product.name_uz,
          price: Number(item.product.price),
          quantity: item.quantity
        }))
      };

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Buyurtmani rasmiylashtirishda xatolik yuz berdi.');

      const data = await res.json();
      triggerNotification('success');
      setOrderIdCreated(data.orderId);
      setCart([]);
      setActiveTab('home');
    } catch (err: any) {
      console.error(err);
      triggerNotification('error');
      alert(err.message || 'Xatolik yuz berdi, iltimos qayta urinib ko‘ring.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    triggerHaptic('medium');
    setOrderIdCreated(null);
  };

  // Switch content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <>

            {/* Search Box */}
            <div className="search-wrapper">
              <div className="search-box flex-row">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder={t('searchPlaceholder')} 
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && <X size={18} style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />}
              </div>
            </div>

            {/* Categories horizontal list */}
            <div className="categories-wrapper no-scrollbar">
              <button 
                onClick={() => { triggerHaptic('light'); setActiveCategory('all'); }} 
                className={`category-chip ${activeCategory === 'all' ? 'active' : ''}`}
              >
                {t('all')}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { triggerHaptic('light'); setActiveCategory(cat.id); }}
                  className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
                >
                  {getCategoryName(cat.name_uz, lang)}
                </button>
              ))}
            </div>

            {/* 2-column Uzum Market Grid */}
            {loading ? (
              <div className="flex-center flex-column" style={{ minHeight: '200px', gap: '12px' }}>
                <div className="spinner"></div>
                <span>{t('loadingMenu')}</span>
              </div>
            ) : errorMsg ? (
              <div className="empty-state flex-column flex-center">
                <AlertCircle size={48} style={{ color: 'var(--color-danger)' }} />
                <h3>{errorMsg}</h3>
                <button onClick={loadMenuData} className="glow-btn" style={{ padding: '8px 16px', fontSize: '13px', marginTop: '10px' }}>
                  {t('reload')}
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="empty-state flex-column flex-center">
                <Grid size={48} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <h3>{t('noProducts')}</h3>
              </div>
            ) : (
              <div className="uzum-grid">
                {filteredProducts.map((prod) => {
                  const qty = getProductQuantity(prod.id);
                  const oldPrice = prod.discount > 0 ? Math.round(Number(prod.price) / (1 - prod.discount / 100)) : null;
                  return (
                    <div key={prod.id} className="uzum-card">
                      <div className="uzum-card-image-wrapper">
                        {prod.image_url && !imageErrors[prod.id] ? (
                          <img 
                            src={prod.image_url} 
                            alt={prod.name_uz} 
                            onError={() => setImageErrors(prev => ({ ...prev, [prod.id]: true }))}
                          />
                        ) : (
                          <div className="category-icon-fallback flex-center">
                            {renderCategoryIcon(prod.category_id)}
                          </div>
                        )}
                        
                        <button 
                          onClick={() => toggleFavorite(prod.id)} 
                          className={`favorite-btn ${favorites.includes(prod.id) ? 'active' : ''}`}
                          aria-label="Add to favorites"
                        >
                          <Heart fill={favorites.includes(prod.id) ? 'var(--uzum-purple)' : 'none'} size={18} />
                        </button>

                        {prod.discount > 0 && (
                          <div className="discount-badge">-{prod.discount}% Chegirma</div>
                        )}
                      </div>

                      <div className="uzum-card-info">
                        <h3 className="uzum-card-title">{getProductName(prod.name_uz, lang)}</h3>

                        <div className="uzum-price-row">
                          <div className="price-column">
                            {oldPrice && (
                              <span className="old-price">{formatPrice(oldPrice, lang)}</span>
                            )}
                            <span className="new-price">{formatPrice(prod.price, lang)}</span>
                          </div>

                          {qty === 0 ? (
                            <button 
                              onClick={() => addToCart(prod)}
                              className="add-to-cart-btn flex-center"
                              aria-label="Add to cart"
                            >
                              <Plus size={18} />
                            </button>
                          ) : (
                            <div className="grid-quantity-controls flex-row">
                              <button onClick={() => removeFromCart(prod.id)} className="grid-qty-btn"><Minus size={12} /></button>
                              <span>{qty}</span>
                              <button onClick={() => addToCart(prod)} className="grid-qty-btn"><Plus size={12} /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );

      case 'catalog':
        return (
          <div className="catalog-tab-container">
            <h2 className="tab-title">Katalog</h2>
            <div className="catalog-list">
              {categories.map((cat) => (
                <div 
                  key={cat.id} 
                  className="catalog-item glass-card"
                  onClick={() => {
                    triggerHaptic('medium');
                    setActiveCategory(cat.id);
                    setActiveTab('home');
                  }}
                >
                  <div className="catalog-icon-container">
                    {renderCategoryIcon(cat.id)}
                  </div>
                  <div className="catalog-details">
                    <h3>{getCategoryName(cat.name_uz, lang)}</h3>
                    <p>{products.filter(p => p.category_id === cat.id).length} ta taomlar</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'cart':
        return (
          <div className="cart-tab-container">
            <h2 className="tab-title">{t('cartTitle')}</h2>
            {cart.length === 0 ? (
              <div className="empty-cart-state flex-column flex-center">
                <ShoppingBag size={64} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                <p>{t('cartEmpty')}</p>
                <button onClick={() => setActiveTab('home')} className="glow-btn" style={{ padding: '10px 24px', marginTop: '16px' }}>
                  Xarid qilish
                </button>
              </div>
            ) : (
              <div className="cart-grid">
                <div className="cart-items-section glass-card">
                  {cart.map((item) => (
                    <div key={item.product.id} className="cart-item-row flex-between">
                      <div className="cart-item-details">
                        <h4>{getProductName(item.product.name_uz, lang)}</h4>
                        <span className="price-tag">{formatPrice(item.product.price, lang)}</span>
                      </div>
                      <div className="quantity-controls flex-row">
                        <button onClick={() => removeFromCart(item.product.id)} className="qty-btn flex-center"><Minus size={14} /></button>
                        <span className="qty-number">{item.quantity}</span>
                        <button onClick={() => addToCart(item.product)} className="qty-btn flex-center"><Plus size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="checkout-details-section glass-card">
                  <h3 className="section-title">{t('serviceType')}</h3>
                  <div className="order-type-tabs">
                    <button 
                      type="button" 
                      onClick={() => { triggerHaptic('light'); setOrderType('delivery'); }}
                      className={`tab-btn ${orderType === 'delivery' ? 'active' : ''}`}
                    >
                      <Truck size={15} /> {t('delivery')}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { triggerHaptic('light'); setOrderType('pickup'); }}
                      className={`tab-btn ${orderType === 'pickup' ? 'active' : ''}`}
                    >
                      <Compass size={15} /> {t('takeaway')}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { triggerHaptic('light'); setOrderType('table'); }}
                      className={`tab-btn ${orderType === 'table' ? 'active' : ''}`}
                    >
                      <Grid size={15} /> {t('table')}
                    </button>
                  </div>

                  <form onSubmit={handleCheckout} className="checkout-form" style={{ marginTop: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">{t('nameLabel')}</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        value={customerName} 
                        onChange={(e) => setCustomerName(e.target.value)} 
                        placeholder={t('namePlaceholder')}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('phoneLabel')}</label>
                      <input 
                        type="tel" 
                        className="form-input" 
                        required 
                        value={customerPhone} 
                        onChange={(e) => setCustomerPhone(e.target.value)} 
                        placeholder="+998901234567"
                      />
                    </div>

                    {orderType === 'delivery' && (
                      <div className="form-group">
                        <label className="form-label">{t('addressPlaceholder')}</label>
                        <textarea 
                          className="form-input" 
                          required 
                          value={address} 
                          onChange={(e) => setAddress(e.target.value)} 
                          placeholder={t('addressInputPlaceholder')} 
                          rows={2}
                        />
                      </div>
                    )}

                    {orderType === 'table' && (
                      <div className="form-group">
                        <label className="form-label">{t('tableLabel')}</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          required 
                          value={tableNumber} 
                          onChange={(e) => setTableNumber(e.target.value)} 
                          placeholder={t('tableInputPlaceholder')}
                        />
                      </div>
                    )}

                    <div className="totals-card" style={{ marginTop: '16px' }}>
                      <div className="totals-row">
                        <span>{t('totalItemsPriceLabel')}</span>
                        <span>{formatPrice(totalAmount, lang)}</span>
                      </div>
                      <div className="totals-row">
                        <span>{t('freeService')}</span>
                        <span>{t('freeValue')}</span>
                      </div>
                      <div className="totals-row grand-total">
                        <span>{t('totalPayable')}</span>
                        <span>{formatPrice(totalAmount, lang)}</span>
                      </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="glow-btn checkout-btn" style={{ width: '100%', marginTop: '16px' }}>
                      {isSubmitting ? t('sending') : t('confirmOrder')}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        );

      case 'favorites':
        const favoriteProducts = products.filter(p => favorites.includes(p.id));
        return (
          <div className="favorites-tab-container">
            <h2 className="tab-title">Saralanganlar</h2>
            {favoriteProducts.length === 0 ? (
              <div className="empty-cart-state flex-column flex-center">
                <Heart size={64} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                <p>Hozircha hech narsa yo'q</p>
                <button onClick={() => setActiveTab('home')} className="glow-btn" style={{ padding: '10px 24px', marginTop: '16px' }}>
                  Bosh sahifa
                </button>
              </div>
            ) : (
              <div className="uzum-grid">
                {favoriteProducts.map((prod) => {
                  const qty = getProductQuantity(prod.id);
                  const oldPrice = prod.discount > 0 ? Math.round(Number(prod.price) / (1 - prod.discount / 100)) : null;
                  return (
                    <div key={prod.id} className="uzum-card">
                      <div className="uzum-card-image-wrapper">
                        {prod.image_url && !imageErrors[prod.id] ? (
                          <img 
                            src={prod.image_url} 
                            alt={prod.name_uz} 
                            onError={() => setImageErrors(prev => ({ ...prev, [prod.id]: true }))}
                          />
                        ) : (
                          <div className="category-icon-fallback flex-center">
                            {renderCategoryIcon(prod.category_id)}
                          </div>
                        )}
                        
                        <button 
                          onClick={() => toggleFavorite(prod.id)} 
                          className="favorite-btn active"
                          aria-label="Remove from favorites"
                        >
                          <Heart fill="var(--uzum-purple)" size={18} />
                        </button>
                        {prod.discount > 0 && (
                          <div className="discount-badge">-{prod.discount}% Chegirma</div>
                        )}
                      </div>

                      <div className="uzum-card-info">
                        <h3 className="uzum-card-title">{getProductName(prod.name_uz, lang)}</h3>

                        <div className="uzum-price-row">
                          <div className="price-column">
                            {oldPrice && (
                              <span className="old-price">{formatPrice(oldPrice, lang)}</span>
                            )}
                            <span className="new-price">{formatPrice(prod.price, lang)}</span>
                          </div>

                          {qty === 0 ? (
                            <button onClick={() => addToCart(prod)} className="add-to-cart-btn flex-center">
                              <Plus size={18} />
                            </button>
                          ) : (
                            <div className="grid-quantity-controls flex-row">
                              <button onClick={() => removeFromCart(prod.id)} className="grid-qty-btn"><Minus size={12} /></button>
                              <span>{qty}</span>
                              <button onClick={() => addToCart(prod)} className="grid-qty-btn"><Plus size={12} /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'cabinet':
        return (
          <div className="cabinet-tab-container">
            <h2 className="tab-title">Kabinet</h2>
            
            {/* User Profile Info */}
            <div className="profile-card glass-card flex-row" style={{ gap: '16px', padding: '16px' }}>
              <div className="avatar">
                {customerName.charAt(0).toUpperCase()}
              </div>
              <div className="profile-details">
                <h3>{customerName}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>ID: #{userId}</p>
              </div>
            </div>

            {/* Custom Settings List */}
            <div className="settings-list glass-card" style={{ marginTop: '16px', padding: '16px' }}>
              <h3>Sozlamalar</h3>
              <div className="settings-row flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--card-border)' }}>
                <span>Mavzu (Theme)</span>
                <button 
                  onClick={() => setTheme(p => p === 'dark' ? 'light' : 'dark')}
                  className="control-icon-btn flex-center"
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
              <div className="settings-row flex-between" style={{ padding: '10px 0' }}>
                <span>Til (Language)</span>
                <div className="lang-selector flex-row">
                  {(['uz', 'uz_cyr', 'ru'] as const).map((l) => (
                    <button 
                      key={l}
                      onClick={() => setLang(l)} 
                      className={`lang-btn ${lang === l ? 'active' : ''}`}
                    >
                      {l.toUpperCase() === 'UZ_CYR' ? 'ЎЗ' : l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* User Order History */}
            <div className="order-history-section" style={{ marginTop: '24px' }}>
              <h3 style={{ marginBottom: '12px' }}>Mening buyurtmalarim</h3>
              {loadingHistory ? (
                <div className="flex-center" style={{ padding: '20px' }}>
                  <div className="spinner"></div>
                </div>
              ) : orderHistory.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                  Hozircha buyurtmalar berilmagan.
                </p>
              ) : (
                <div className="history-list">
                  {orderHistory.map((order) => {
                    const orderDate = new Date(order.created_at).toLocaleDateString('uz-UZ');
                    const statusText = order.status === 'completed' ? 'Yakunlandi' : order.status === 'cancelled' ? 'Bekor qilindi' : 'Kutilmoqda';
                    const statusClass = `status-${order.status}`;
                    return (
                      <div key={order.id} className="history-item glass-card" style={{ padding: '16px', marginBottom: '12px' }}>
                        <div className="history-item-header flex-between" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 700 }}>Buyurtma #{order.id}</span>
                          <span className={`status-badge ${statusClass}`}>{statusText}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <p>Sana: {orderDate}</p>
                          <p>Taomlar: {order.items.map(i => `${i.product_name} (${i.quantity}x)`).join(', ')}</p>
                          <p style={{ fontWeight: 700, color: 'var(--accent-color)', marginTop: '4px' }}>
                            Jami: {formatPrice(order.total_amount, lang)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  // Render Admin View
  if (isAdmin) {
    if (!isAdminAuthenticated) {
      return (
        <div className="admin-login-wrapper flex-center">
          <form onSubmit={handleAdminLogin} className="admin-login-card glass-card flex-column">
            <h2>Admin Panelga Kirish</h2>
            <div className="form-group" style={{ margin: '16px 0', width: '100%' }}>
              <label className="form-label">Admin Paroli</label>
              <input 
                type="password" 
                className="form-input" 
                required 
                placeholder="Parolni kiriting..."
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="glow-btn" style={{ width: '100%', padding: '12px' }}>Kirish</button>
          </form>
        </div>
      );
    }

    return (
      <div className="admin-panel-container">
        <header className="admin-header flex-between">
          <div className="flex-row" style={{ gap: '10px' }}>
            <h1>Admin Panel</h1>
            <span className="admin-badge">REAL-TIME</span>
          </div>
          <button 
            onClick={() => {
              triggerHaptic('medium');
              setIsAdminAuthenticated(false);
              setAdminPassword('');
            }}
            className="control-icon-btn flex-center"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Dashboard Metrics */}
        <div className="admin-metrics-grid">
          <div className="metric-box glass-card">
            <h4>Barcha buyurtmalar</h4>
            <p>{adminOrders.length}</p>
          </div>
          <div className="metric-box glass-card">
            <h4>Faol buyurtmalar</h4>
            <p>{adminOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length}</p>
          </div>
          <div className="metric-box glass-card">
            <h4>Tushum (UZS)</h4>
            <p>{formatPrice(adminOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + Number(o.total_amount), 0), 'uz')}</p>
          </div>
          <div className="metric-box glass-card">
            <h4>Taomlar soni</h4>
            <p>{products.length}</p>
          </div>
        </div>

        {/* Admin Navigation tabs */}
        <div className="admin-nav-tabs">
          <button 
            className={`admin-nav-btn ${adminActiveTab === 'orders' ? 'active' : ''}`}
            onClick={() => setAdminActiveTab('orders')}
          >
            Buyurtmalar
          </button>
          <button 
            className={`admin-nav-btn ${adminActiveTab === 'products' ? 'active' : ''}`}
            onClick={() => setAdminActiveTab('products')}
          >
            Taomlar CRUD
          </button>
          <button 
            className={`admin-nav-btn ${adminActiveTab === 'categories' ? 'active' : ''}`}
            onClick={() => setAdminActiveTab('categories')}
          >
            Kategoriyalar CRUD
          </button>
        </div>

        {/* Admin Orders Section */}
        {adminActiveTab === 'orders' && (() => {
          const filteredOrders = adminOrders
            .filter(order => {
              if (orderSubTab === 'all') return true;
              if (orderSubTab === 'pending') return order.status === 'pending';
              if (orderSubTab === 'confirmed') return order.status === 'confirmed';
              if (orderSubTab === 'completed_cancelled') return order.status === 'completed' || order.status === 'cancelled';
              return true;
            })
            .filter(order => {
              if (ordersTypeFilter === 'all') return true;
              return order.order_type === ordersTypeFilter;
            })
            .filter(order => {
              if (!ordersSearchQuery.trim()) return true;
              const query = ordersSearchQuery.toLowerCase();
              const matchesName = order.user_name?.toLowerCase().includes(query);
              const matchesPhone = order.user_phone?.includes(query);
              const matchesId = String(order.id) === query || `#${order.id}` === query;
              const matchesFood = order.items.some(item => item.product_name?.toLowerCase().includes(query));
              return matchesName || matchesPhone || matchesId || matchesFood;
            })
            .filter(order => {
              if (ordersDateFilter === 'all') return true;
              const orderDate = new Date(order.created_at);
              const today = new Date();
              if (ordersDateFilter === 'today') {
                return orderDate.toDateString() === today.toDateString();
              }
              if (ordersDateFilter === 'yesterday') {
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                return orderDate.toDateString() === yesterday.toDateString();
              }
              return true;
            })
            .sort((a, b) => {
              if (ordersSortBy === 'newest') {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              }
              if (ordersSortBy === 'oldest') {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              }
              if (ordersSortBy === 'highest_price') {
                return Number(b.total_amount) - Number(a.total_amount);
              }
              if (ordersSortBy === 'lowest_price') {
                return Number(a.total_amount) - Number(b.total_amount);
              }
              return 0;
            });

          return (
            <div className="admin-orders-list">
              <div className="flex-between" style={{ marginBottom: '16px' }}>
                <h3>Buyurtmalar ro‘yxati</h3>
              </div>

              {/* Order Status Sub-Tabs */}
              <div className="order-sub-tabs flex-row" style={{ gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                <button 
                  className={`sub-tab-btn ${orderSubTab === 'all' ? 'active' : ''}`}
                  onClick={() => setOrderSubTab('all')}
                >
                  Barchasi ({adminOrders.length})
                </button>
                <button 
                  className={`sub-tab-btn ${orderSubTab === 'pending' ? 'active' : ''}`}
                  onClick={() => setOrderSubTab('pending')}
                  style={{ position: 'relative' }}
                >
                  Yangi ({adminOrders.filter(o => o.status === 'pending').length})
                  {adminOrders.some(o => o.status === 'pending') && (
                    <span className="pulse-dot"></span>
                  )}
                </button>
                <button 
                  className={`sub-tab-btn ${orderSubTab === 'confirmed' ? 'active' : ''}`}
                  onClick={() => setOrderSubTab('confirmed')}
                >
                  Faol ({adminOrders.filter(o => o.status === 'confirmed').length})
                </button>
                <button 
                  className={`sub-tab-btn ${orderSubTab === 'completed_cancelled' ? 'active' : ''}`}
                  onClick={() => setOrderSubTab('completed_cancelled')}
                >
                  Tarix ({adminOrders.filter(o => o.status === 'completed' || o.status === 'cancelled').length})
                </button>
              </div>

              {/* Filter Panel */}
              <div className="orders-filter-panel glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {/* Search */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '10px' }}>Qidiruv</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Mijoz, telefon, ID yoki taom..."
                      value={ordersSearchQuery}
                      onChange={(e) => setOrdersSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Order Type */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '10px' }}>Buyurtma turi</label>
                    <select 
                      className="form-input"
                      value={ordersTypeFilter}
                      onChange={(e) => setOrdersTypeFilter(e.target.value as any)}
                    >
                      <option value="all">Barcha turlar</option>
                      <option value="delivery">🚚 Yetkazib berish</option>
                      <option value="pickup">🛍 Olib ketish</option>
                      <option value="table">🍽 Stolda</option>
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '10px' }}>Sana filtri</label>
                    <select 
                      className="form-input"
                      value={ordersDateFilter}
                      onChange={(e) => setOrdersDateFilter(e.target.value as any)}
                    >
                      <option value="all">Barcha vaqtlar</option>
                      <option value="today">Bugun</option>
                      <option value="yesterday">Kecha</option>
                    </select>
                  </div>

                  {/* Sorting */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '10px' }}>Saralash</label>
                    <select 
                      className="form-input"
                      value={ordersSortBy}
                      onChange={(e) => setOrdersSortBy(e.target.value as any)}
                    >
                      <option value="newest">Yangi birinchi</option>
                      <option value="oldest">Eski birinchi</option>
                      <option value="highest_price">Qimmatroq birinchi</option>
                      <option value="lowest_price">Arzonroq birinchi</option>
                    </select>
                  </div>
                </div>
                
                {/* Reset button */}
                {(ordersSearchQuery || ordersTypeFilter !== 'all' || ordersDateFilter !== 'all' || ordersSortBy !== 'newest') && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button 
                      onClick={() => {
                        setOrdersSearchQuery('');
                        setOrdersTypeFilter('all');
                        setOrdersDateFilter('all');
                        setOrdersSortBy('newest');
                      }}
                      className="sub-tab-btn" 
                      style={{ fontSize: '11px', padding: '6px 12px', background: 'transparent' }}
                    >
                      Filtrlarni tozalash 🔄
                    </button>
                  </div>
                )}
              </div>

              {filteredOrders.length === 0 ? (
                <p style={{ padding: '20px', textAlign: 'center' }}>Qidiruvga mos buyurtmalar mavjud emas.</p>
              ) : (
                filteredOrders.map((order) => {
                  const orderDate = new Date(order.created_at).toLocaleString('uz-UZ');
                  return (
                    <div key={order.id} className="admin-order-card glass-card">
                      <div className="admin-order-header flex-between">
                        <div>
                          <h4>Buyurtma #{order.id}</h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{orderDate}</span>
                        </div>
                        
                        <div className="status-dropdown-wrapper">
                          <select 
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className={`status-select status-${order.status}`}
                          >
                            <option value="pending">Kutilmoqda</option>
                            <option value="confirmed">Tasdiqlandi</option>
                            <option value="completed">Yakunlandi</option>
                            <option value="cancelled">Bekor qilindi</option>
                          </select>
                        </div>
                      </div>

                      <div className="admin-order-body">
                        <p>👤 <b>Mijoz:</b> {order.user_name} ({order.user_phone})</p>
                        <div style={{ marginBottom: '8px' }}>
                          <b>Turi:</b>{' '}
                          {order.order_type === 'delivery' && (
                            <span className="order-type-badge delivery">🚚 Yetkazib berish (Manzil: {order.address})</span>
                          )}
                          {order.order_type === 'pickup' && (
                            <span className="order-type-badge pickup">🛍 Olib ketish (Self-pickup)</span>
                          )}
                          {order.order_type === 'table' && (
                            <span className="order-type-badge table">🍽 Stolda (Stol №{order.table_number})</span>
                          )}
                        </div>
                        
                        <div className="order-items-table" style={{ marginTop: '8px' }}>
                          <h5>Taomlar:</h5>
                          <ul>
                            {order.items.map(item => (
                              <li key={item.id}>
                                {item.product_name} - {item.quantity} dona x {formatPrice(item.price, 'uz')}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <h4 style={{ marginTop: '8px', color: 'var(--accent-color)' }}>
                          Jami: {formatPrice(order.total_amount, 'uz')}
                        </h4>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })()}

        {/* Admin Products CRUD Section */}
        {adminActiveTab === 'products' && (
          <div className="admin-products-section">
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <h3>Taomlar boshqaruvi</h3>
              <button 
                className="glow-btn" 
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => {
                  setEditingProduct(null);
                  setNewProductForm({
                    name_uz: '',
                    category_id: categories[0]?.id || 1,
                    price: '',
                    discount: '0',
                    image_url: '',
                    is_available: true
                  });
                  setShowProductModal(true);
                }}
              >
                Yangi Taom Qo‘shish
              </button>
            </div>

            <div className="admin-products-table-wrapper glass-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Taom nomi</th>
                    <th>Kategoriya</th>
                    <th>Narxi</th>
                    <th>Status</th>
                    <th>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((prod) => (
                    <tr key={prod.id}>
                      <td>{prod.name_uz}</td>
                      <td>{categories.find(c => c.id === prod.category_id)?.name_uz || prod.category_id}</td>
                      <td>{formatPrice(prod.price, 'uz')}</td>
                      <td>{prod.is_available ? 'Sotuvda' : 'Yo‘q'}</td>
                      <td>
                        <div className="flex-row" style={{ gap: '8px' }}>
                          <button onClick={() => openEditProduct(prod)} className="table-action-btn edit flex-center">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDeleteProduct(prod.id)} className="table-action-btn delete flex-center">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Admin Categories CRUD Section */}
        {adminActiveTab === 'categories' && (
          <div className="admin-categories-section">
            <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
              <h3>Yangi kategoriya qo‘shish</h3>
              <form onSubmit={handleCreateCategory} className="flex-row" style={{ gap: '12px', marginTop: '12px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ flexGrow: 1 }}
                  placeholder="Kategoriya nomi (Masalan: Desertlar)"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <button type="submit" className="glow-btn" style={{ padding: '12px 24px' }}>
                  Qo‘shish
                </button>
              </form>
            </div>

            <div className="admin-products-table-wrapper glass-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Kategoriya ID</th>
                    <th>Kategoriya nomi</th>
                    <th>Slug</th>
                    <th style={{ textAlign: 'right' }}>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td>#{cat.id}</td>
                      <td><b>{cat.name_uz}</b></td>
                      <td><code>{cat.slug}</code></td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteCategory(cat.id)} 
                          className="table-action-btn delete flex-center"
                          style={{ marginLeft: 'auto' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create/Edit Product Modal */}
        {showProductModal && (
          <div className="admin-modal-overlay flex-center">
            <div className="admin-modal-card glass-card">
              <div className="modal-header flex-between">
                <h3>{editingProduct ? 'Taomni Tahrirlash' : 'Yangi Taom Qo‘shish'}</h3>
                <button className="close-modal flex-center" onClick={() => setShowProductModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdateProduct} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Nomi (UZ)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={newProductForm.name_uz}
                    onChange={(e) => setNewProductForm({...newProductForm, name_uz: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Kategoriya</label>
                  <select 
                    className="form-input"
                    value={newProductForm.category_id}
                    onChange={(e) => setNewProductForm({...newProductForm, category_id: Number(e.target.value)})}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name_uz}</option>
                    ))}
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Narxi (UZS)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      required 
                      value={newProductForm.price}
                      onChange={(e) => setNewProductForm({...newProductForm, price: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Chegirma (%da, majburiy emas)</label>
                    <input 
                      type="number" 
                      min="0"
                      max="99"
                      className="form-input" 
                      value={newProductForm.discount}
                      onChange={(e) => setNewProductForm({...newProductForm, discount: e.target.value})}
                    />
                  </div>
                </div>


                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Rasm yuklash (Qurilmadan tanlash)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="form-input" 
                    style={{ padding: '6px 12px' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const img = new Image();
                          img.src = reader.result as string;
                          img.onload = () => {
                            // Compress image using canvas
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 500;
                            let width = img.width;
                            let height = img.height;

                            if (width > MAX_WIDTH) {
                              height = Math.round((height * MAX_WIDTH) / width);
                              width = MAX_WIDTH;
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);
                            
                            // Convert to compressed jpeg base64 (70% quality)
                            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                            setNewProductForm(prev => ({ ...prev, image_url: compressedBase64 }));
                          };
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Yoki Rasm manzili (Image URL)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newProductForm.image_url}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, image_url: e.target.value }))}
                    placeholder="/images/shorva.png kabi..."
                  />
                </div>

                {newProductForm.image_url && (
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Rasm ko'rinishi (Prevyu)</label>
                    <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color, #ccc)' }}>
                      <img 
                        src={newProductForm.image_url} 
                        alt="Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={() => setNewProductForm(prev => ({ ...prev, image_url: '' }))}
                        style={{ 
                          position: 'absolute', 
                          top: '4px', 
                          right: '4px', 
                          background: 'rgba(0,0,0,0.7)', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: '50%', 
                          width: '18px', 
                          height: '18px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          cursor: 'pointer',
                          fontSize: '10px',
                          lineHeight: 1
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-group flex-row" style={{ gap: '10px', marginTop: '10px' }}>
                  <input 
                    type="checkbox" 
                    id="is_available_cb"
                    checked={newProductForm.is_available}
                    onChange={(e) => setNewProductForm({...newProductForm, is_available: e.target.checked})}
                  />
                  <label htmlFor="is_available_cb" className="form-label" style={{ textTransform: 'none' }}>Taom sotuvda mavjud</label>
                </div>

                <button type="submit" className="glow-btn" style={{ width: '100%', marginTop: '16px', padding: '12px' }}>
                  Saqlash
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render main User App
  return (
    <>
      <div className="app-container">
        {/* App Header */}
        <header className="app-header flex-between" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <div className="welcome-section flex-row">
            <div className="avatar">
              {customerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-column">
              <span className="greeting-text">
                {t('welcome')}
              </span>
              <h2 className="user-name">{customerName}</h2>
            </div>
          </div>

          <div className="header-controls flex-row" style={{ gap: '8px' }}>
            {urlTable && (
              <div className="table-badge flex-row" style={{ margin: 0 }}>
                <Compass size={14} />
                <span>{t('tableBadge')}: #{urlTable}</span>
              </div>
            )}
            
            <button 
              onClick={() => {
                triggerHaptic('light');
                setTheme(prev => prev === 'dark' ? 'light' : 'dark');
              }}
              className="control-icon-btn flex-center"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <div className="lang-selector flex-row">
              <button 
                onClick={() => { triggerHaptic('light'); setLang('uz'); }} 
                className={`lang-btn ${lang === 'uz' ? 'active' : ''}`}
              >
                UZ
              </button>
              <button 
                onClick={() => { triggerHaptic('light'); setLang('uz_cyr'); }} 
                className={`lang-btn ${lang === 'uz_cyr' ? 'active' : ''}`}
              >
                ЎЗ
              </button>
              <button 
                onClick={() => { triggerHaptic('light'); setLang('ru'); }} 
                className={`lang-btn ${lang === 'ru' ? 'active' : ''}`}
              >
                RU
              </button>
            </div>
          </div>
        </header>

        {/* Location & Working Hours Info Card */}
        <div className="location-info-card glass-card flex-between">
          <div className="flex-column location-info-left">
            <div className="info-item flex-row" style={{ gap: '8px' }}>
              <MapPin size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <span className="info-text">{t('landmarkLabel')}</span>
            </div>
            <div className="info-item flex-row" style={{ marginTop: '6px', gap: '8px' }}>
              <Clock size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <span className="info-text">{t('workingHoursLabel')}</span>
            </div>
          </div>
          
          <a 
            href="https://maps.google.com/?q=40.8436,68.6617" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="mini-map-link flex-column flex-center"
            onClick={() => triggerHaptic('light')}
          >
            <div className="mini-map-icon-wrapper flex-center">
              <Map size={18} />
            </div>
            <span className="mini-map-text">{t('viewOnMap')}</span>
          </a>
        </div>

        {/* Main Tab Area */}
        <main className="app-main-content">
          {renderTabContent()}
        </main>

        {/* 5-Tab Uzum Market Navigation Bar */}
        <nav className="uzum-nav-bar glass-panel">
          <button 
            onClick={() => { triggerHaptic('light'); setActiveTab('home'); }} 
            className={`nav-tab-item ${activeTab === 'home' ? 'active' : ''}`}
          >
            <Soup size={20} />
            <span>Bosh sahifa</span>
          </button>
          
          <button 
            onClick={() => { triggerHaptic('light'); setActiveTab('catalog'); }} 
            className={`nav-tab-item ${activeTab === 'catalog' ? 'active' : ''}`}
          >
            <Grid size={20} />
            <span>Katalog</span>
          </button>

          <button 
            onClick={() => { triggerHaptic('light'); setActiveTab('cart'); }} 
            className={`nav-tab-item ${activeTab === 'cart' ? 'active' : ''}`}
          >
            <div className="nav-cart-wrapper">
              <ShoppingBag size={20} />
              {totalItemsCount > 0 && (
                <span className="cart-badge">{totalItemsCount}</span>
              )}
            </div>
            <span>Savat</span>
          </button>

          <button 
            onClick={() => { triggerHaptic('light'); setActiveTab('favorites'); }} 
            className={`nav-tab-item ${activeTab === 'favorites' ? 'active' : ''}`}
          >
            <div className="nav-cart-wrapper">
              <Heart size={20} />
              {favorites.length > 0 && (
                <span className="cart-badge fav">{favorites.length}</span>
              )}
            </div>
            <span>Saralangan</span>
          </button>

          <button 
            onClick={() => { triggerHaptic('light'); setActiveTab('cabinet'); }} 
            className={`nav-tab-item ${activeTab === 'cabinet' ? 'active' : ''}`}
          >
            <User size={20} />
            <span>Kabinet</span>
          </button>
        </nav>

        {/* Success Modal Overlay */}
        {orderIdCreated !== null && (
          <div className="success-overlay">
            <div className="glass-card success-box">
              <div className="success-icon-wrapper">
                <Check size={40} style={{ strokeWidth: 3 }} />
              </div>
              
              <h2 className="success-title">{t('orderAccepted')}</h2>
              <p className="success-text">
                {t('successText')}
              </p>
              
              <div className="success-details">
                <div className="flex-between">
                  <span style={{ color: 'var(--text-muted)' }}>{t('orderIdLabel')}:</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>#{orderIdCreated}</span>
                </div>
                <div className="flex-between">
                  <span style={{ color: 'var(--text-muted)' }}>{t('customerLabel')}:</span>
                  <span style={{ fontWeight: 600 }}>{customerName}</span>
                </div>
                <div className="flex-between">
                  <span style={{ color: 'var(--text-muted)' }}>{t('paymentTypeLabel')}:</span>
                  <span>{t('paymentValue')}</span>
                </div>
              </div>

              <button 
                onClick={handleCloseSuccess} 
                className="glow-btn success-btn"
              >
                {t('closeBtn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
