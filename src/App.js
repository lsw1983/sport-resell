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
 * ФИНАЛЬНАЯ ВЕРСИЯ ДЛЯ VERCEL
 * Без лишних системных переменных.
 */

// --- ШАГ 1: НАСТРОЙКА FIREBASE ---
// Скопируйте данные из Firebase Console -> Project Settings -> General -> Your Apps
const firebaseConfig = {
  apiKey: "ВАШ_API_KEY",
  authDomain: "ВАШ_PROJECT_ID.firebaseapp.com",
  projectId: "ВАШ_PROJECT_ID",
  storageBucket: "ВАШ_PROJECT_ID.appspot.com",
  messagingSenderId: "ВАШ_SENDER_ID",
  appId: "ВАШ_APP_ID"
};

// Проверка конфига перед инициализацией
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== "ВАШ_API_KEY";
const app = isConfigValid ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

const currentAppId = 'sport-resell-v1';

const MOCK_PRODUCTS = [
  {
    id: 'seed-1',
    user: "Marathoner",
    title: "Nike Alphafly NEXT% 2",
    category: "Бег",
    price: 18500,
    images: ["https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&q=80&w=800"],
    description: "Пробег 15 км. Не подошли. Состояние 5/5.",
    createdAt: Date.now() - 500000,
  },
  {
    id: 'seed-2',
    user: "Velo_Master",
    title: "Giro Aether Helmet",
    category: "ВЕЛО",
    price: 12000,
    images: ["https://images.unsplash.com/photo-1596435308018-774f76269661?auto=format&fit=crop&q=80&w=800"],
    description: "Топовый шлем, размер М. Использовал полсезона.",
    createdAt: Date.now() - 1000000
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Все");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("Бег");
  const [aiLoading, setAiLoading] = useState(false);

  const categories = ["Все", "Бег", "ВЕЛО"];

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        signInAnonymously(auth).catch(() => {});
      }
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

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
    }, (error) => console.error("Firestore error:", error));
    return () => unsubscribe();
  }, [user]);

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
    } catch (err) { console.error("Error:", err); }
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
              placeholder="Поиск..."
              className="w-full bg-gray-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none border-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto mt-6 px-4">
        {!isConfigValid && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-[24px] flex items-start gap-3 shadow-sm">
            <Info className="w-5 h-5 text-orange-600 shrink-0" />
            <p className="text-[11px] text-orange-800 font-bold leading-tight">
              Сайт готов! Чтобы заработала база данных, вставьте ключи из Firebase Console в src/App.js.
            </p>
          </div>
        )}

        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                selectedCategory === cat 
                ? "bg-blue-600 text-white shadow-xl" 
                : "bg-white text-gray-500 border border-gray-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

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
                  Связаться
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-3xl border-t border-gray-100 px-12 py-8 flex justify-between items-center max-w-2xl mx-auto rounded-t-[64px] shadow-2xl z-40">
        <button className="text-blue-600 active:scale-125 transition-all"><ShoppingBag className="w-9 h-9" /></button>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-t-[64px] sm:rounded-[64px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500">
            <div className="p-10 border-b flex justify-between items-center bg-gray-50/30">
              <span className="font-black text-[10px] uppercase tracking-[0.3em] text-gray-400">Новое объявление</span>
              <button onClick={() => setIsModalOpen(false)} className="bg-white shadow-xl p-4 rounded-full"><X className="w-6 h-6 text-gray-500" /></button>
            </div>
            <div className="p-12 space-y-10 max-h-[75vh] overflow-y-auto no-scrollbar">
               <input 
                  type="text" 
                  placeholder="Название модели..." 
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
                  <input type="number" placeholder="0" className="w-full bg-gray-50 p-6 rounded-[32px] font-black border border-gray-100 outline-none" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                </div>
              </div>

              <button onClick={handleAddPost} className="w-full bg-blue-600 text-white py-8 rounded-[36px] font-black text-2xl shadow-2xl active:scale-95 transition-all uppercase tracking-tight">
                Опубликовать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}