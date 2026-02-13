import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, PlusCircle, ShoppingBag, Heart, User, X, 
  Sparkles, Loader2, DollarSign, Bike, Camera, 
  ShieldCheck, Lightbulb, MessageSquare, Ghost, Info
} from 'lucide-react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  doc, 
  setDoc 
} from 'firebase/firestore';

/**
 * PRODUCTION VERSION: Sport-Resell
 * Prepared for hosting deployment.
 */

// Use empty strings if environment variables are not yet set
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'sport-resell-prod';

// Seed Data
const MOCK_PRODUCTS = [
  {
    id: 'seed-1',
    user: "Marathoner_92",
    title: "Nike Air Zoom Alphafly NEXT% 2",
    category: "Бег",
    price: 18500,
    images: ["https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&q=80&w=800"],
    description: "Mileage only 15 km. Did not fit the last. Original. Size 43 EU.",
    createdAt: Date.now() - 100000,
    qna: "Q: For narrow feet?\nA: Yes, fits tight."
  },
  {
    id: 'seed-2',
    user: "Velo_Pro",
    title: "Giro Aether Helmet",
    category: "ВЕЛО",
    price: 12000,
    images: ["https://images.unsplash.com/photo-1596435308018-774f76269661?auto=format&fit=crop&q=80&w=800"],
    description: "Top helmet, size M. Like new condition.",
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
  
  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("Бег");
  const [newImages, setNewImages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTips, setAiTips] = useState(""); 
  const [aiQna, setAiQna] = useState("");   

  const categories = ["Все", "Бег", "ВЕЛО"];
  const apiKey = ""; // API key provided by environment

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const dbItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prev => {
        const combined = [...dbItems, ...MOCK_PRODUCTS];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        return unique.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      });
    }, (error) => {
      console.error("Firestore error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // AI Logic
  const callGemini = async (prompt, systemPrompt = "") => {
    setAiLoading(true);
    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] }
          })
        });
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        setAiLoading(false);
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (err) {
        if (i === 4) { setAiLoading(false); return null; }
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  };

  const handleImproveTitle = async () => {
    if (!newTitle) return;
    const res = await callGemini(`Improve this title for selling: "${newTitle}"`, "Marketing expert.");
    if (res) setNewTitle(res.trim().replace(/^"|"$/g, ''));
  };

  const handleGenerateDescription = async () => {
    if (!newTitle) return;
    const res = await callGemini(`Write Instagram-style description for: ${newTitle}`, "Sport copywriter.");
    if (res) setNewDesc(res.trim());
  };

  const handleEstimatePrice = async () => {
    if (!newTitle) return;
    const res = await callGemini(`Used price in RUB for: ${newTitle}. Number only.`, "Valuator.");
    if (res) {
      const match = res.match(/\d+/);
      if (match) setNewPrice(match[0]);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (newImages.length + files.length > 10) return;
    const filePreviews = files.map(file => ({ file, url: URL.createObjectURL(file) }));
    setNewImages([...newImages, ...filePreviews]);
  };

  const handleAddPost = async () => {
    if (!user || !newTitle || !newPrice) return;
    try {
      const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
      await addDoc(productsRef, {
        userId: user.uid,
        user: "Athlete #" + user.uid.slice(-4),
        title: newTitle,
        category: newCategory,
        price: parseInt(newPrice),
        images: newImages.length > 0 ? newImages.map(img => img.url) : ["https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800"],
        description: newDesc,
        createdAt: Date.now(),
        qna: aiQna || ""
      });
      setIsModalOpen(false);
      setNewTitle(""); setNewDesc(""); setNewPrice(""); setNewImages([]);
    } catch (err) {
      console.error("Add error:", err);
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
              placeholder="Search..."
              className="w-full bg-gray-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all border-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto mt-6 px-4">
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

        <div className="space-y-12">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-[48px] overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl transition-all duration-500">
              <div className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 flex items-center justify-center font-black text-blue-600 text-lg">
                  {product.user?.[0]}
                </div>
                <div className="flex-1">
                  <div className="font-black text-base text-gray-900 flex items-center gap-2">
                    {product.user}
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{product.category}</div>
                </div>
              </div>

              <div className="aspect-square bg-gray-50 relative overflow-hidden">
                <img src={product.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={product.title} />
                <div className="absolute top-8 right-8 bg-white/95 backdrop-blur-md px-6 py-3 rounded-[24px] font-black text-blue-700 shadow-2xl border border-white/50 text-xl">
                  {product.price.toLocaleString()} ₽
                </div>
              </div>

              <div className="p-10">
                <h3 className="font-black text-3xl text-gray-900 mb-4 leading-none tracking-tight">{product.title}</h3>
                <p className="text-base text-gray-500 leading-relaxed line-clamp-3 mb-8">{product.description}</p>
                
                {product.qna && (
                  <div className="mb-8 bg-gray-50 p-6 rounded-[32px] border border-gray-100">
                    <div className="text-[10px] font-black text-blue-600 uppercase mb-3 flex items-center gap-2">
                      <MessageSquare className="w-3 h-3" /> Quick AI Info
                    </div>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed italic">{product.qna}</p>
                  </div>
                )}

                <button className="w-full bg-gray-900 text-white py-6 rounded-[28px] font-black hover:bg-black transition-all shadow-2xl active:scale-95 uppercase tracking-[0.2em] text-[10px]">
                  Contact Owner
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-3xl border-t border-gray-50 px-12 py-8 flex justify-between items-center max-w-2xl mx-auto rounded-t-[64px] shadow-2xl z-40">
        <button className="text-blue-600 active:scale-125 transition-all"><ShoppingBag className="w-9 h-9" /></button>
        <button className="text-gray-300"><Search className="w-9 h-9" /></button>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white p-6 rounded-[36px] -mt-20 shadow-2xl border-[8px] border-white hover:scale-110 active:rotate-12 transition-all group"
        >
          <PlusCircle className="w-10 h-10 group-hover:rotate-90 transition-all" />
        </button>
        
        <button className="text-gray-300"><Heart className="w-9 h-9" /></button>
        
        <button onClick={() => setIsProfileOpen(true)} className="relative active:scale-110 transition-all">
          <div className={`p-1.5 rounded-3xl ${user ? 'bg-blue-50' : ''}`}>
            <User className={`w-9 h-9 ${user ? 'text-blue-600' : 'text-gray-300'}`} />
          </div>
        </button>
      </nav>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-t-[64px] sm:rounded-[64px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500">
            <div className="p-10 border-b flex justify-between items-center bg-gray-50/30">
              <span className="font-black text-[10px] uppercase tracking-[0.3em] text-gray-400">New Listing</span>
              <button onClick={() => setIsModalOpen(false)} className="bg-white shadow-xl p-4 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-12 space-y-10 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {newImages.map((img, idx) => (
                  <div key={idx} className="w-28 h-28 shrink-0 relative rounded-[32px] overflow-hidden border-4 border-white">
                    <img src={img.url} className="w-full h-full object-cover" alt="" />
                  </div>
                ))}
                {newImages.length < 10 && (
                  <label className="w-28 h-28 shrink-0 border-4 border-dashed border-gray-100 rounded-[32px] flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-all">
                    <Camera className="w-8 h-8 text-gray-200" />
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>

              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Item name..." 
                  className="w-full text-4xl font-black outline-none border-b-8 border-gray-50 pb-4 focus:border-blue-500 transition-all pr-16"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <button onClick={handleImproveTitle} className="absolute right-0 top-0 text-blue-600 p-3">
                  <Sparkles className="w-8 h-8" />
                </button>
              </div>

              <button onClick={handleAddPost} className="w-full bg-blue-600 text-white py-8 rounded-[36px] font-black text-2xl shadow-2xl active:scale-95 transition-all uppercase tracking-tight">
                Post Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}