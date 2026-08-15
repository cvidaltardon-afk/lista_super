import { useState, useEffect, useRef } from "react";
import { storage } from "./storage";

const CATEGORIES = [
  {
    id: "frutas-verduras",
    name: "Frutas y Verduras",
    accent: "#4C7A3A",
    items: ["Plátano", "Manzana", "Palta", "Tomate", "Cebolla", "Papa", "Limón", "Lechuga", "Zanahoria", "Ajo", "Kiwi", "Pepino", "Pimentón", "Albahaca", "Cilantro", "Zapallo", "Brócoli", "Zapallo italiano"],
  },
  {
    id: "lacteos-huevos",
    name: "Lácteos y Huevos",
    accent: "#6E9BC7",
    items: ["Leche", "Yogurt", "Queso", "Mantequilla", "Huevos", "Crema"],
  },
  {
    id: "carnes-pescados",
    name: "Carnes y Pescados",
    accent: "#B23A21",
    items: ["Pollo", "Carne molida", "Posta de vacuno", "Pescado", "Cecinas", "Jamón"],
  },
  {
    id: "panaderia",
    name: "Panadería",
    accent: "#D9A441",
    items: ["Pan", "Marraqueta", "Hallulla", "Tortillas", "Pan de molde"],
  },
  {
    id: "abarrotes",
    name: "Abarrotes",
    accent: "#8A7B4E",
    items: ["Arroz", "Fideos", "Aceite", "Azúcar", "Sal", "Harina", "Legumbres", "Atún", "Salsa de tomate", "Café"],
  },
  {
    id: "bebidas",
    name: "Bebidas",
    accent: "#3F8C82",
    items: ["Agua", "Jugo", "Bebida gaseosa", "Té", "Vino", "Cerveza"],
  },
  {
    id: "congelados",
    name: "Congelados",
    accent: "#6FA8B5",
    items: ["Helados", "Verduras congeladas", "Papas fritas congeladas", "Pizza congelada", "Pescado", "Hamburguesas"],
  },
  {
    id: "limpieza",
    name: "Limpieza",
    accent: "#7C6FA0",
    items: ["Detergente", "Cloro", "Papel higiénico", "Servilletas", "Bolsas de basura", "Esponja"],
  },
  {
    id: "higiene",
    name: "Higiene y Cuidado Personal",
    accent: "#C77B9B",
    items: ["Shampoo", "Jabón", "Pasta de dientes", "Desodorante", "Toallas húmedas", "Talco"],
  },
  {
    id: "otros",
    name: "Otros",
    accent: "#8A8578",
    items: [],
  },
];

const STORAGE_KEY = "lista-super-v1";
const HISTORY_KEY = "lista-super-historial";

function buildDefaultCatalog() {
  const catalog = {};
  CATEGORIES.forEach((cat) => {
    cat.items.forEach((name, i) => {
      const id = `${cat.id}-${i}`;
      catalog[id] = { id, name, category: cat.id, custom: false };
    });
  });
  return catalog;
}

export default function ListaSuper() {
  const [catalog, setCatalog] = useState(buildDefaultCatalog);
  const [itemsState, setItemsState] = useState({});
  const [mode, setMode] = useState("casa"); // "casa" | "super"
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [addingIn, setAddingIn] = useState(null);
  const [newItemName, setNewItemName] = useState("");
  const [openCats, setOpenCats] = useState(() =>
    Object.fromEntries(CATEGORIES.map((c) => [c.id, true]))
  );
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await storage.get(STORAGE_KEY);
        if (!cancelled && res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed.customItems) {
            setCatalog((prev) => {
              const next = { ...prev };
              parsed.customItems.forEach((it) => {
                next[it.id] = it;
              });
              return next;
            });
          }
          if (parsed.itemsState) setItemsState(parsed.itemsState);
        }
      } catch (e) {
        // no hay datos guardados aún, se parte limpio
      }
      try {
        const histRes = await storage.get(HISTORY_KEY);
        if (!cancelled && histRes && histRes.value) {
          setHistory(JSON.parse(histRes.value));
        }
      } catch (e) {
        // sin historial todavía
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const customItems = Object.values(catalog).filter((it) => it.custom);
    const payload = JSON.stringify({ customItems, itemsState });
    storage.set(STORAGE_KEY, payload).then((res) => {
      setSaveError(!res);
    }).catch(() => setSaveError(true));
  }, [catalog, itemsState, loaded]);

  useEffect(() => {
    if (addingIn && inputRef.current) inputRef.current.focus();
  }, [addingIn]);

  function toggleNeeded(id) {
    setItemsState((prev) => {
      const cur = prev[id] || { needed: false, bought: false };
      const needed = !cur.needed;
      return { ...prev, [id]: { needed, bought: needed ? cur.bought : false } };
    });
  }

  function toggleBought(id) {
    setItemsState((prev) => {
      const cur = prev[id] || { needed: true, bought: false };
      return { ...prev, [id]: { ...cur, bought: !cur.bought } };
    });
  }

  function addCustomItem(catId) {
    const name = newItemName.trim();
    if (!name) {
      setAddingIn(null);
      return;
    }
    const id = `custom-${catId}-${Date.now()}`;
    setCatalog((prev) => ({ ...prev, [id]: { id, name, category: catId, custom: true } }));
    setItemsState((prev) => ({ ...prev, [id]: { needed: true, bought: false } }));
    setNewItemName("");
    setAddingIn(null);
  }

  function deleteCustomItem(id) {
    setCatalog((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setItemsState((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function finishShopping(boughtNow) {
    if (boughtNow.length === 0) return;
    const entry = {
      date: new Date().toISOString(),
      items: boughtNow.map((it) => it.name),
    };
    const newHistory = [entry, ...history].slice(0, 50);
    setHistory(newHistory);

    setItemsState((prev) => {
      const next = { ...prev };
      boughtNow.forEach((it) => {
        next[it.id] = { needed: false, bought: false };
      });
      return next;
    });

    try {
      const res = await storage.set(HISTORY_KEY, JSON.stringify(newHistory));
      if (!res) throw new Error("no result");
    } catch (e) {
      setSaveError(true);
    }

    setToast(`Compra guardada · ${boughtNow.length} producto${boughtNow.length === 1 ? "" : "s"}`);
    setTimeout(() => setToast(""), 2800);
  }

  async function deleteHistoryEntry(index) {
    const newHistory = history.filter((_, i) => i !== index);
    setHistory(newHistory);
    try {
      const res = await storage.set(HISTORY_KEY, JSON.stringify(newHistory));
      if (!res) throw new Error("no result");
    } catch (e) {
      setSaveError(true);
    }
  }

  function formatTripDate(iso) {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
    const timePart = d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    return `${datePart}, ${timePart}`;
  }

  function clearBought() {
    setItemsState((prev) => {
      const next = {};
      Object.entries(prev).forEach(([id, s]) => {
        next[id] = { ...s, bought: false };
      });
      return next;
    });
  }

  function resetAll() {
    setItemsState({});
  }

  const allItems = Object.values(catalog);
  const neededItems = allItems.filter((it) => itemsState[it.id]?.needed);
  const boughtCount = neededItems.filter((it) => itemsState[it.id]?.bought).length;

  const catsToShow = CATEGORIES.map((cat) => ({
    ...cat,
    items:
      mode === "casa"
        ? allItems.filter((it) => it.category === cat.id)
        : allItems.filter((it) => it.category === cat.id && itemsState[it.id]?.needed),
  })).filter((cat) => mode === "casa" || cat.items.length > 0);

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Inter:wght@400;500;600;700;800&display=swap');

        .app-root {
          --bg: #1F2B1F;
          --bg-soft: #26362A;
          --paper: #F3ECD8;
          --paper-dim: #E4DBC2;
          --ink: #2B2118;
          --chalk: #F7F3E8;
          --chalk-dim: #B9C4B4;
          --stamp: #B23A21;
          --need: #D9A441;
          font-family: 'Inter', -apple-system, sans-serif;
          background: var(--bg);
          background-image:
            radial-gradient(circle at 15% 5%, rgba(255,255,255,0.03), transparent 40%),
            radial-gradient(circle at 85% 90%, rgba(255,255,255,0.025), transparent 45%);
          color: var(--chalk);
          min-height: 100%;
          width: 100%;
          box-sizing: border-box;
          padding: 20px 14px 40px;
          display: flex;
          justify-content: center;
        }
        .app-root *, .app-root *::before, .app-root *::after { box-sizing: border-box; }

        .shell { width: 100%; max-width: 440px; }

        .header { text-align: center; margin-bottom: 14px; }
        .title-row { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .title {
          font-family: 'Permanent Marker', cursive;
          font-size: 28px;
          font-weight: 400;
          letter-spacing: 0.3px;
          color: var(--chalk);
          margin: 0;
          transform: rotate(-1deg);
        }
        .cart-icon { flex-shrink: 0; }
        .swash { display: block; margin: 2px auto 0; opacity: 0.85; }

        .segmented {
          display: flex;
          gap: 8px;
          margin: 16px 0 10px;
          background: var(--bg-soft);
          padding: 5px;
          border-radius: 14px;
          border: 1.5px dashed rgba(247,243,232,0.25);
        }
        .seg-btn {
          flex: 1;
          padding: 9px 4px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: var(--chalk-dim);
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 12.5px;
          letter-spacing: 0.1px;
          cursor: pointer;
          transition: background 0.18s ease, color 0.18s ease, transform 0.12s ease;
        }
        .seg-btn.active {
          background: var(--paper);
          color: var(--ink);
          transform: translateY(-1px);
          box-shadow: 0 2px 0 rgba(0,0,0,0.25);
        }

        .progress-wrap { margin: 4px 0 18px; }
        .progress-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: var(--chalk-dim);
          font-weight: 600;
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
        }
        .progress-track {
          height: 8px;
          border-radius: 6px;
          background: rgba(247,243,232,0.14);
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--need), var(--stamp));
          border-radius: 6px;
          transition: width 0.25s ease;
        }

        .empty-note {
          text-align: center;
          color: var(--chalk-dim);
          font-size: 14px;
          padding: 30px 16px;
          border: 1.5px dashed rgba(247,243,232,0.25);
          border-radius: 14px;
          line-height: 1.5;
        }

        .category {
          margin-bottom: 14px;
          background: var(--bg-soft);
          border-radius: 16px;
          padding: 10px 10px 12px;
          border: 1px solid rgba(247,243,232,0.08);
        }
        .cat-header {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 4px 4px 8px;
          cursor: pointer;
          user-select: none;
        }
        .cat-dot {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 0 3px rgba(247,243,232,0.06);
        }
        .cat-name {
          font-family: 'Permanent Marker', cursive;
          font-size: 16.5px;
          font-weight: 400;
          color: var(--chalk);
          flex: 1;
        }
        .cat-count {
          font-size: 11.5px;
          color: var(--chalk-dim);
          font-weight: 600;
          background: rgba(247,243,232,0.08);
          padding: 2px 8px;
          border-radius: 20px;
        }
        .cat-chevron {
          color: var(--chalk-dim);
          transition: transform 0.18s ease;
          flex-shrink: 0;
        }
        .cat-chevron.closed { transform: rotate(-90deg); }

        .items-list { display: flex; flex-direction: column; gap: 7px; }

        .item-tag {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--paper);
          color: var(--ink);
          padding: 10px 12px;
          border-radius: 9px;
          cursor: pointer;
          transform: rotate(var(--tilt, 0deg));
          box-shadow: 0 1.5px 0 rgba(0,0,0,0.18);
          transition: opacity 0.2s ease, transform 0.15s ease;
          overflow: hidden;
        }
        .item-tag:active { transform: scale(0.985) rotate(var(--tilt, 0deg)); }
        .item-tag.bought { opacity: 0.55; background: var(--paper-dim); }

        .box {
          width: 20px;
          height: 20px;
          border-radius: 5px;
          border: 2px solid var(--ink);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .box.checked-need { background: var(--need); border-color: var(--need); }
        .box.checked-bought { background: var(--stamp); border-color: var(--stamp); }
        .box svg { display: block; }

        .item-name {
          font-size: 14.5px;
          font-weight: 600;
          flex: 1;
          text-decoration: none;
        }
        .item-name.struck { text-decoration: line-through; text-decoration-thickness: 2px; }

        .stamp-mark {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%) rotate(-14deg);
          font-family: 'Permanent Marker', cursive;
          font-size: 11px;
          letter-spacing: 1px;
          color: var(--stamp);
          border: 2px solid var(--stamp);
          border-radius: 6px;
          padding: 1px 6px;
          opacity: 0.88;
          pointer-events: none;
        }

        .delete-btn {
          background: transparent;
          border: none;
          padding: 4px;
          margin: -4px -4px -4px 0;
          flex-shrink: 0;
          color: var(--ink);
          opacity: 0.45;
          cursor: pointer;
          border-radius: 6px;
        }
        .delete-btn:hover { opacity: 0.9; background: rgba(178,58,33,0.12); color: var(--stamp); }

        .add-row { margin-top: 8px; }
        .add-btn {
          width: 100%;
          background: transparent;
          border: 1.5px dashed rgba(247,243,232,0.3);
          color: var(--chalk-dim);
          border-radius: 9px;
          padding: 8px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
        }
        .add-btn:hover { color: var(--chalk); border-color: rgba(247,243,232,0.5); }

        .add-input-row { display: flex; gap: 6px; margin-top: 6px; }
        .add-input {
          flex: 1;
          background: var(--paper);
          border: none;
          border-radius: 8px;
          padding: 9px 10px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
        }
        .add-input:focus { outline: 2px solid var(--need); }
        .add-confirm {
          background: var(--need);
          border: none;
          border-radius: 8px;
          padding: 0 14px;
          color: var(--ink);
          font-weight: 700;
          cursor: pointer;
        }

        .footer {
          margin-top: 22px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .footer-btn {
          flex: 1;
          min-width: 140px;
          background: transparent;
          border: 1.5px solid rgba(247,243,232,0.3);
          color: var(--chalk-dim);
          border-radius: 10px;
          padding: 10px;
          font-size: 13px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
        }
        .footer-btn:hover { color: var(--chalk); border-color: rgba(247,243,232,0.55); }
        .footer-btn.danger:hover { color: var(--stamp); border-color: var(--stamp); }
        .footer-btn.primary {
          background: var(--need);
          border-color: var(--need);
          color: var(--ink);
          flex-basis: 100%;
        }
        .footer-btn.primary:hover { color: var(--ink); border-color: var(--need); opacity: 0.92; }
        .footer-btn.primary:disabled {
          background: transparent;
          border-color: rgba(247,243,232,0.18);
          color: rgba(247,243,232,0.3);
          cursor: not-allowed;
        }

        .toast {
          position: fixed;
          left: 50%;
          bottom: 22px;
          transform: translateX(-50%);
          background: var(--paper);
          color: var(--ink);
          font-weight: 700;
          font-size: 13.5px;
          padding: 10px 18px;
          border-radius: 30px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          z-index: 20;
          animation: toast-in 0.2s ease;
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .history-card {
          background: var(--bg-soft);
          border: 1px solid rgba(247,243,232,0.08);
          border-radius: 14px;
          padding: 12px 14px 14px;
          margin-bottom: 12px;
        }
        .history-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .history-date {
          font-family: 'Permanent Marker', cursive;
          font-size: 15px;
          color: var(--chalk);
          text-transform: capitalize;
        }
        .history-delete { color: var(--chalk-dim); }
        .history-delete:hover { color: var(--stamp); background: rgba(178,58,33,0.15); }
        .history-count {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--chalk-dim);
          font-weight: 600;
          margin: 4px 0 10px;
        }
        .history-items {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .history-chip {
          background: var(--paper);
          color: var(--ink);
          font-size: 12.5px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
        }

        .save-warning {
          text-align: center;
          font-size: 12px;
          color: var(--need);
          margin-top: 10px;
        }

        @media (prefers-reduced-motion: reduce) {
          .item-tag, .progress-fill, .cat-chevron, .seg-btn, .toast { transition: none; animation: none; }
        }
      `}</style>

      <div className="shell">
        <div className="header">
          <div className="title-row">
            <svg className="cart-icon" width="26" height="24" viewBox="0 0 26 24" fill="none">
              <path d="M2 3h3l3 13h13l2.5-9H7" stroke="#F7F3E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="10" cy="21" r="1.6" fill="#F7F3E8"/>
              <circle cx="18" cy="21" r="1.6" fill="#F7F3E8"/>
            </svg>
            <h1 className="title">Mi Lista del Súper</h1>
          </div>
          <svg className="swash" width="180" height="10" viewBox="0 0 180 10">
            <path d="M4 6 Q40 -2 80 6 T160 5" stroke="#D9A441" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          </svg>
        </div>

        <div className="segmented" role="tablist">
          <button
            className={`seg-btn ${mode === "casa" ? "active" : ""}`}
            onClick={() => setMode("casa")}
          >
            En casa
          </button>
          <button
            className={`seg-btn ${mode === "super" ? "active" : ""}`}
            onClick={() => setMode("super")}
          >
            En el súper
          </button>
          <button
            className={`seg-btn ${mode === "historial" ? "active" : ""}`}
            onClick={() => setMode("historial")}
          >
            Historial
          </button>
        </div>

        {mode === "super" && (
          <div className="progress-wrap">
            <div className="progress-label">
              <span>Comprados</span>
              <span>{boughtCount} / {neededItems.length}</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: neededItems.length ? `${(boughtCount / neededItems.length) * 100}%` : "0%" }}
              />
            </div>
          </div>
        )}

        {mode === "super" && neededItems.length === 0 && (
          <div className="empty-note">
            Todavía no has marcado nada como necesario. Vuelve a "En casa" y revisa qué te falta.
          </div>
        )}

        {(mode === "casa" || mode === "super") && catsToShow.map((cat) => {
          const isOpen = openCats[cat.id];
          return (
            <div className="category" key={cat.id}>
              <div
                className="cat-header"
                onClick={() => setOpenCats((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
              >
                <span className="cat-dot" style={{ background: cat.accent }} />
                <span className="cat-name">{cat.name}</span>
                <span className="cat-count">
                  {mode === "casa"
                    ? `${cat.items.filter((it) => itemsState[it.id]?.needed).length}/${cat.items.length}`
                    : `${cat.items.filter((it) => itemsState[it.id]?.bought).length}/${cat.items.length}`}
                </span>
                <svg
                  className={`cat-chevron ${isOpen ? "" : "closed"}`}
                  width="14" height="14" viewBox="0 0 14 14" fill="none"
                >
                  <path d="M3 5.5L7 9.5L11 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {isOpen && (
                <>
                  <div className="items-list">
                    {cat.items.map((it, i) => {
                      const s = itemsState[it.id] || { needed: false, bought: false };
                      const tilt = (i % 2 === 0 ? -0.6 : 0.6);
                      if (mode === "casa") {
                        return (
                          <div
                            key={it.id}
                            className="item-tag"
                            style={{ "--tilt": `${tilt}deg` }}
                            onClick={() => toggleNeeded(it.id)}
                          >
                            <span className={`box ${s.needed ? "checked-need" : ""}`}>
                              {s.needed && (
                                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                                  <path d="M1 5L4.5 8.5L11 1.5" stroke="#2B2118" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </span>
                            <span className="item-name">{it.name}</span>
                            {it.custom && (
                              <button
                                className="delete-btn"
                                onClick={(e) => { e.stopPropagation(); deleteCustomItem(it.id); }}
                                aria-label={`Eliminar ${it.name}`}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                  <path d="M3 4h10M6.5 4V2.8c0-.4.3-.8.8-.8h1.4c.4 0 .8.4.8.8V4M4.5 4l.6 8.4c0 .6.5 1.1 1.1 1.1h3.6c.6 0 1-.5 1.1-1.1L11.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={it.id}
                          className={`item-tag ${s.bought ? "bought" : ""}`}
                          style={{ "--tilt": `${tilt}deg` }}
                          onClick={() => toggleBought(it.id)}
                        >
                          <span className={`box ${s.bought ? "checked-bought" : ""}`}>
                            {s.bought && (
                              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                                <path d="M1 5L4.5 8.5L11 1.5" stroke="#F3ECD8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </span>
                          <span className={`item-name ${s.bought ? "struck" : ""}`}>{it.name}</span>
                          {s.bought && <span className="stamp-mark">OK</span>}
                        </div>
                      );
                    })}
                  </div>

                  {mode === "casa" && (
                    <div className="add-row">
                      {addingIn === cat.id ? (
                        <div className="add-input-row">
                          <input
                            ref={inputRef}
                            className="add-input"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addCustomItem(cat.id);
                              if (e.key === "Escape") { setAddingIn(null); setNewItemName(""); }
                            }}
                            placeholder="Nombre del producto"
                          />
                          <button className="add-confirm" onClick={() => addCustomItem(cat.id)}>
                            Agregar
                          </button>
                        </div>
                      ) : (
                        <button className="add-btn" onClick={() => setAddingIn(cat.id)}>
                          + agregar producto
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {mode === "historial" && (
          <>
            {history.length === 0 ? (
              <div className="empty-note">
                Aún no has guardado ninguna compra. Cuando termines de comprar, usa el botón "Terminar compra y guardar" en la pestaña "En el súper".
              </div>
            ) : (
              history.map((trip, i) => (
                <div className="history-card" key={trip.date + i}>
                  <div className="history-head">
                    <span className="history-date">{formatTripDate(trip.date)}</span>
                    <button
                      className="delete-btn history-delete"
                      onClick={() => deleteHistoryEntry(i)}
                      aria-label="Eliminar esta compra del historial"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 4h10M6.5 4V2.8c0-.4.3-.8.8-.8h1.4c.4 0 .8.4.8.8V4M4.5 4l.6 8.4c0 .6.5 1.1 1.1 1.1h3.6c.6 0 1-.5 1.1-1.1L11.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <div className="history-count">{trip.items.length} producto{trip.items.length === 1 ? "" : "s"}</div>
                  <div className="history-items">
                    {trip.items.map((name, idx) => (
                      <span className="history-chip" key={idx}>{name}</span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        <div className="footer">
          {mode === "super" && (
            <button
              className="footer-btn primary"
              disabled={boughtCount === 0}
              onClick={() => finishShopping(neededItems.filter((it) => itemsState[it.id]?.bought))}
            >
              Terminar compra y guardar
            </button>
          )}
          {mode !== "historial" && (
            <>
              <button className="footer-btn" onClick={clearBought}>
                Vaciar carro (mantener lista)
              </button>
              <button className="footer-btn danger" onClick={resetAll}>
                Reiniciar lista completa
              </button>
            </>
          )}
        </div>

        {toast && <div className="toast">{toast}</div>}

        {saveError && (
          <div className="save-warning">No se pudo guardar el último cambio. Revisa tu conexión.</div>
        )}
      </div>
    </div>
  );
}
