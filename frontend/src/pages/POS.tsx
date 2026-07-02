import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useApp } from '../context/AppContext';
import { Product, Customer } from '../types';
import { Search, Plus, Minus, Trash2, UserPlus, ShoppingCart, Percent, User, Receipt, AlertCircle, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export const POS: React.FC = () => {
  const { 
    cart, 
    addToCart, 
    removeFromCart, 
    updateCartQuantity, 
    updateCartDiscount, 
    clearCart, 
    cartTotals,
    cartDiscount,
    setCartDiscount,
    settings
  } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Payments
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'mixed'>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [cardReceived, setCardReceived] = useState<number>(0);
  const [transferReceived, setTransferReceived] = useState<number>(0);
  
  // Checkout & Modals
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [printedSale, setPrintedSale] = useState<any>(null); // holds sale details after checkout
  
  // Quick Add Customer modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');
  
  // Scanner barcode input buffer
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadPOSData = async () => {
    try {
      const [prodList, catList, custList] = await Promise.all([
        api.products.list({ status: 1 }),
        api.catalogs.listCategories(),
        api.customers.list()
      ]);
      setProducts(prodList);
      setCategories(catList.filter(c => c.status === 1));
      setCustomers(custList);
    } catch (err) {
      console.error('POS data load failed:', err);
    }
  };

  useEffect(() => {
    loadPOSData();
  }, []);

  // Barcode Scanner Listener:
  // If the user inputs a barcode in the search field and hits enter:
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      // First, try to fetch by barcode or SKU directly
      const variant = await api.products.getByBarcode(searchQuery.trim());
      if (variant) {
        addToCart(variant, 1);
        setSearchQuery('');
        // Trigger soft tone or animation feedback
        return;
      }
    } catch (err) {
      // Barcode lookup failed, fallback to local text search filter (already happening in UI list)
      console.log("Barcode not found, using search text.");
    }
  };

  const handleCheckout = async () => {
    setCheckoutError('');
    
    if (cart.length === 0) {
      setCheckoutError('El carrito se encuentra vacío.');
      return;
    }

    // Cash verification for cash/mixed payments
    if (paymentMethod === 'cash') {
      if (cashReceived < cartTotals.total) {
        setCheckoutError('El dinero en efectivo recibido es menor al total de la compra.');
        return;
      }
    } else if (paymentMethod === 'mixed') {
      const totalReceived = cashReceived + cardReceived + transferReceived;
      if (Math.abs(totalReceived - cartTotals.total) > 0.01) {
        setCheckoutError(`El monto mixto recibido ($${totalReceived.toFixed(2)}) debe coincidir exactamente con el total de la compra ($${cartTotals.total.toFixed(2)}).`);
        return;
      }
    }

    setLoadingCheckout(true);
    try {
      const payload = {
        client_id: selectedCustomerId ? parseInt(selectedCustomerId, 10) : null,
        total: cartTotals.total,
        subtotal: cartTotals.subtotal,
        discount: cartTotals.discountAmount,
        tax: cartTotals.taxAmount,
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'cash' ? cashReceived : (paymentMethod === 'mixed' ? cashReceived : 0),
        card_received: paymentMethod === 'card' ? cartTotals.total : (paymentMethod === 'mixed' ? cardReceived : 0),
        transfer_received: paymentMethod === 'transfer' ? cartTotals.total : (paymentMethod === 'mixed' ? transferReceived : 0),
        notes: `Cobro en terminal POS`,
        items: cart.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          total: item.total
        }))
      };

      const result = await api.sales.create(payload);
      
      // Confetti burst for luxury wow factor!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      // Load created sale details for receipt modal
      const saleDetails = await api.sales.get(result.id);
      setPrintedSale(saleDetails);

      // Clear checkout state
      clearCart();
      setCashReceived(0);
      setCardReceived(0);
      setTransferReceived(0);
      setSelectedCustomerId('');
      
    } catch (err: any) {
      setCheckoutError(err.message || 'Error al procesar el cobro.');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    try {
      const newCust = await api.customers.create({
        name: newCustName,
        phone: newCustPhone || null,
        email: newCustEmail || null,
        notes: newCustNotes || null
      });

      // Reload customers and pre-select the newly added customer
      const custs = await api.customers.list();
      setCustomers(custs);
      setSelectedCustomerId(newCust.id.toString());
      
      // Reset form & close
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustNotes('');
      setIsCustomerModalOpen(false);
    } catch (err) {
      alert('Error al registrar el cliente.');
    }
  };

  const triggerPrintReceipt = () => {
    window.print();
  };

  // Filter product variants locally
  const getFilteredVariants = () => {
    const list: any[] = [];
    products.forEach(p => {
      // Apply general page category filter
      if (selectedCatId && p.category_id !== parseInt(selectedCatId, 10)) return;

      p.variants.forEach(v => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (v.sku && v.sku.toLowerCase().includes(searchQuery.toLowerCase())) || 
          (v.barcode && v.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

        if (matchesSearch) {
          list.push({
            ...v,
            product_name: p.name,
            owner_name: p.owner_name
          });
        }
      });
    });
    return list;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  const selectedCustomerObj = customers.find(c => c.id === parseInt(selectedCustomerId, 10));

  return (
    <div className="pos-layout">
      
      {/* Catalog / Left Panel */}
      <div className="pos-catalog">
        
        {/* Search bar & Category quick filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <form onSubmit={handleSearchSubmit} style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              ref={searchInputRef}
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder="Escriba producto, SKU o escanee código de barras..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          
          <select 
            className="form-control"
            style={{ width: '180px' }}
            value={selectedCatId}
            onChange={(e) => setSelectedCatId(e.target.value)}
          >
            <option value="">Todas Categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Variants List grid */}
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Variantes del Catálogo</h3>
        <div className="pos-grid-products">
          {getFilteredVariants().map((variant) => {
            const isOutOfStock = variant.stock <= 0 && settings.allow_negative_stock !== 'true';
            return (
              <div 
                key={variant.id} 
                className="pos-product-card"
                onClick={() => !isOutOfStock && addToCart(variant)}
                style={{ 
                  opacity: isOutOfStock ? 0.5 : 1, 
                  cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                  border: isOutOfStock ? '1px dashed var(--danger)' : '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.2 }}>{variant.product_name}</span>
                    <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{variant.owner_name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                    {variant.size && <span className="badge" style={{ backgroundColor: 'var(--bg-app)', fontSize: '0.65rem' }}>T: {variant.size}</span>}
                    {variant.color && <span className="badge" style={{ backgroundColor: 'var(--bg-app)', fontSize: '0.65rem' }}>C: {variant.color}</span>}
                  </div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                    SKU: {variant.sku || 'N/A'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: variant.stock <= 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    Stock: {variant.stock} u.
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}>
                    {formatCurrency(variant.sell_price)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart / Right Panel */}
      <div className="pos-sidebar">
        
        {/* Customer Select */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--bg-hover)' }}>
          <User size={18} style={{ color: 'var(--text-muted)' }} />
          <select 
            className="form-control"
            style={{ flex: 1, height: '36px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
          >
            <option value="">Cliente: Público General</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
          </select>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '0.5rem', minWidth: 'unset' }}
            onClick={() => setIsCustomerModalOpen(true)}
            title="Registrar nuevo cliente"
          >
            <UserPlus size={16} />
          </button>
        </div>

        {/* Cart Item list */}
        <div className="pos-cart-list">
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <ShoppingCart size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.85rem' }}>El carrito está vacío</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.variant_id} className="pos-cart-item">
                <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.product_name}
                    </span>
                    <button 
                      className="btn" 
                      style={{ padding: '0.25rem', border: 'none', background: 'none', color: 'var(--danger)' }}
                      onClick={() => removeFromCart(item.variant_id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                    Size: {item.size || 'Única'} | Color: {item.color || 'N/A'}
                  </span>
                  
                  {/* Prices & item discounts */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    
                    {/* Quantity Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.15rem 0.35rem', minWidth: 'unset', height: '24px' }}
                        onClick={() => updateCartQuantity(item.variant_id, item.quantity - 1)}
                      >
                        <Minus size={10} />
                      </button>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', width: '24px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.15rem 0.35rem', minWidth: 'unset', height: '24px' }}
                        onClick={() => updateCartQuantity(item.variant_id, item.quantity + 1)}
                      >
                        <Plus size={10} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {/* Item discount input */}
                      <Percent size={10} style={{ color: 'var(--text-muted)' }} />
                      <input 
                        type="number" 
                        className="form-control"
                        style={{ width: '45px', padding: '0.1rem 0.25rem', fontSize: '0.75rem', height: '22px', textAlign: 'center' }}
                        min="0"
                        max="100"
                        value={item.discount || ''}
                        placeholder="%"
                        onChange={(e) => updateCartDiscount(item.variant_id, parseInt(e.target.value, 10) || 0)}
                      />
                    </div>

                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout panel */}
        <div className="pos-checkout">
          
          {checkoutError && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'start', 
              gap: '0.5rem', 
              backgroundColor: 'var(--danger-light)', 
              color: 'var(--danger)', 
              padding: '0.75rem', 
              borderRadius: 'var(--radius-sm)', 
              fontSize: '0.8rem', 
              marginBottom: '1rem' 
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{checkoutError}</span>
            </div>
          )}

          {/* Subtotals & tax desglose */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
              <span>{formatCurrency(cartTotals.subtotal)}</span>
            </div>
            
            {/* General Discount */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                Descuento General:
                <input 
                  type="number"
                  className="form-control"
                  style={{ width: '45px', height: '20px', padding: '0 0.25rem', fontSize: '0.75rem', display: 'inline-block' }}
                  min="0"
                  max="100"
                  value={cartDiscount || ''}
                  onChange={(e) => setCartDiscount(parseInt(e.target.value, 10) || 0)}
                />
                %
              </span>
              <span style={{ color: 'var(--danger)' }}>-{formatCurrency(cartTotals.discountAmount)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                IVA ({parseFloat(settings.store_tax_rate || '0.16') * 100}%):
                <small style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-muted)' }}>
                  {settings.store_tax_included !== 'false' ? '(incluido)' : '(por cobrar)'}
                </small>
              </span>
              <span>{formatCurrency(cartTotals.taxAmount)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--primary)' }}>
              <span>Total:</span>
              <span>{formatCurrency(cartTotals.total)}</span>
            </div>
          </div>

          {/* Payment selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <label className="form-label" style={{ marginBottom: '0.25rem' }}>Método de Pago</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
              <button 
                type="button" 
                className={`btn ${paymentMethod === 'cash' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                onClick={() => setPaymentMethod('cash')}
              >
                Efectivo
              </button>
              <button 
                type="button" 
                className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                onClick={() => setPaymentMethod('card')}
              >
                Tarjeta
              </button>
              <button 
                type="button" 
                className={`btn ${paymentMethod === 'transfer' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                onClick={() => setPaymentMethod('transfer')}
              >
                Transferencia
              </button>
              <button 
                type="button" 
                className={`btn ${paymentMethod === 'mixed' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                onClick={() => setPaymentMethod('mixed')}
              >
                Mixto
              </button>
            </div>
          </div>

          {/* Cash Received Input */}
          {(paymentMethod === 'cash' || paymentMethod === 'mixed') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', backgroundColor: 'var(--bg-hover)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              {paymentMethod === 'cash' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Efectivo Recibido:</span>
                    <input 
                      type="number" 
                      className="form-control"
                      style={{ width: '120px', height: '30px' }}
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  {cashReceived > cartTotals.total && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--success)', fontWeight: 700 }}>
                      <span>Cambio a devolver:</span>
                      <span>{formatCurrency(cashReceived - cartTotals.total)}</span>
                    </div>
                  )}
                </>
              ) : (
                // Mixed payments
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>Desglose de Pago Mixto</span>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem' }}>Efectivo:</span>
                    <input 
                      type="number" 
                      className="form-control"
                      style={{ width: '100px', height: '26px', fontSize: '0.8rem' }}
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem' }}>Tarjeta:</span>
                    <input 
                      type="number" 
                      className="form-control"
                      style={{ width: '100px', height: '26px', fontSize: '0.8rem' }}
                      value={cardReceived || ''}
                      onChange={(e) => setCardReceived(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem' }}>Transferencia:</span>
                    <input 
                      type="number" 
                      className="form-control"
                      style={{ width: '100px', height: '26px', fontSize: '0.8rem' }}
                      value={transferReceived || ''}
                      onChange={(e) => setTransferReceived(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.25rem', fontWeight: 600 }}>
                    <span>Registrado: {formatCurrency(cashReceived + cardReceived + transferReceived)}</span>
                    <span style={{ color: Math.abs((cashReceived + cardReceived + transferReceived) - cartTotals.total) > 0.01 ? 'var(--danger)' : 'var(--success)' }}>
                      Faltan: {formatCurrency(Math.max(0, cartTotals.total - (cashReceived + cardReceived + transferReceived)))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Checkout Button */}
          <button 
            type="button" 
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', borderRadius: 'var(--radius-sm)' }}
            onClick={handleCheckout}
            disabled={cart.length === 0 || loadingCheckout}
          >
            {loadingCheckout ? 'Procesando...' : 'Cobrar e Imprimir Ticket'}
          </button>
        </div>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {isCustomerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Registrar Cliente Rápido</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem', border: 'none', background: 'none' }} onClick={() => setIsCustomerModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleQuickAddCustomer}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Cliente *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Sofia Vergara"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. 5512345678"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Ej. sofia@ejemplo.com"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Comentarios rápidos"
                    value={newCustNotes}
                    onChange={(e) => setNewCustNotes(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCustomerModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SIMULATED PRINT RECEIPT MODAL */}
      {printedSale && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Venta Procesada con Éxito</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem', border: 'none', background: 'none' }} onClick={() => setPrintedSale(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ backgroundColor: '#fff', color: '#000', padding: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Receipt Area (for screen review and print capture) */}
              <div className="print-area ticket-print" style={{ margin: '0 auto', fontFamily: 'monospace', fontSize: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0' }}>{settings.store_name || 'ANTARA'}</h3>
                  <p style={{ margin: 0 }}>{settings.store_address || 'Av. Andrés Bello 12, CDMX'}</p>
                  <p style={{ margin: 0 }}>Tel: {settings.store_phone || '5512345678'}</p>
                  <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
                  <h4 style={{ margin: '0.25rem 0' }}>TICKET DE COMPRA</h4>
                  <p style={{ margin: 0 }}>Venta #{printedSale.id}</p>
                  <p style={{ margin: 0 }}>
                    {new Date(printedSale.created_at).toLocaleString('es-MX')}
                  </p>
                  <p style={{ margin: 0 }}>Atendido por: {printedSale.user_username}</p>
                  <p style={{ margin: 0 }}>Cliente: {printedSale.client_name || 'Público General'}</p>
                </div>
                
                <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
                
                {/* Items */}
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px dashed #000' }}>
                      <th style={{ textAlign: 'left', background: 'none', padding: '2px 0', color: '#000' }}>Desc</th>
                      <th style={{ textAlign: 'center', background: 'none', padding: '2px 0', color: '#000' }}>Cant</th>
                      <th style={{ textAlign: 'right', background: 'none', padding: '2px 0', color: '#000' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(printedSale.items || []).map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                          {item.product_name}
                          <div style={{ fontSize: '10px', color: '#555' }}>
                            Talla: {item.size || 'Única'} | Color: {item.color || 'N/A'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '4px 0', verticalAlign: 'top' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '4px 0', verticalAlign: 'top' }}>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
                
                {/* Totals */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '40%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>{formatCurrency(printedSale.subtotal)}</span>
                  </div>
                  {printedSale.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333' }}>
                      <span>Desc:</span>
                      <span>-{formatCurrency(printedSale.discount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>IVA:</span>
                    <span>{formatCurrency(printedSale.tax)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '13px' }}>
                    <span>Total:</span>
                    <span>{formatCurrency(printedSale.total)}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
                
                <div style={{ textAlign: 'center', fontSize: '10px' }}>
                  <p style={{ margin: '0.25rem 0' }}>Método de Pago: {printedSale.payment_method.toUpperCase()}</p>
                  {printedSale.payment_method === 'cash' && (
                    <>
                      <p style={{ margin: 0 }}>Efectivo Recibido: {formatCurrency(printedSale.cash_received)}</p>
                      <p style={{ margin: 0 }}>Cambio: {formatCurrency(printedSale.cash_received - printedSale.total)}</p>
                    </>
                  )}
                  <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
                  <p style={{ fontStyle: 'italic', fontWeight: 600 }}>{settings.ticket_footer || '¡Gracias por su compra en ANTARA!'}</p>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setPrintedSale(null)}>
                Cerrar
              </button>
              <button type="button" className="btn btn-primary" onClick={triggerPrintReceipt}>
                <Receipt size={16} />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default POS;
