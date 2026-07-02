import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User } from '../types';

interface CartItem {
  variant_id: number;
  product_name: string;
  sku: string | null;
  barcode: string | null;
  size: string | null;
  color: string | null;
  unit_price: number;
  quantity: number;
  discount: number; // Item discount percentage or value (we'll treat as percentage)
  total: number;
}

interface AppContextType {
  // Navigation
  activePage: string;
  setActivePage: (page: string) => void;

  // Auth State
  user: User | null;
  token: string | null;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => void;
  loadingAuth: boolean;

  // Settings State
  settings: Record<string, string>;
  loadSettings: () => Promise<void>;

  // Cart State
  cart: CartItem[];
  addToCart: (variant: any, quantity?: number) => void;
  removeFromCart: (variantId: number) => void;
  updateCartQuantity: (variantId: number, quantity: number) => void;
  updateCartDiscount: (variantId: number, discountPercentage: number) => void;
  clearCart: () => void;
  cartTotals: {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
  };
  cartDiscount: number; // General cart discount percentage
  setCartDiscount: (discount: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('antara_token'));
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [settings, setSettings] = useState<Record<string, string>>({});
  
  // Cart States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState<number>(0);

  // Validate session on load
  useEffect(() => {
    async function checkSession() {
      if (token) {
        try {
          const res = await api.auth.me();
          setUser(res.user);
          await loadSettings();
        } catch (error) {
          console.error('Session validation failed:', error);
          logout();
        }
      }
      setLoadingAuth(false);
    }
    checkSession();
  }, [token]);

  const loadSettings = async () => {
    try {
      const sets = await api.settings.get();
      setSettings(sets);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const login = async (username: string, password?: string) => {
    try {
      const res = await api.auth.login({ username, password });
      localStorage.setItem('antara_token', res.token);
      setToken(res.token);
      setUser(res.user);
      await loadSettings();
      setActivePage('dashboard');
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('antara_token');
    setToken(null);
    setUser(null);
    setCart([]);
    setCartDiscount(0);
    setActivePage('dashboard');
  };

  // Cart operations
  const addToCart = (variant: any, quantity: number = 1) => {
    setCart((prevCart) => {
      const exists = prevCart.find((item) => item.variant_id === variant.id);
      if (exists) {
        const newQty = exists.quantity + quantity;
        return prevCart.map((item) =>
          item.variant_id === variant.id
            ? { ...item, quantity: newQty, total: newQty * item.unit_price * (1 - item.discount / 100) }
            : item
        );
      }
      const newItem: CartItem = {
        variant_id: variant.id,
        product_name: variant.product_name || variant.name,
        sku: variant.sku,
        barcode: variant.barcode,
        size: variant.size,
        color: variant.color,
        unit_price: variant.sell_price,
        quantity,
        discount: 0,
        total: quantity * variant.sell_price
      };
      return [...prevCart, newItem];
    });
  };

  const removeFromCart = (variantId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.variant_id !== variantId));
  };

  const updateCartQuantity = (variantId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.variant_id === variantId
          ? { ...item, quantity, total: quantity * item.unit_price * (1 - item.discount / 100) }
          : item
      )
    );
  };

  const updateCartDiscount = (variantId: number, discountPercentage: number) => {
    const cleanDiscount = Math.max(0, Math.min(100, discountPercentage));
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.variant_id === variantId
          ? { ...item, discount: cleanDiscount, total: item.quantity * item.unit_price * (1 - cleanDiscount / 100) }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setCartDiscount(0);
  };

  // Compute Cart Totals
  const calculateCartTotals = () => {
    // 1. Calculate raw subtotal and item-level discounts
    let subtotal = 0;
    let itemDiscounts = 0;
    
    for (const item of cart) {
      const itemSubtotal = item.quantity * item.unit_price;
      subtotal += itemSubtotal;
      itemDiscounts += itemSubtotal * (item.discount / 100);
    }

    const priceAfterItemDiscounts = subtotal - itemDiscounts;

    // 2. Apply general cart discount
    const generalDiscountAmount = priceAfterItemDiscounts * (cartDiscount / 100);
    const totalDiscount = itemDiscounts + generalDiscountAmount;
    
    const taxableAmount = subtotal - totalDiscount;

    // 3. Compute tax (based on config, e.g. 16%)
    const taxRate = parseFloat(settings.store_tax_rate || '0.16');
    const taxIncluded = settings.store_tax_included !== 'false'; // default true

    let taxAmount = 0;
    let finalTotal = taxableAmount;

    if (taxIncluded) {
      // Tax is already built-in, calculate desglose
      // total = subtotal_sin_iva * (1 + taxRate)
      // subtotal_sin_iva = total / (1 + taxRate)
      // taxAmount = total - subtotal_sin_iva
      taxAmount = taxableAmount - (taxableAmount / (1 + taxRate));
    } else {
      // Tax is added on top
      taxAmount = taxableAmount * taxRate;
      finalTotal = taxableAmount + taxAmount;
    }

    return {
      subtotal,
      discountAmount: totalDiscount,
      taxAmount,
      total: finalTotal
    };
  };

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        user,
        token,
        login,
        logout,
        loadingAuth,
        settings,
        loadSettings,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        updateCartDiscount,
        clearCart,
        cartTotals: calculateCartTotals(),
        cartDiscount,
        setCartDiscount
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
export default AppContext;
