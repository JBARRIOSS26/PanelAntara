# ANTARA - Sistema de Punto de Venta

Panel administrativo y punto de venta (POS) para la tienda de ropa **ANTARA**.

## 🚀 Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Base de datos | SQLite (archivo local) |
| Estilos | Vanilla CSS con variables HSL |

## 📦 Módulos

- **Dashboard** — Indicadores clave del día y del mes, productos de bajo inventario y más vendidos.
- **POS** — Punto de venta con soporte de lector de código de barras, carrito, cobro mixto y ticket.
- **Productos** — CRUD de productos con variantes (talla, color, precio, SKU, código de barras).
- **Inventario** — Registro de entradas, salidas y ajustes de stock con historial.
- **Ventas** — Historial de ventas con posibilidad de reimprimir ticket o cancelar (revierte stock).
- **Clientes** — Directorio con historial de compras.
- **Etiquetas** — Impresión de etiquetas con código de barras para impresoras térmicas o hoja carta.
- **Reportes** — Reportes de ventas por período, por producto y por propietaria.
- **Configuración** — Nombre, dirección, IVA, logo de la tienda.
- **Usuarios** — Administración de empleados y roles/permisos.

## ⚙️ Instalación y Ejecución

### Prerrequisitos
- Node.js 18+
- npm

### Pasos

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/JBARRIOSS26/PanelAntara.git
   cd PanelAntara
   ```

2. **Instala las dependencias raíz**
   ```bash
   npm install
   ```

3. **Instala dependencias del backend**
   ```bash
   cd backend && npm install && cd ..
   ```

4. **Instala dependencias del frontend**
   ```bash
   cd frontend && npm install && cd ..
   ```

5. **Levanta ambos servidores en paralelo**
   ```bash
   npm run dev
   ```
   - Backend: [http://localhost:3001](http://localhost:3001)
   - Frontend: [http://localhost:5173](http://localhost:5173)

### Credenciales por defecto

| Usuario | Contraseña |
|---|---|
| `admin` | `admin123` |

> ⚠️ Cambia la contraseña del administrador después del primer inicio de sesión.

## 📁 Estructura del Proyecto

```
PanelAntara/
├── backend/            # API REST (Express + TypeScript + SQLite)
│   ├── src/
│   │   ├── database/   # Conexión y migraciones SQLite
│   │   ├── models/     # Tipos TypeScript
│   │   ├── repositories/ # Acceso a datos
│   │   ├── routes/     # Endpoints REST
│   │   └── index.ts    # Punto de entrada
│   └── package.json
├── frontend/           # SPA (React + TypeScript + Vite)
│   ├── src/
│   │   ├── components/ # Componentes reutilizables
│   │   ├── context/    # Estado global (AppContext)
│   │   ├── pages/      # Vistas/módulos
│   │   ├── services/   # Cliente HTTP (api.ts)
│   │   └── types/      # Tipos TypeScript compartidos
│   └── package.json
└── package.json        # Scripts raíz (concurrently)
```
