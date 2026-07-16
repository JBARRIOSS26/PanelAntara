import React, { useState, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import api from '../services/api';
import type { Product } from '../types';
import { Trash2, Printer } from 'lucide-react';

interface BatchLabelItem {
  id: number;
  productName: string;
  variantId: number;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  price: number;
  ownerName: string;
  copies: number;
}

const BarcodeCode39: React.FC<{ value: string }> = ({ value }) => {
  const cleanValue = (value || '').toUpperCase();
  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    if (!cleanValue) return;
    try {
      const canvas = document.createElement('canvas');
      // ¡CRÍTICO! Generar en escala 1:1 exacta para evitar interpolación del navegador.
      // Si la imagen se escala con CSS, el navegador crea píxeles grises que el
      // driver de la impresora convierte en sombras punteadas (efecto encimado).
      JsBarcode(canvas, cleanValue, {
        format: 'CODE39',
        width: 1,  
        height: 25,
        displayValue: false,
        margin: 2,
        background: '#ffffff',
        lineColor: '#000000'
      });
      setImgSrc(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error('Error generando código de barras:', err);
    }
  }, [cleanValue]);

  if (!imgSrc) return <div style={{ height: '32px' }} />;

  return (
    <div
      className="label-barcode-img-container"
      style={{
        display: 'flex',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
      }}
    >
      <img 
        src={imgSrc} 
        alt={cleanValue}
        style={{
          display: 'block',
          maxWidth: '90%',
          height: 'auto'
        }} 
      />
    </div>
  );
};

export const Labels: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [copies, setCopies] = useState<number>(1);

  // Printing Configuration
  const [labelSize, setLabelSize] = useState<'thermal' | 'sheet'>('thermal');
  const [batch, setBatch] = useState<BatchLabelItem[]>([]);

  const loadData = async () => {
    try {
      const data = await api.products.list();
      setProducts(data.filter(p => p.status === 1));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getSelectedProductVariants = () => {
    if (!selectedProductId) return [];
    const prod = products.find(p => p.id === parseInt(selectedProductId, 10));
    return prod ? prod.variants || [] : [];
  };

  const handleAddIndividual = () => {
    if (!selectedVariantId) return;

    const prod = products.find(p => p.id === parseInt(selectedProductId, 10));
    const variant = prod?.variants.find(v => v.id === parseInt(selectedVariantId, 10));

    if (prod && variant) {
      // Código corto: ID numérico cero-padded a 8 dígitos.
      // Más corto = barras más gruesas en 40mm = escaner lee mejor.
      // El sistema identifica la prenda por este ID en /api/products/variants/:id
      const shortCode = String(variant.id).padStart(8, '0');
      const newItem: BatchLabelItem = {
        id: Date.now() + Math.random(),
        productName: prod.name,
        variantId: variant.id,
        sku: variant.sku || `SKU-${variant.id}`,
        barcode: shortCode,
        size: variant.size || 'Única',
        color: variant.color || 'N/A',
        price: variant.sell_price,
        ownerName: prod.owner_name || 'ANTARA',
        copies: copies
      };

      setBatch(prev => [...prev, newItem]);
      setCopies(1);
      setSelectedVariantId('');
    }
  };

  const handleAddWholeProductBatch = () => {
    if (!selectedProductId) return;

    const prod = products.find(p => p.id === parseInt(selectedProductId, 10));
    if (prod && prod.variants) {
      const newItems = prod.variants.map(v => ({
        id: Date.now() + Math.random() + v.id,
        productName: prod.name,
        variantId: v.id,
        sku: v.sku || `SKU-${v.id}`,
        barcode: String(v.id).padStart(8, '0'), // Código corto numérico
        size: v.size || 'Única',
        color: v.color || 'N/A',
        price: v.sell_price,
        ownerName: prod.owner_name || 'ANTARA',
        copies: copies
      }));

      setBatch(prev => [...prev, ...newItems]);
      setCopies(1);
      setSelectedProductId('');
      setSelectedVariantId('');
    }
  };

  const handleRemoveItem = (id: number) => {
    setBatch(prev => prev.filter(item => item.id !== id));
  };

  const handleClearBatch = () => {
    if (window.confirm('¿Desea vaciar el lote de etiquetas actual?')) {
      setBatch([]);
    }
  };

  // Convert batch item copies into a flat list of individual labels to render
  const getFlatLabelsList = (): BatchLabelItem[] => {
    const list: BatchLabelItem[] = [];
    batch.forEach(item => {
      for (let i = 0; i < item.copies; i++) {
        list.push(item);
      }
    });
    return list;
  };

  const triggerPrint = () => {
    const printClass = labelSize === 'thermal' ? 'print-label-thermal' : 'print-label-sheet';
    document.documentElement.classList.add(printClass);
    window.print();
    document.documentElement.classList.remove(printClass);
  };

  const flatLabels = getFlatLabelsList();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="screen-only" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Side: Label Builder form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Generador de Etiquetas</h3>
          
          <div className="form-group">
            <label className="form-label">Producto</label>
            <select
              className="form-control"
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setSelectedVariantId('');
              }}
            >
              <option value="">Seleccione un producto...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Variante Específica (Para etiqueta individual)</label>
            <select
              className="form-control"
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              disabled={!selectedProductId}
            >
              <option value="">Seleccione variante...</option>
              {getSelectedProductVariants().map(v => (
                <option key={v.id} value={v.id}>
                  {v.size || 'Única'} - {v.color || 'N/A'} (SKU: {v.sku || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Cantidad de copias por etiqueta</label>
            <input
              type="number"
              className="form-control"
              min="1"
              value={copies || ''}
              onChange={(e) => setCopies(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={handleAddWholeProductBatch}
              disabled={!selectedProductId}
            >
              Añadir Todo el Producto
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleAddIndividual}
              disabled={!selectedVariantId}
            >
              Añadir Variante
            </button>
          </div>
        </div>

        {/* Right Side: Printing configuration */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Formato de Impresión</h3>

          <div className="form-group">
            <label className="form-label">Tamaño / Dispositivo</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn ${labelSize === 'thermal' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '0.5rem' }}
                onClick={() => setLabelSize('thermal')}
              >
                Impresora Térmica (40mm x 30mm)
              </button>
              <button
                type="button"
                className={`btn ${labelSize === 'sheet' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '0.5rem' }}
                onClick={() => setLabelSize('sheet')}
              >
                Hoja Adhesiva Carta (4x9)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'var(--bg-hover)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Resumen de Impresión:</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span>Diferentes variantes:</span>
              <span>{batch.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span>Total etiquetas a imprimir:</span>
              <span>{flatLabels.length}</span>
            </div>
            {labelSize === 'sheet' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: flatLabels.length > 36 ? 'var(--warning)' : 'inherit' }}>
                <span>Hojas de papel estimadas:</span>
                <span>{Math.ceil(flatLabels.length / 36)}</span>
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--success, #22c55e)', marginTop: '0.25rem' }}>
              ✓ Motor de código de barras HTML de alta fidelidad activo
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={flatLabels.length === 0}
            onClick={triggerPrint}
          >
            <Printer size={18} /><span>Imprimir Lote ({flatLabels.length})</span>
          </button>
        </div>
      </div>

      {/* Batch Content List */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Detalle de Lote para Impresión</h3>
          {batch.length > 0 && (
            <button className="btn btn-danger" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }} onClick={handleClearBatch}>
              Limpiar Lote
            </button>
          )}
        </div>

        {batch.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
            No hay etiquetas en el lote. Agregue productos arriba.
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Variante (Talla/Color)</th>
                  <th>Socia / Dueña</th>
                  <th>Código de Barras / SKU</th>
                  <th>Precio</th>
                  <th>Copias</th>
                  <th style={{ textAlign: 'right' }}>Eliminar</th>
                </tr>
              </thead>
              <tbody>
                {batch.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.productName}</td>
                    <td>Talla: {item.size} | Color: {item.color}</td>
                    <td>
                      <span className="badge badge-primary">{item.ownerName}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>Cod: <span style={{ fontFamily: 'monospace' }}>{item.barcode}</span></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: <span style={{ fontFamily: 'monospace' }}>{item.sku}</span></div>
                    </td>
                    <td style={{ fontWeight: 700 }}>${item.price}</td>
                    <td>
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: '65px', padding: '0.25rem 0.5rem', height: '30px' }}
                        min="1"
                        value={item.copies}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          setBatch(prev => prev.map(o => o.id === item.id ? { ...o, copies: val } : o));
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-danger" style={{ padding: '0.375rem' }} onClick={() => handleRemoveItem(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visual Live Preview area (which doubles as print-area during window.print) */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.15rem' }}>Vista Previa de Impresión</h3>
        
        {flatLabels.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
            Agrega productos para ver la previsualización de las etiquetas.
          </p>
        ) : (
          <div className="label-preview-grid">
            {flatLabels.map((lbl, idx) => (
              <div 
                key={idx} 
                className={`antara-label ${labelSize === 'thermal' ? 'thermal' : 'sheet'}`}
                style={{ boxShadow: '0 2px 5px rgba(0,0,0,0.1)', margin: '5px auto' }}
              >
                {/* Solo Talla */}
                <div className="label-details" style={{ fontSize: '8px' }}>
                  <span>Size: {lbl.size}</span>
                </div>
                {/* Código de barras */}
                <BarcodeCode39 value={lbl.barcode} />
                {/* Precio */}
                <div style={{ width: '100%', textAlign: 'center', marginTop: '1px' }}>
                  <span className="label-price" style={{ fontSize: '11px' }}>${lbl.price}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div> {/* Close screen-only */}

      {/* HIDDEN PRINT CONTAINER */}
      <div className="print-only">
        <div className="print-area">
          {labelSize === 'sheet' ? (
            // Sheet Grid Avery 4x9 (36 labels per sheet)
            Array.from({ length: Math.ceil(flatLabels.length / 36) }).map((_, sheetIdx) => (
              <div key={sheetIdx} className="print-sheet">
                {flatLabels.slice(sheetIdx * 36, (sheetIdx + 1) * 36).map((lbl, idx) => (
                  <div key={idx} className="antara-label sheet">
                    {/* Solo Talla */}
                    <div className="label-details">
                      <span>Size: {lbl.size}</span>
                    </div>
                    {/* Código de barras */}
                    <BarcodeCode39 value={lbl.barcode} />
                    {/* Precio */}
                    <div style={{ width: '100%', textAlign: 'center', marginTop: '2px' }}>
                      <span className="label-price">${lbl.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            // Thermal Roll — solo talla, barcode y precio
            <div className="print-thermal">
              {flatLabels.map((lbl, idx) => (
                <div key={idx} className="antara-label thermal lbl-print">
                  <div className="label-title">ANTARA</div>
                  <div className="label-details" style={{ margin: '1px 0' }}>
                    <span>Size: {lbl.size}</span>
                  </div>
                  {/* Código de barras */}
                  <BarcodeCode39 value={lbl.barcode} />
                  {/* Precio centrado */}
                  <div className="lbl-price-row">
                    <span className="label-price">${lbl.price}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
export default Labels;
