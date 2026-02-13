import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, PlusCircle, ShoppingBag, Heart, User, X, 
  Sparkles, Loader2, DollarSign, Bike, Camera, 
  ShieldCheck, Lightbulb, MessageSquare, Ghost, Info
} from 'lucide-react';

// Импорты Firebase
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot
} from 'firebase/firestore';

/**
 * ВЕРСИЯ ДЛЯ ХОСТИНГА (Vercel)
 * Здесь убраны все неопределенные переменные, которые вызывали ошибку.
 */

// --- ШАГ 1: НАСТРОЙКА FIREBASE ---
// Чтобы база данных заработала на твоем сайте, 
// зайди в Firebase Console -> Project Settings и скопируй свой объект конфига сюда.
// Если оставить "ВАШ_КЛЮЧ", сайт соберется, но база работать не будет.
const firebaseConfig = {
  apiKey: "ВАШ_КЛЮЧ",
  authDomain: "ВАШ_ПРОЕКТ.firebaseapp.com",
  projectId: "ВАШ_ПРОЕКТ",
  storageBucket: "ВАШ_ПРОЕКТ.appspot.com",
  messagingSenderId: "ID",
  appId: "APP_ID"
};

// Инициализируем Firebase только если ключи заменены
const app = firebaseConfig.apiKey !== "ВАШ_КЛЮЧ" ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

// Уникальный ID твоего приложения (можно оставить как есть)
const currentAppId = 'sport-resell-app-v1';

// Стартовые данные для ленты (будут видны всегда)
const MOCK_PRODUCTS = [
  {
    id: 'seed-1',
    user: "Марафонец_92",
    title: "Nike Air Zoom Alphafly NEXT% 2",
    category: "Бег",
    price: 18500,
    images: ["https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&q=80&w=800"],
    description: "Пробег всего 15 км. Не подошли по колодке. Оригинал. Размер 43 EU. Состояние 5/5.",
    createdAt: Date.now() - 100000,
    qna: "Вопрос: На узкую стопу подойдут?\nОтвет: Да, модель очень плотно сидит."
  },
  {
    id: 'seed-2',
    user: "Velo_Pro",
    title: "Шлем Giro Aether Spherical",
    category: "ВЕЛО",
    price: 12000,
    images: ["https://images.unsplash.com/photo-1596435308018-774f76269661?auto=format&fit=crop&q=80&w=800"],
    description: "Топовый шлем, размер М. Использовал полсезона, без падений.",
    createdAt: Date.now() - 200000
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Все");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Состояния для формы создания
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("Бег");
  const [newImages, setNewImages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const categories = ["Все", "Бег", "ВЕЛО"];

  // Ключ Gemini API (если захочешь добавить функции ИИ позже)
  const geminiApiKey = ""; 

  // Авторизация
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        signInAnonymously(auth).catch(err => console.error("Анонимный вход не удался", err));
      }
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Загрузка данных из облака
  useEffect(() => {
    if (!db || !user) return;
    const productsRef = collection(db, 'artifacts', currentAppId, 'public', 'data', 'products');
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const dbItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prev => {
        const combined = [...dbItems, ...MOCK_PRODUCTS];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        return unique.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      });
    }, (error) => {
      console.error("Ошибка Firestore:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // Функция для добавления поста
  const handleAddPost = async () => {
    if (!db || !user || !newTitle || !newPrice) return;
    try {
      const productsRef = collection(db, 'artifacts', currentAppId, 'public', 'data', 'products');
      await addDoc(productsRef, {
        userId: user.uid,
        user: "Атлет #" + user.uid.slice(-4),
        title: newTitle,
        category: newCategory,
        price: parseInt(newPrice),
        images: ["https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=600"],
        description: newDesc,
        createdAt: Date.now()
      });
      setIsModalOpen(false);
      setNewTitle(""); setNewDesc(""); setNewPrice("");
    } catch (err) {
      console.error("Ошибка при добавлении:", err);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === "Все" || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [searchTerm, selectedCategory, products]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
      {/* Шапка */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black bg-gradient-to-br from-blue-600 to-indigo-700 bg-clip-text text-transparent italic leading-none">
              SPORT-RESELL
            </h1>
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1">Live Marketplace</span>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Поиск экипа..."
              className="w-full bg-gray-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 border-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto mt-6 px-4">
        {/* Предупреждение о конфиге */}
        {firebaseConfig.apiKey === "ВАШ_КЛЮЧ" && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-[24px] flex items-start gap-3 shadow-sm">
            <Info className="w-5 h-5 text-orange-600 shrink-0" />
            <p className="text-[11px] text-orange-800 font-bold leading-tight">
              Внимание: Вы еще не заменили ключи в коде! Новые объявления не будут сохраняться в облаке.
            </p>
          </div>
        )}

        {/* Категории */}
        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                selectedCategory === cat 
                ? "bg-blue-600 text-white shadow-xl shadow-blue-200" 
                : "bg-white text-gray-500 border border-gray-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Список товаров */}
        <div className="space-y-12">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-[48px] overflow-hidden shadow-sm border border-gray-100 group">
              <div className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center font-black text-blue-600">
                  {product.user?.[0] || 'A'}
                </div>
                <div className="flex-1">
                  <div className="font-black text-base text-gray-900 flex items-center gap-2">
                    {product.user}
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase">{product.category}</div>
                </div>
              </div>

              <div className="aspect-square bg-gray-50 relative overflow-hidden">
                <img src={product.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                <div className="absolute top-8 right-8 bg-white/95 backdrop-blur-md px-6 py-3 rounded-[24px] font-black text-blue-700 shadow-2xl text-xl">
                  {product.price.toLocaleString()} ₽
                </div>
              </div>

              <div className="p-10">
                <h3 className="font-black text-3xl text-gray-900 mb-4 leading-none">{product.title}</h3>
                <p className="text-base text-gray-500 leading-relaxed line-clamp-3 mb-8">{product.description}</p>
                <button className="w-full bg-gray-900 text-white py-6 rounded-[28px] font-black hover:bg-black transition-all shadow-2xl active:scale-95 uppercase tracking-widest text-[10px]">
                  Написать продавцу
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Нижняя навигация */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-3xl border-t border-gray-50 px-12 py-8 flex justify-between items-center max-w-2xl mx-auto rounded-t-[64px] shadow-2xl z-40">
        <button className="text-blue-600"><ShoppingBag className="w-9 h-9" /></button>
        <button className="text-gray-300"><Search className="w-9 h-9" /></button>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white p-6 rounded-[36px] -mt-20 shadow-2xl border-[8px] border-white hover:scale-110 active:rotate-12 transition-all"
        >
          <PlusCircle className="w-10 h-10" />
        </button>
        <button className="text-gray-300"><Heart className="w-9 h-9" /></button>
        <button onClick={() => setIsProfileOpen(true)} className="relative active:scale-110 transition-all">
          <div className={`p-1.5 rounded-3xl ${user ? 'bg-blue-50' : ''}`}>
            <User className={`w-9 h-9 ${user ? 'text-blue-600' : 'text-gray-300'}`} />
          </div>
        </button>
      </nav>

      {/* Окно создания */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-t-[64px] sm:rounded-[64px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500">
            <div className="p-10 border-b flex justify-between items-center">
              <span className="font-black text-[10px] uppercase tracking-[0.3em] text-gray-400">Добавить вещь</span>
              <button onClick={() => setIsModalOpen(false)} className="bg-white shadow-xl p-4 rounded-full"><X className="w-6 h-6 text-gray-500" /></button>
            </div>
            <div className="p-12 space-y-10 max-h-[75vh] overflow-y-auto no-scrollbar">
               <input 
                  type="text" 
                  placeholder="Название..." 
                  className="w-full text-4xl font-black outline-none border-b-8 border-gray-50 pb-4 focus:border-blue-500 transition-all"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />

              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Категория</label>
                  <select className="w-full bg-gray-50 p-6 rounded-[32px] font-black border border-gray-100" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                    <option value="Бег">🏃 Бег</option>
                    <option value="ВЕЛО">🚲 ВЕЛО</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Цена (₽)</label>
                  <input type="number" placeholder="0" className="w-full bg-gray-50 p-6 rounded-[32px] font-black border border-gray-100" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                </div>
              </div>

              <button onClick={handleAddPost} className="w-full bg-blue-600 text-white py-8 rounded-[36px] font-black text-2xl shadow-2xl active:scale-95 transition-all uppercase">
                Опубликовать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Окно профиля */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setIsProfileOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded-[56px] p-12 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-24 h-24 bg-blue-50 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Ghost className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tighter uppercase">Атлет</h2>
            <p className="text-gray-400 text-sm mb-10 font-bold tracking-widest uppercase">Гостевой доступ</p>
            <button onClick={() => setIsProfileOpen(false)} className="w-full bg-blue-600 text-white py-5 rounded-[28px] font-black uppercase text-xs tracking-[0.2em]">
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}