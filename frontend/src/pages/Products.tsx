import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Product, Category, Brand, Propietaria } from '../types';
import { Plus, Edit2, Trash2, Search, X, PlusCircle, MinusCircle, AlertTriangle } from 'lucide-react';

interface VariantFormInput {
  id?: number;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  status: number;
}

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [owners, setOwners] = useState<Propietaria[]>([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal Form State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Product fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [status, setStatus] = useState<number>(1);

  // Variants list state
  const [variants, setVariants] = useState<VariantFormInput[]>([
    { sku: '', barcode: '', size: '', color: '', buy_price: 0, sell_price: 0, stock: 0, status: 1 }
  ]);
  
  const [modalError, setModalError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodData, catData, brandData, ownerData] = await Promise.all([
        api.products.list(),
        api.catalogs.listCategories(),
        api.catalogs.listBrands(),
        api.catalogs.listOwners()
      ]);
      setProducts(prodData);
      setCategories(catData.filter(c => c.status === 1));
      setBrands(brandData.filter(b => b.status === 1));
      setOwners(ownerData);
    } catch (err) {
      setError('Error al cargar la información del catálogo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (prod?: Product) => {
    setModalError('');
    if (prod) {
      setSelectedProduct(prod);
      setName(prod.name);
      setDescription(prod.description || '');
      setCategoryId(prod.category_id ? prod.category_id.toString() : '');
      setBrandId(prod.brand_id ? prod.brand_id.toString() : '');
      setOwnerId(prod.owner_id ? prod.owner_id.toString() : '');
      setStatus(prod.status);

      // Load variants
      const mappedVariants = (prod.variants || []).map(v => ({
        id: v.id,
        sku: v.sku || '',
        barcode: v.barcode || '',
        size: v.size || '',
        color: v.color || '',
        buy_price: v.buy_price,
        sell_price: v.sell_price,
        stock: v.stock,
        status: v.status
      }));
      setVariants(mappedVariants.length > 0 ? mappedVariants : [
        { sku: '', barcode: '', size: '', color: '', buy_price: 0, sell_price: 0, stock: 0, status: 1 }
      ]);
    } else {
      setSelectedProduct(null);
      setName('');
      setDescription('');
      setCategoryId('');
      setBrandId('');
      setOwnerId('');
      setStatus(1);
      setVariants([{ sku: '', barcode: '', size: '', color: '', buy_price: 0, sell_price: 0, stock: 0, status: 1 }]);
    }
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setSelectedProduct(null);
    setName('');
    setDescription('');
    setCategoryId('');
    setBrandId('');
    setOwnerId('');
    setStatus(1);
    setVariants([{ sku: '', barcode: '', size: '', color: '', buy_price: 0, sell_price: 0, stock: 0, status: 1 }]);
  };

  const handleAddVariantRow = () => {
    setVariants([
      ...variants,
      { sku: '', barcode: '', size: '', color: '', buy_price: 0, sell_price: 0, stock: 0, status: 1 }
    ]);
  };

  const handleRemoveVariantRow = (index: number) => {
    if (variants.length === 1) return;
    setVariants(variants.filter((_, idx) => idx !== index));
  };

  const handleVariantChange = (index: number, field: keyof VariantFormInput, value: any) => {
    setVariants(prev => prev.map((v, idx) => {
      if (idx !== index) return v;
      return { ...v, [field]: value };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!name.trim()) {
      setModalError('El nombre del producto es obligatorio.');
      return;
    }

    if (variants.length === 0) {
      setModalError('Se requiere al menos una variante.');
      return;
    }

    // Basic variant checks
    for (const v of variants) {
      if (v.buy_price < 0 || v.sell_price < 0) {
        setModalError('Los precios de compra y venta no pueden ser negativos.');
        return;
      }
      if (v.stock < 0) {
        setModalError('El stock de las variantes no puede ser negativo.');
        return;
      }
    }

    // Helper: auto generate SKUs/Barcodes if blank to avoid SQL Unique errors
    const processedVariants = variants.map((v, index) => {
      let finalSku = v.sku.trim();
      let finalBarcode = v.barcode.trim();

      // If SKU is empty, auto-generate: PROD-[TIMESTAMP]-[INDEX]
      if (!finalSku) {
        const cleanName = name.replace(/\s+/g, '-').toUpperCase().substring(0, 5);
        const ownerCode = owners.find(o => o.id === parseInt(ownerId))?.code || 'GEN';
        const timestamp = Date.now().toString().slice(-4);
        finalSku = `SKU-${ownerCode}-${cleanName}-${timestamp}-${index}`;
      }

      // If Barcode is empty, copy SKU or set to SKU
      if (!finalBarcode) {
        finalBarcode = finalSku;
      }

      return {
        ...v,
        sku: finalSku,
        barcode: finalBarcode
      };
    });

    const payload = {
      name,
      description,
      category_id: categoryId ? parseInt(categoryId, 10) : null,
      brand_id: brandId ? parseInt(brandId, 10) : null,
      owner_id: ownerId ? parseInt(ownerId, 10) : null,
      status,
      variants: processedVariants
    };

    try {
      if (selectedProduct) {
        await api.products.update(selectedProduct.id, payload);
      } else {
        await api.products.create(payload);
      }
      handleCloseModal();
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Error al guardar producto.');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`¿Está seguro de que desea eliminar el producto "${name}" y todas sus variantes?\nEsta acción no se puede deshacer.`)) {
      try {
        await api.products.delete(id);
        loadData();
      } catch (err: any) {
        alert(err.message || 'Error al eliminar producto.');
      }
    }
  };

  // Filter products locally
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.variants.some(v => 
        (v.sku && v.sku.toLowerCase().includes(search.toLowerCase())) || 
        (v.barcode && v.barcode.toLowerCase().includes(search.toLowerCase()))
      );
    
    const matchesCat = selectedCat ? p.category_id === parseInt(selectedCat, 10) : true;
    const matchesBrand = selectedBrand ? p.brand_id === parseInt(selectedBrand, 10) : true;
    const matchesOwner = selectedOwner ? p.owner_id === parseInt(selectedOwner, 10) : true;

    return matchesSearch && matchesCat && matchesBrand && matchesOwner;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Search & Filters */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '38px' }}
            placeholder="Buscar por producto, SKU o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select 
          className="form-control" 
          style={{ width: '180px' }}
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
        >
          <option value="">Todas Categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select 
          className="form-control" 
          style={{ width: '180px' }}
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
        >
          <option value="">Todas Marcas</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <select 
          className="form-control" 
          style={{ width: '180px' }}
          value={selectedOwner}
          onChange={(e) => setSelectedOwner(e.target.value)}
        >
          <option value="">Todas Socias</option>
          {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>

        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          <span>Añadir Producto</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Cargando productos...</p>
      ) : filteredProducts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <p>No se encontraron productos en el catálogo.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Socia</th>
                <th>Categoría / Marca</th>
                <th>Variantes (Talla - Color / Stock)</th>
                <th>Precio Venta</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const totalStock = p.variants.reduce((acc, curr) => acc + curr.stock, 0);
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {p.description || 'Sin descripción'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-primary">{p.owner_name || 'Sin Asignar'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
                        <span>Cat: {p.category_name || 'N/A'}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Marca: {p.brand_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {p.variants.map((v, idx) => (
                          <span key={idx} className="badge" style={{ 
                            backgroundColor: v.stock === 0 ? 'var(--danger-light)' : 'var(--bg-hover)', 
                            color: v.stock === 0 ? 'var(--danger)' : 'var(--text-main)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.7rem'
                          }}>
                            {v.size || 'Única'}-{v.color || 'N/A'}: <strong>{v.stock}u.</strong>
                          </span>
                        ))}
                        {p.variants.length > 0 && (
                          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                            Total: {totalStock} u.
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {p.variants.length > 0 ? (
                        p.variants.length === 1 ? (
                          `$${p.variants[0].sell_price}`
                        ) : (
                          `$${Math.min(...p.variants.map(v => v.sell_price))} - $${Math.max(...p.variants.map(v => v.sell_price))}`
                        )
                      ) : '$0.00'}
                    </td>
                    <td>
                      <span className={`badge ${p.status === 1 ? 'badge-success' : 'badge-danger'}`}>
                        {p.status === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.375rem 0.50rem' }}
                          onClick={() => handleOpenModal(p)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.375rem 0.50rem' }}
                          onClick={() => handleDelete(p.id, p.name)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal CRUD Product */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content wide">
            <div className="modal-header">
              <h3>{selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem', border: 'none', background: 'none' }} onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {modalError && (
                  <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    {modalError}
                  </div>
                )}
                
                {/* General Info */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Nombre del Producto *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. Playera Oversize"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Socia / Propietaria *</label>
                    <select 
                      className="form-control" 
                      value={ownerId} 
                      onChange={(e) => setOwnerId(e.target.value)}
                      required
                    >
                      <option value="">Seleccione Socia...</option>
                      {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <select 
                      className="form-control" 
                      value={categoryId} 
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      <option value="">Ninguna...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Marca</label>
                    <select 
                      className="form-control" 
                      value={brandId} 
                      onChange={(e) => setBrandId(e.target.value)}
                    >
                      <option value="">Ninguna...</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Descripción</label>
                    <textarea 
                      className="form-control" 
                      rows={2} 
                      placeholder="Breve descripción del material, tipo..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select 
                      className="form-control" 
                      value={status} 
                      onChange={(e) => setStatus(parseInt(e.target.value, 10))}
                    >
                      <option value={1}>Activo</option>
                      <option value={0}>Inactivo</option>
                    </select>
                  </div>
                </div>

                {/* Variants Section */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '1rem' }}>Variantes del Producto</h4>
                    <button type="button" className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.85rem' }} onClick={handleAddVariantRow}>
                      <PlusCircle size={14} />
                      <span>Añadir Variante</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {variants.map((variant, idx) => (
                      <div key={idx} style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 1fr 1.5fr 1.5fr auto',
                        gap: '0.5rem',
                        alignItems: 'center',
                        backgroundColor: 'var(--bg-hover)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)'
                      }}>
                        {/* Size */}
                        <div>
                          <input
                            type="text"
                            className="form-control"
                            style={{ padding: '0.375rem 0.5rem', fontSize: '0.85rem' }}
                            placeholder="Talla (M, G, 32)"
                            value={variant.size}
                            onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                          />
                        </div>

                        {/* Color */}
                        <div>
                          <input
                            type="text"
                            className="form-control"
                            style={{ padding: '0.375rem 0.5rem', fontSize: '0.85rem' }}
                            placeholder="Color (Blanco)"
                            value={variant.color}
                            onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                          />
                        </div>

                        {/* Buy Price */}
                        <div>
                          <input
                            type="number"
                            className="form-control"
                            style={{ padding: '0.375rem 0.5rem', fontSize: '0.85rem' }}
                            placeholder="P. Compra"
                            value={variant.buy_price || ''}
                            onChange={(e) => handleVariantChange(idx, 'buy_price', parseFloat(e.target.value) || 0)}
                            min={0}
                            required
                          />
                        </div>

                        {/* Sell Price */}
                        <div>
                          <input
                            type="number"
                            className="form-control"
                            style={{ padding: '0.375rem 0.5rem', fontSize: '0.85rem' }}
                            placeholder="P. Venta"
                            value={variant.sell_price || ''}
                            onChange={(e) => handleVariantChange(idx, 'sell_price', parseFloat(e.target.value) || 0)}
                            min={0}
                            required
                          />
                        </div>

                        {/* Stock */}
                        <div>
                          <input
                            type="number"
                            className="form-control"
                            style={{ padding: '0.375rem 0.5rem', fontSize: '0.85rem' }}
                            placeholder="Stock"
                            value={variant.stock || ''}
                            onChange={(e) => handleVariantChange(idx, 'stock', parseInt(e.target.value, 10) || 0)}
                            min={0}
                            required
                          />
                        </div>

                        {/* SKU */}
                        <div>
                          <input
                            type="text"
                            className="form-control"
                            style={{ padding: '0.375rem 0.5rem', fontSize: '0.85rem', fontFamily: 'monospace' }}
                            placeholder="SKU (opcional)"
                            value={variant.sku}
                            onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                          />
                        </div>

                        {/* Barcode */}
                        <div>
                          <input
                            type="text"
                            className="form-control"
                            style={{ padding: '0.375rem 0.5rem', fontSize: '0.85rem', fontFamily: 'monospace' }}
                            placeholder="Cod. Barras (opcional)"
                            value={variant.barcode}
                            onChange={(e) => handleVariantChange(idx, 'barcode', e.target.value)}
                          />
                        </div>

                        {/* Remove Row Button */}
                        <div>
                          <button 
                            type="button" 
                            className="btn btn-danger" 
                            style={{ padding: '0.375rem', minWidth: 'unset', width: '32px', height: '32px' }}
                            onClick={() => handleRemoveVariantRow(idx)}
                            disabled={variants.length === 1}
                          >
                            <MinusCircle size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.75rem' }}>
                    <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
                    <span>Si deja los campos de SKU y Código de barras vacíos, el sistema los autogenerará automáticamente al guardar.</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Products;
