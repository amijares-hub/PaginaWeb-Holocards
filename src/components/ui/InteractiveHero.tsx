"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { 
  ShoppingCart, 
  ArrowRight, 
  Star, 
  RotateCcw, 
  X, 
  Truck,
  ShieldCheck,
  Award,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Lock
} from "lucide-react"
import { useCartStore } from "../../lib/cartStore"
import { Toast } from "./Toast"
import { getRealPrice } from "../../lib/utils"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"

type ProductCard = { 
  id: string; 
  imgUrl: string;
  extraImages: string[];
  name: string; 
  description: string;
  set: string;
  gameId?: string;
  rating: number;
  price: number;
  category: string;
  categoriesList: string[]; 
  rawCategory: any; 
  collection?: string;
  collectionIds: string[];
  collectionsList: string[];
  sku?: string;
}

type CollectionDb = {
  id: string;
  name: string;
}

const TAB_LOGOS: Record<string, string> = {
  "Pokémon TCG": "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logo%20TCGs/TCG%20LOGO%20FONDO%20AZUL.png",
  "Magic The Gathering": "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logo%20TCGs/magic-logo.webp",
  "One Piece TCG": "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logo%20TCGs/onepiece.png"
}

const sloganMap: Record<string, { main: string; sub: string }> = {
  "Pokémon TCG": { main: "Entrena a tus Pokémon", sub: "Y adéntrate al combate" },
  "Magic The Gathering": { main: "Aniquila a tus rivales", sub: "Y sé parte del mundo de MTG" },
  "One Piece TCG": { main: "A por el One PIECE", sub: "Reúne a tu equipo y batalla" },
  "Accesorios": { main: "Todo lo que necesitas", sub: "Para tus juegos TCG" },
}

const FEATURES = [
  { iconUrl: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Recurso%2011.png", title: "100% Seguro", description: "Transacciones protegidas" },
  { iconUrl: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Recurso%2013.png", title: "Calidad Asegurada", description: "Productos originales" },
  { iconUrl: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Envios.png", title: "Envíos solo a Canarias", description: "Rápido y sin aduanas sorpresa" },
  { iconUrl: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Recurso%2025.png", title: "Sin Dropshipping", description: "Stock muy cerca de ti" }
]

const tabs = ["Pokémon TCG", "Magic The Gathering", "One Piece TCG", "Accesorios"]

interface InteractiveHeroProps {
  isHomePage?: boolean;
  onFranchiseTabClick?: () => void;
}

const normalizeText = (text: string = "") => {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const findValueByKeywords = (obj: any, keywords: string[]) => {
  if (!obj || typeof obj !== 'object') return null;
  const keys = Object.keys(obj);
  for (let key of keys) {
    const normalizedKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (keywords.some(kw => normalizedKey.includes(kw))) {
      return obj[key];
    }
  }
  return null;
};

export function InteractiveHero({ isHomePage = true, onFranchiseTabClick }: InteractiveHeroProps) {
  const [activeTab, setActiveTab] = useState<string>(isHomePage ? "HomePageMode" : tabs[0])
  const [activeProduct, setActiveProduct] = useState<(ProductCard & { uniqueId: string }) | null>(null)
  const [isModalFlipped, setIsModalFlipped] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const [dbProducts, setDbProducts] = useState<ProductCard[]>([])
  const [dbCollections, setDbCollections] = useState<CollectionDb[]>([])
  const [dbGames, setDbGames] = useState<any[]>([])

  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("")
  const [highlightType, setHighlightType] = useState<string>("")
  const [isHighlightDropdownOpen, setIsHighlightDropdownOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("Todos")

  const [carouselPage, setCarouselPage] = useState(0)

  const addItem = useCartStore((state) => state.addItem)
  const navigate = useNavigate()
  const isInicioQuirurgico = activeTab === "HomePageMode";

  useEffect(() => {
    if (isHomePage) {
      setActiveTab("HomePageMode");
      setSelectedCategory("Todos");
    } else if (activeTab === "HomePageMode") {
      setActiveTab(tabs[0]);
      setSelectedCategory("Todos");
    }
  }, [isHomePage]);

  useEffect(() => {
    setCarouselPage(0);
  }, [activeTab, selectedCategory, highlightType, selectedCollectionId]);

  const fetchBackendData = async () => {
    try {
      if (!supabase) return;

      const { data: cols, error: colError } = await supabase.from('tags').select('*');
      let collectionsList: CollectionDb[] = [];

      if (!colError && cols && cols.length > 0) {
        collectionsList = cols.map((c: any) => ({
          id: String(c.id),
          name: String(c.name || c.nombre || c.title || "Colección").toUpperCase()
        }));
        setDbCollections(collectionsList);

        if (!selectedCollectionId || !collectionsList.some(c => c.id === selectedCollectionId)) {
          setSelectedCollectionId(collectionsList[0].id);
          setHighlightType(collectionsList[0].name);
        }
      }

      const [prodsRes, catRes, gamesRes, prodColsRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('categories').select('*, games(name)'),
        supabase.from('games').select('*'),
        supabase.from('product_tags').select('*').then(res => res.error ? { data: [] } : res)
      ]);

      const prods = prodsRes.data || [];
      const dbCategories = catRes.data || [];
      const gamesList = gamesRes.data || [];
      const prodColsPivot = prodColsRes.data || [];
      setDbGames(gamesList);

      const collectionIdToName = new Map<string, string>();
      collectionsList.forEach(c => collectionIdToName.set(c.id, c.name));

      const prodToColIdsMap = new Map<string, Set<string>>();
      const prodToColNamesMap = new Map<string, Set<string>>();

      prodColsPivot.forEach((pc: any) => {
        const pId = String(pc.product_id);
        const cId = String(pc.tag_id);

        if (!prodToColIdsMap.has(pId)) prodToColIdsMap.set(pId, new Set());
        prodToColIdsMap.get(pId)!.add(cId);

        if (collectionIdToName.has(cId)) {
          if (!prodToColNamesMap.has(pId)) prodToColNamesMap.set(pId, new Set());
          prodToColNamesMap.get(pId)!.add(collectionIdToName.get(cId)!);
        }
      });

      const categoryIdToName = new Map<string, string>();
      dbCategories.forEach((cat: any) => {
        if (cat.id && cat.name) {
          categoryIdToName.set(cat.id, cat.name);
        }
      });

      let formattedProducts = prods.map((p: any) => {
        let rawImg = findValueByKeywords(p, ["imag", "img", "portad", "thumb", "foto", "pic", "image_url"]);
        let finalImg = rawImg || "";
        if (Array.isArray(finalImg)) finalImg = finalImg[0];
        if (typeof finalImg === 'object' && finalImg !== null) finalImg = Object.values(finalImg)[0];

        const extractedCategories = new Set<string>();
        if (p.category_id && categoryIdToName.has(p.category_id)) {
          const resolvedName = categoryIdToName.get(p.category_id)!;
          if (resolvedName.toUpperCase() !== "GENERAL") {
            extractedCategories.add(resolvedName);
          }
        }

        if (extractedCategories.size === 0) {
          let rawCat = findValueByKeywords(p, ["categor", "tag", "taxonom", "tipo", "label"]);
          const parseItem = (item: any) => {
            if (!item) return;
            if (typeof item === 'string') {
              if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(item)) return;
              item.split(',').forEach((sub: string) => {
                const clean = sub.trim();
                if (clean && clean.toUpperCase() !== "GENERAL") extractedCategories.add(clean);
              });
            } else if (typeof item === 'object' && item !== null) {
              const name = item.name || item.nombre || item.label || item.value || Object.values(item)[0];
              if (name && typeof name === 'string') {
                name.split(',').forEach((sub: string) => {
                  const clean = sub.trim();
                  if (clean && clean.toUpperCase() !== "GENERAL") extractedCategories.add(clean);
                });
              }
            }
          };

          if (Array.isArray(rawCat)) rawCat.forEach(parseItem);
          else parseItem(rawCat);
        }

        const catArray = Array.from(extractedCategories);
        const extractedColIds = prodToColIdsMap.get(String(p.id)) || new Set<string>();
        const extractedColNames = prodToColNamesMap.get(String(p.id)) || new Set<string>();

        if (p.collection_id) {
          extractedColIds.add(String(p.collection_id));
          if (collectionIdToName.has(String(p.collection_id))) {
            extractedColNames.add(collectionIdToName.get(String(p.collection_id))!);
          }
        }

        let rawColField = findValueByKeywords(p, ["collect", "coleccion", "tags", "etiqueta", "destacado"]);
        const parseColItem = (item: any) => {
          if (!item) return;
          if (typeof item === 'string') {
            item.split(',').forEach(sub => {
              const clean = sub.trim();
              if (clean) extractedColNames.add(clean.toUpperCase());
            });
          } else if (typeof item === 'object' && item !== null) {
            const name = item.name || item.nombre || item.label || item.value;
            if (name && typeof name === 'string') extractedColNames.add(name.trim().toUpperCase());
          }
        };

        if (Array.isArray(rawColField)) rawColField.forEach(parseColItem);
        else parseColItem(rawColField);

        const colArray = Array.from(extractedColNames);
        let rawSet = findValueByKeywords(p, ["franchis", "franquici", "brand", "marca", "juego", "linea", "set"]) || "";

        const extraImgs: string[] = [];
        const addIfNew = (img: any) => {
          if (img && typeof img === 'string' && img !== finalImg && !extraImgs.includes(img)) extraImgs.push(img);
        };
        if (Array.isArray(p.top_hits_images)) p.top_hits_images.forEach(addIfNew);
        else if (Array.isArray(p.images)) p.images.forEach(addIfNew);
        else if (Array.isArray(p.gallery)) p.gallery.forEach(addIfNew);

        return {
          id: String(p.id),
          imgUrl: finalImg,
          extraImages: extraImgs,
          name: p.name || p.title || p.producto || "Producto TCG",
          description: p.description || p.details || "",
          set: typeof rawSet === 'string' ? rawSet : JSON.stringify(rawSet),
          gameId: p.game_id || p.gameId || null,
          rating: p.rating || 5.0,
          price: Number(getRealPrice(p)) || 0,
          category: catArray[0] || "",
          categoriesList: catArray,
          rawCategory: catArray[0] || null,
          collection: colArray[0] || "",
          collectionIds: Array.from(extractedColIds),
          collectionsList: colArray,
          sku: p.sku || ""
        };
      });

      setDbProducts(formattedProducts);
    } catch (error) {
      console.error("Error procesando datos del backend:", error);
      setDbProducts([]);
    }
  };

  useEffect(() => {
    fetchBackendData();

    if (!supabase) return;

    const channel = supabase
      .channel('realtime-hero-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchBackendData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, () => fetchBackendData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_tags' }, () => fetchBackendData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isHomePage]);

  const dynamicCategories = useMemo(() => {
    if (isHomePage) return ["Todos"];

    const currentGame = dbGames.find((g: any) => {
      const gName = normalizeText(g.name);
      const tabNorm = normalizeText(activeTab);
      return gName.includes(tabNorm) || tabNorm.includes(gName);
    });

    const keywordMap: Record<string, string[]> = {
      "Pokémon TCG": ["poke", "pokémon", "pokemon"],
      "Magic The Gathering": ["magic", "mtg", "gathering"],
      "One Piece TCG": ["piece", "one piece", "op"],
      "Accesorios": ["acces", "fundas", "sleeves", "deckbox", "carpetas", "binder", "toploader"]
    };

    const currentFranchiseKeywords = keywordMap[activeTab] || ["poke"];

    const franchiseCards = dbProducts.filter(card => {
      if (currentGame && card.gameId === currentGame.id) return true;
      const prodDataStr = normalizeText(`${card.set} ${card.sku} ${card.category} ${card.categoriesList.join(" ")} ${JSON.stringify(card.rawCategory)}`);
      return currentFranchiseKeywords.some(kw => prodDataStr.includes(kw));
    });

    const catSet = new Set<string>();
    franchiseCards.forEach(p => {
      p.categoriesList.forEach(c => {
        if (c && c.trim() !== "" && c.trim().toUpperCase() !== "GENERAL") {
          catSet.add(c.trim());
        }
      });
    });

    return ["Todos", ...Array.from(catSet).sort()];
  }, [isHomePage, activeTab, dbGames, dbProducts]);

  const currentCards = useMemo(() => {
    let cards = dbProducts;

    if (isHomePage) {
      if (!selectedCollectionId && !highlightType) return [];

      const targetColNorm = normalizeText(highlightType);

      let filtered = cards.filter(p => {
        const matchesId = selectedCollectionId && p.collectionIds.includes(selectedCollectionId);
        if (matchesId) return true;

        const matchesName = p.collectionsList.some(colName => {
          const colNorm = normalizeText(colName);
          return colNorm === targetColNorm || colNorm.includes(targetColNorm) || targetColNorm.includes(colNorm);
        });
        if (matchesName) return true;

        const fullProdStr = normalizeText(`${p.name} ${p.description} ${p.collection} ${JSON.stringify(p.collectionsList)}`);
        return fullProdStr.includes(targetColNorm);
      });

      if (filtered.length === 0) {
        return cards;
      }

      return filtered;
    }

    const currentGame = dbGames.find((g: any) => {
      const gName = normalizeText(g.name);
      const tabNorm = normalizeText(activeTab);
      return gName.includes(tabNorm) || tabNorm.includes(gName);
    });

    const keywordMap: Record<string, string[]> = {
      "Pokémon TCG": ["poke", "pokémon", "pokemon"],
      "Magic The Gathering": ["magic", "mtg", "gathering"],
      "One Piece TCG": ["piece", "one piece", "op"],
      "Accesorios": ["acces", "fundas", "sleeves", "deckbox", "carpetas", "binder", "toploader"]
    };

    const currentFranchiseKeywords = keywordMap[activeTab] || ["poke"];

    cards = cards.filter(card => {
      if (currentGame && card.gameId === currentGame.id) return true;

      const prodDataStr = normalizeText(`${card.set} ${card.sku} ${card.category} ${card.categoriesList.join(" ")} ${JSON.stringify(card.rawCategory)}`);
      return currentFranchiseKeywords.some(kw => prodDataStr.includes(kw));
    });

    if (selectedCategory !== "Todos") {
      const selNorm = normalizeText(selectedCategory);

      cards = cards.filter(card => {
        return card.categoriesList.some(c => normalizeText(c) === selNorm);
      });
    }

    return cards;
  }, [selectedCategory, activeTab, isHomePage, highlightType, selectedCollectionId, dbProducts, dbGames]);

  const visibleCards = useMemo(() => {
    const startIndex = carouselPage * 4;
    return currentCards.slice(startIndex, startIndex + 4);
  }, [currentCards, carouselPage]);

  const maxPages = Math.ceil(currentCards.length / 4);

  const handleNextPage = () => {
    if (carouselPage < maxPages - 1) {
      setCarouselPage(prev => prev + 1);
    } else {
      setCarouselPage(0);
    }
  };

  const handlePrevPage = () => {
    if (carouselPage > 0) {
      setCarouselPage(prev => prev - 1);
    } else {
      setCarouselPage(Math.max(0, maxPages - 1));
    }
  };

  const closeModal = () => {
    setActiveProduct(null);
    setSelectedImageIndex(0);
    setTimeout(() => setIsModalFlipped(false), 300);
  };

  const allProductImages = useMemo(() => {
    if (!activeProduct) return [];
    const imgs: string[] = [];
    if (activeProduct.imgUrl) imgs.push(activeProduct.imgUrl);
    activeProduct.extraImages.forEach(img => { if (!imgs.includes(img)) imgs.push(img); });
    return imgs;
  }, [activeProduct]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [activeProduct?.id]);

  const handleAddToCart = (card: ProductCard) => {
    const cardPrice = Number(card.price) || 0;
    addItem({
      id: card.id, name: card.name, price: cardPrice,
      image_url: card.imgUrl, rarity: card.category || card.categoriesList[0] || 'Rare', set: card.set, stock: 10
    }, 1);
    setShowToast(true);
  };

  const handleTabClick = (tab: string) => {
    if (tab === "One Piece TCG") return;
    setActiveTab(tab);
    setSelectedCategory("Todos");
    if (onFranchiseTabClick) {
      onFranchiseTabClick();
    }
  };

  const currentSlogan = sloganMap[activeTab] || sloganMap["Pokémon TCG"]

  const renderTabs = () => {
    return tabs.map((tab) => {
      const hasLogo = Boolean(TAB_LOGOS[tab]);
      const isSelected = activeTab === tab;
      const isOnePiece = tab === "One Piece TCG";

      return (
        <div key={tab} className="relative flex flex-col items-center group">
          {isOnePiece && (
            <div className="absolute bottom-[100%] mb-1.5 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex justify-center w-full min-w-max">
              <span className="bg-yellow-400/90 backdrop-blur-sm text-black text-[9px] sm:text-[10px] font-black uppercase tracking-tight py-0.5 px-2.5 rounded-full text-center shadow-[0_4px_15px_rgba(250,204,21,0.5)] whitespace-nowrap flex items-center gap-1">
                <Lock className="w-2.5 h-2.5"/> PROXIMAMENTE
              </span>
            </div>
          )}

          <button
            onClick={() => handleTabClick(tab)}
            disabled={isOnePiece}
            className={`relative px-4 sm:px-6 md:px-7 h-[38px] sm:h-[46px] md:h-[52px] rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all duration-200 flex items-center justify-center ${
              isOnePiece
                ? "opacity-75 cursor-not-allowed bg-black/50 border border-white/10"
                : isSelected 
                ? "text-black translate-y-[4px]" 
                : "bg-gradient-to-b from-[#1c2e4a] to-[#0a1222] border border-[#2c446b] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_0_#02040a,0_6px_10px_rgba(0,0,0,0.6)] text-gray-300 hover:text-white hover:brightness-110 active:translate-y-[4px]"
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="active-tab-bg"
                className="absolute inset-0 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-full shadow-[inset_0_3px_6px_rgba(0,0,0,0.3),0_0_15px_rgba(250,204,21,0.6)] border border-yellow-200"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            
            <span className="relative z-10 flex items-center justify-center w-full h-full">
              {hasLogo ? (
                <img 
                  src={TAB_LOGOS[tab]} 
                  alt={tab} 
                  className={`w-auto object-contain transition-all duration-300 ${
                    tab === "Pokémon TCG" ? "h-[29px] sm:h-[34px] md:h-[38px]" : 
                    tab === "Magic The Gathering" ? "h-[16px] sm:h-[20px] md:h-[23px]" : 
                    tab === "One Piece TCG" ? "h-[34px] sm:h-[41px] md:h-[46px] max-w-[140px] sm:max-w-[190px] scale-135 brightness-125" : "h-6" 
                  } ${
                    isSelected 
                      ? "brightness-100 filter-none drop-shadow-md" 
                      : "brightness-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:brightness-125"
                  }`}
                />
              ) : (
                <span className={`text-[11px] sm:text-sm md:text-base font-black tracking-tight whitespace-nowrap ${
                  isSelected ? "" : "drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]"
                }`}>
                  {tab}
                </span>
              )}
            </span>
          </button>
        </div>
      );
    });
  };

  return (
    <div className={`w-full flex flex-col relative overflow-hidden ${isInicioQuirurgico ? 'py-1 gap-1 flex-1' : 'h-[calc(100vh-80px)] min-h-[550px] py-1'}`}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <img 
        src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Fondos/Fondo.webp"
        alt="Fondo Holocards"
        className="absolute inset-0 w-full h-full object-cover opacity-40 z-0 pointer-events-none mix-blend-screen"
      />

      {isInicioQuirurgico ? (
        <div className="relative z-20 w-full px-4 sm:px-12 mt-3 lg:mt-4 flex flex-col gap-1 transition-all">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-2 w-full">
            <div className="flex items-center justify-center xl:justify-start w-full xl:w-auto xl:flex-1 min-w-0 z-40">
              <div className="relative">
                <button 
                  onClick={() => setIsHighlightDropdownOpen(!isHighlightDropdownOpen)}
                  className="flex items-center gap-2 text-white hover:text-yellow-400 transition-colors group"
                >
                  <Sparkles className="w-5 h-5 text-yellow-400"/>
                  <h2 className="text-base sm:text-lg lg:text-xl font-black uppercase tracking-tight m-0 leading-none whitespace-nowrap">
                    {highlightType || "SELECCIONAR COLECCIÓN"}
                  </h2>
                  <ChevronDown className={`w-4 h-4 text-gray-400 group-hover:text-yellow-400 transition-transform ${isHighlightDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isHighlightDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 mt-3 w-64 bg-[#0a1628]/95 backdrop-blur-xl border border-yellow-400/50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden z-50 flex flex-col"
                    >
                      {dbCollections.map((col) => (
                        <button
                          key={col.id}
                          onClick={() => {
                            setSelectedCollectionId(col.id);
                            setHighlightType(col.name);
                            setIsHighlightDropdownOpen(false);
                          }}
                          className={`text-left px-4 py-3 text-sm font-bold transition-colors border-b last:border-0 border-white/5 uppercase tracking-wider ${
                            highlightType === col.name ? "text-yellow-400 bg-white/5" : "text-gray-300 hover:bg-yellow-400/10 hover:text-yellow-300"
                          }`}
                        >
                          {col.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex justify-center shrink-0 z-30 w-full xl:w-auto mt-2 xl:mt-0">
              <div className="flex flex-wrap sm:flex-nowrap justify-center items-center gap-3 sm:gap-4 p-2 relative">
                {renderTabs()}
              </div>
            </div>

            <div className="hidden xl:flex xl:flex-1 min-w-0 justify-end items-center pr-4 xl:pr-8 z-30 pointer-events-none">
              <motion.img
                src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Iso%20Transparente.png"
                alt="HoloCards Iso"
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="h-[84px] xl:h-[120px] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-20 w-full px-4 sm:px-12 mt-4 lg:mt-6 flex flex-col gap-4 lg:gap-6 transition-all">

          {/* Botonera de Franquicias: order-1 en móvil (aparece arriba), order-2 en desktop */}
          <div className="order-1 sm:order-2 flex justify-center shrink-0 z-30 w-full">
            <div className="flex flex-wrap sm:flex-nowrap justify-center items-center gap-3 sm:gap-4 p-2 relative">
              {renderTabs()}
            </div>
          </div>

          {/* Título DESTACADOS: order-2 en móvil (aparece debajo de franquicias), order-1 en desktop */}
          <div className="order-2 sm:order-1 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
            <h2 className="text-sm sm:text-xl font-black uppercase tracking-wider text-yellow-400 italic m-0 leading-none">
              DESTACADOS
            </h2>
          </div>

          {/* Categorías: siempre al final */}
          <div className="order-3 flex justify-center w-full z-30 relative">
            <div className="flex items-center justify-start lg:justify-center gap-2 overflow-x-auto hide-scrollbar w-full px-4 sm:px-10 py-1 scroll-smooth">
              {dynamicCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 border ${
                    selectedCategory === cat
                      ? "bg-white/10 text-white border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                      : "bg-transparent text-gray-400 hover:text-white border-white/5 hover:border-white/20"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Decorative Arts */}
      <img
        src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Carta%20y%20Pikachu.png"
        alt=""
        aria-hidden="true"
        className="absolute left-2 xl:left-6 top-1/2 -translate-y-1/2 z-0 hidden xl:block w-auto max-h-[198px] xl:max-h-[242px] 2xl:max-h-[286px] object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] opacity-50 pointer-events-none select-none transition-all duration-300"
      />
      <img
        src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Matgic.png"
        alt=""
        aria-hidden="true"
        className="absolute right-2 xl:right-6 top-1/2 -translate-y-1/2 z-0 hidden xl:block w-auto max-h-[198px] xl:max-h-[242px] 2xl:max-h-[286px] object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] opacity-50 pointer-events-none select-none transition-all duration-300"
      />

      <div className="relative w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-12 xl:px-16 z-20 my-1 flex items-center justify-center flex-1 overflow-x-hidden">
        <button
          type="button"
          onClick={handlePrevPage}
          className="absolute -left-2 md:left-2 top-1/2 -translate-y-1/2 p-2 transition-transform hover:scale-110 drop-shadow-[0_0_12px_rgba(243,185,28,0.6)] focus:outline-none shrink-0 z-40 active:scale-95 group"
          title="Anterior"
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M15 19L8 12L15 5" 
              stroke="#F3B91C" 
              strokeWidth="4.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </svg>
        </button>

        <div className="w-full flex justify-center items-center py-2">
          <AnimatePresence mode="wait">
            <motion.div 
              key={`${activeTab}-${selectedCategory}-${carouselPage}-${highlightType}-${selectedCollectionId}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center gap-3 sm:gap-4 md:gap-5 lg:gap-6 w-full"
            >
              {visibleCards.length > 0 ? (
                visibleCards.map((card, index) => {
                  const uniqueId = `${card.id}-${index}-${carouselPage}`;
                  const cardPrice = Number(card.price) || 0;
                  
                  return (
                    <div 
                      key={uniqueId} 
                      className="flex flex-col w-[157px] sm:w-[178px] md:w-[194px] xl:w-[231px] shrink-0 bg-[#0a1628]/85 backdrop-blur-md rounded-2xl border border-white/10 p-2 hover:border-yellow-400/60 hover:bg-[#0a1628]/95 transition-all duration-300 group shadow-2xl"
                    >
                      <motion.div 
                        layoutId={`hero-product-image-${uniqueId}`}
                        onClick={() => {
                          setIsModalFlipped(false);
                          setActiveProduct({ ...card, uniqueId });
                        }}
                        className="w-full h-24 sm:h-28 md:h-32 xl:h-36 bg-transparent relative shrink-0 cursor-zoom-in p-1 flex items-center justify-center border-[1.5px] border-[#F3B91C]/40 rounded-xl overflow-hidden"
                      >
                        {card.imgUrl ? (
                          <img 
                            src={card.imgUrl} 
                            alt={card.name} 
                            className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-110 transition-all duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-transparent rounded-xl border border-white/5">
                            <span className="text-gray-600 font-black text-[10px] uppercase text-center px-2">Sin Imagen</span>
                          </div>
                        )}
                      </motion.div>

                      <div className="mt-2 flex-grow flex flex-col justify-start">
                        <h3 className="text-white font-bold text-xs sm:text-sm leading-tight group-hover:text-yellow-400 transition-colors line-clamp-1">
                          {card.name}
                        </h3>
                        
                        <p className="text-yellow-400 font-black text-sm sm:text-base mt-1.5 leading-none">
                          {cardPrice > 0 ? `${cardPrice.toFixed(2)}€` : "Consultar precio"}
                        </p>
                      </div>

                      <div className="mt-3 w-full flex flex-col gap-1.5 shrink-0">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleAddToCart(card); 
                          }}
                          className="w-full bg-yellow-400 hover:bg-blue-600 text-black hover:text-white font-bold py-1.5 rounded-lg text-[10px] sm:text-[11px] flex items-center justify-center gap-1.5 transition-colors duration-300 active:scale-95 shadow-[0_0_10px_rgba(250,204,21,0.2)] uppercase tracking-wider"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> 
                          AGREGAR
                        </button>

                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            navigate('/catalogo');
                          }}
                          className="w-full bg-[#1c2e4a] hover:bg-white text-white hover:text-black border border-[#2c446b] font-bold py-1.5 rounded-lg text-[10px] sm:text-[11px] flex items-center justify-center transition-colors duration-300 active:scale-95 uppercase tracking-wider shadow-inner"
                        >
                          VER CATÁLOGO
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="w-full py-12 flex flex-col items-center justify-center text-gray-500">
                  <LayoutGrid className="w-10 h-10 mb-2 opacity-30"/>
                  <p className="font-bold tracking-widest uppercase text-xs text-center">Cargando productos...</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={handleNextPage}
          className="absolute -right-2 md:right-2 top-1/2 -translate-y-1/2 p-2 transition-transform hover:scale-110 drop-shadow-[0_0_12px_rgba(243,185,28,0.6)] focus:outline-none shrink-0 z-40 active:scale-95 group"
          title="Siguiente"
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M9 5L16 12L9 19" 
              stroke="#F3B91C" 
              strokeWidth="4.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </svg>
        </button>
      </div>

      {!isInicioQuirurgico && (
        <motion.div 
          key={activeTab} 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 text-center mt-3 mb-4 px-4 shrink-0"
        >
          <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight uppercase relative">
            <span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(250,204,21,0.3)] block">
              {currentSlogan.main}
            </span>
            <span className="text-white block">
              {currentSlogan.sub}
            </span>
          </h1>
        </motion.div>
      )}

      {isInicioQuirurgico && (
        <div className="relative z-20 w-screen px-4 md:px-12 my-1 pb-1">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 p-3 md:p-4 bg-[#0a1628]/70 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl divide-y md:divide-y-0 md:divide-x divide-white/10">
            {FEATURES.map((item, index) => {
              return (
                <div 
                  key={index} 
                  className={`flex items-center gap-3 md:gap-4 p-2 md:p-3 ${index !== 0 ? 'pt-3 md:pt-2' : ''}`}
                >
                  <div className="p-1 rounded-xl bg-white/5 border border-white/10 shrink-0">
                    <img 
                      src={item.iconUrl} 
                      alt={item.title} 
                      className="w-10 h-10 md:w-12 md:h-12 object-contain p-1.5"
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <h4 className="text-white font-extrabold text-xs md:text-sm tracking-tight leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-gray-400 text-[10px] md:text-xs font-light leading-tight mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {activeProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8 cursor-zoom-out"
            onClick={closeModal} 
          >
            <div 
              className="relative max-w-5xl w-full flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                layoutId={`hero-product-image-${activeProduct.uniqueId}`}
                className="relative w-full max-w-[320px] sm:max-w-sm aspect-[3/4.2] cursor-pointer group shrink-0"
                style={{ perspective: "1500px" }}
                onClick={() => setIsModalFlipped(!isModalFlipped)}
              >
                <motion.div
                  className="w-full h-full relative"
                  style={{ transformStyle: "preserve-3d" }}
                  animate={{ rotateY: isModalFlipped ? 180 : 0 }}
                  transition={{ duration: 0.7, type: "spring", stiffness: 200, damping: 25 }}
                >
                  <div 
                    className="absolute inset-0 bg-transparent shadow-[0_0_80px_rgba(250,204,21,0.3)] flex items-center justify-center p-4 md:p-6 border-[1.5px] border-[#F3B91C]/40 rounded-[2rem] overflow-hidden" 
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    {activeProduct.imgUrl ? (
                      <img
                        src={activeProduct.imgUrl}
                        alt={activeProduct.name}
                        className="w-full h-full object-contain filter drop-shadow-2xl" 
                      />
                    ) : (
                      <span className="text-gray-500 font-black uppercase text-sm">Sin Imagen</span>
                    )}
                    <div className="absolute bottom-4 flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="bg-black/80 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm shadow-xl">
                        <RotateCcw className="w-3.5 h-3.5"/> Haz clic para girar
                      </span>
                    </div>
                  </div>

                  <div 
                    className="absolute inset-0 bg-transparent rounded-2xl md:rounded-[2rem] overflow-hidden p-4 sm:p-5 border border-yellow-400/50 shadow-[0_0_80px_rgba(250,204,21,0.3)] flex flex-col gap-3" 
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
                      <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest truncate pr-2">
                        {activeProduct.set || activeProduct.name}
                      </span>
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0"/>
                    </div>

                    <div className="relative w-full flex-1 min-h-0 bg-transparent rounded-xl overflow-hidden border border-yellow-400/20 group flex items-center justify-center">
                      {selectedImageIndex > 0 && (
                        <div className="absolute top-2 left-2 z-30 pointer-events-none">
                          <span className="bg-[#F3B91C] text-black font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-xl border border-yellow-300">
                            ⭐ Mejores cartas de la colección
                          </span>
                        </div>
                      )}
                      {allProductImages.length > 0 ? (
                        <img
                          src={allProductImages[Math.min(selectedImageIndex, allProductImages.length - 1)]}
                          alt={activeProduct.name}
                          className="w-full h-full object-contain filter drop-shadow-xl transition-all duration-300"
                        />
                      ) : (
                        <span className="text-gray-600 font-black text-[10px] uppercase">Sin Imagen</span>
                      )}

                      {allProductImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImageIndex(prev => prev > 0 ? prev - 1 : allProductImages.length - 1);
                            }}
                            className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-[#F3B91C] hover:text-black text-white p-1 rounded-full transition-all z-20 backdrop-blur-sm"
                          >
                            <ChevronLeft className="w-3.5 h-3.5"/>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImageIndex(prev => prev < allProductImages.length - 1 ? prev + 1 : 0);
                            }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-[#F3B91C] hover:text-black text-white p-1 rounded-full transition-all z-20 backdrop-blur-sm"
                          >
                            <ChevronRight className="w-3.5 h-3.5"/>
                          </button>

                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-20 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
                            {allProductImages.map((_, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(idx); }}
                                className={`h-1 rounded-full transition-all ${
                                  selectedImageIndex === idx ? "bg-[#F3B91C] w-3" : "bg-white/40 hover:bg-white/70 w-1"
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <div className="flex items-center gap-2.5 bg-yellow-400/5 border border-yellow-400/15 rounded-lg px-2.5 py-1.5">
                        <div className="p-1 rounded-md bg-yellow-400/10 text-yellow-400 shrink-0">
                          <Truck className="w-3.5 h-3.5"/>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white leading-tight">Envíos solo a Canarias</p>
                          <p className="text-[8.5px] text-gray-400 font-light leading-tight">Entregas rápidas sin aduanas ni sorpresas.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 bg-yellow-400/5 border border-yellow-400/15 rounded-lg px-2.5 py-1.5">
                        <div className="p-1 rounded-md bg-yellow-400/10 text-yellow-400 shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5"/>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white leading-tight">Compra 100% segura</p>
                          <p className="text-[8.5px] text-gray-400 font-light leading-tight">Tus datos y pagos están protegidos.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 bg-yellow-400/5 border border-yellow-400/15 rounded-lg px-2.5 py-1.5">
                        <div className="p-1 rounded-md bg-yellow-400/10 text-yellow-400 shrink-0">
                          <Award className="w-3.5 h-3.5"/>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white leading-tight">Productos originales</p>
                          <p className="text-[8.5px] text-gray-400 font-light leading-tight">Todos nuestros productos son oficiales.</p>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-center">
                      <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-gray-400 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full hover:text-white transition-colors">
                        <RotateCcw className="w-3 h-3"/> Volver a girar
                      </span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left bg-[#0a1628]/80 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-2xl md:rounded-[2rem] shadow-2xl max-w-md w-full">
                
                <div className="relative w-full h-44 sm:h-52 bg-transparent rounded-xl overflow-hidden mb-5 border border-yellow-400/30 shadow-inner group p-2 flex items-center justify-center">
                  {allProductImages.length > 0 ? (
                    <img
                      src={allProductImages[Math.min(selectedImageIndex, allProductImages.length - 1)]}
                      alt={activeProduct.name}
                      className="w-full h-full object-contain filter drop-shadow-xl transition-all duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-gray-500 font-black uppercase text-sm">Sin Imagen</span>
                  )}

                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-yellow-400 z-10">
                    {activeProduct.set}
                  </div>

                  {allProductImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(prev => prev > 0 ? prev - 1 : allProductImages.length - 1); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-yellow-400 hover:text-black text-white p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 z-20 backdrop-blur-sm"
                      >
                        <ChevronLeft className="w-4 h-4"/>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(prev => prev < allProductImages.length - 1 ? prev + 1 : 0); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-yellow-400 hover:text-black text-white p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 z-20 backdrop-blur-sm"
                      >
                        <ChevronRight className="w-4 h-4"/>
                      </button>

                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
                        {allProductImages.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(idx); }}
                            className={`h-1.5 rounded-full transition-all ${
                              selectedImageIndex === idx ? "bg-yellow-400 w-3" : "bg-white/40 hover:bg-white/70 w-1.5"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-2">
                  {activeProduct.name}
                </h2>
                <p className="text-2xl md:text-3xl font-black text-yellow-400 mb-6">
                  {(Number(activeProduct.price) || 0).toFixed(2)}€
                </p>

                <div className="w-full flex flex-col gap-3">
                  <button 
                    onClick={() => handleAddToCart(activeProduct)}
                    className="w-full bg-yellow-400 hover:bg-blue-600 text-black hover:text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-colors duration-300 active:scale-95 shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]"
                  >
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5"/> 
                    Agregar al Carrito
                  </button>

                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      navigate('/catalogo');
                    }}
                    className="w-full bg-transparent hover:bg-white/5 border border-white/10 hover:border-yellow-400/50 text-gray-300 hover:text-yellow-400 font-bold uppercase tracking-widest py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    VER CATÁLOGO 
                    <ArrowRight className="w-4 h-4"/>
                  </button>
                </div>

              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); closeModal(); }}
              className="absolute top-4 right-4 md:top-8 md:right-8 bg-black/60 backdrop-blur-md text-white p-3 rounded-full border border-white/10 hover:bg-yellow-400 hover:text-black transition-all hover:scale-110 z-50"
            >
              <X className="w-6 h-6"/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast 
        show={showToast} 
        message="¡Pieza añadida al carrito!" 
        onClose={() => setShowToast(false)} 
      />
    </div>
  )
}