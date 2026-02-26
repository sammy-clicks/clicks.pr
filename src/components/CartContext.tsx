"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type CartItem = {
  menuItemId: string;
  name: string;
  priceCents: number;   // includes mixer extra charge if any
  qty: number;
  isAlcohol: boolean;
  mixerId?: string;     // ID of selected mixer (for order submission)
  mixerName?: string;   // display label
};

export type Cart = {
  venueId: string;
  venueName: string;
  venueLat: number;
  venueLng: number;
  items: CartItem[];
};

type CartCtx = {
  cart: Cart | null;
  setCart: (c: Cart | null) => void;
  addItem: (venueId: string, venueName: string, venueLat: number, venueLng: number, item: CartItem) => void;
  removeItem: (menuItemId: string) => void;
  setQty: (menuItemId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalCents: number;
};

const CartContext = createContext<CartCtx>({
  cart: null,
  setCart: () => {},
  addItem: () => {},
  removeItem: () => {},
  setQty: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalCents: 0,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCartState] = useState<Cart | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("clicks_cart");
      if (raw) setCartState(JSON.parse(raw));
    } catch {}
  }, []);

  function persist(c: Cart | null) {
    setCartState(c);
    try {
      if (c) localStorage.setItem("clicks_cart", JSON.stringify(c));
      else localStorage.removeItem("clicks_cart");
    } catch {}
  }

  const setCart = useCallback((c: Cart | null) => persist(c), []);
  const clearCart = useCallback(() => persist(null), []);

  const addItem = useCallback((venueId: string, venueName: string, venueLat: number, venueLng: number, item: CartItem) => {
    setCartState(prev => {
      // If cart belongs to different venue, start fresh
      const base: Cart = (prev && prev.venueId === venueId)
        ? { ...prev }
        : { venueId, venueName, venueLat, venueLng, items: [] };

      const existing = base.items.find(i => i.menuItemId === item.menuItemId);
      const items = existing
        ? base.items.map(i => i.menuItemId === item.menuItemId ? { ...i, qty: i.qty + item.qty } : i)
        : [...base.items, item];

      const next = { ...base, items };
      try { localStorage.setItem("clicks_cart", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setCartState(prev => {
      if (!prev) return null;
      const items = prev.items.filter(i => i.menuItemId !== menuItemId);
      const next = items.length === 0 ? null : { ...prev, items };
      try {
        if (next) localStorage.setItem("clicks_cart", JSON.stringify(next));
        else localStorage.removeItem("clicks_cart");
      } catch {}
      return next;
    });
  }, []);

  const setQty = useCallback((menuItemId: string, qty: number) => {
    if (qty <= 0) { removeItem(menuItemId); return; }
    setCartState(prev => {
      if (!prev) return null;
      const items = prev.items.map(i => i.menuItemId === menuItemId ? { ...i, qty } : i);
      const next = { ...prev, items };
      try { localStorage.setItem("clicks_cart", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [removeItem]);

  const totalItems = cart?.items.reduce((s, i) => s + i.qty, 0) ?? 0;
  const totalCents = cart?.items.reduce((s, i) => s + i.qty * i.priceCents, 0) ?? 0;

  return (
    <CartContext.Provider value={{ cart, setCart, addItem, removeItem, setQty, clearCart, totalItems, totalCents }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
