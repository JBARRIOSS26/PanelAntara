import { Router } from 'express';
import { getDB } from '../database/connection';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/reports/dashboard - KPI Summary
router.get('/dashboard', authMiddleware, async (_req, res) => {
  try {
    const db = await getDB();

    // 1. Sales today
    const salesToday = await db.get(`
      SELECT COALESCE(SUM(total), 0) as total 
      FROM sales 
      WHERE date(created_at) = date('now', 'localtime') AND status = 'completed'
    `);

    // 2. Sales this month
    const salesMonth = await db.get(`
      SELECT COALESCE(SUM(total), 0) as total 
      FROM sales 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime') AND status = 'completed'
    `);

    // 3. Count products with low stock (<= 5)
    const lowStock = await db.get(`
      SELECT COUNT(*) as count 
      FROM product_variants 
      WHERE stock > 0 AND stock <= 5 AND status = 1
    `);

    // 4. Count out of stock products
    const outOfStock = await db.get(`
      SELECT COUNT(*) as count 
      FROM product_variants 
      WHERE stock = 0 AND status = 1
    `);

    // 5. Total unique products sold
    const itemsSold = await db.get(`
      SELECT COALESCE(SUM(quantity), 0) as total_qty 
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed' AND date(s.created_at) = date('now', 'localtime')
    `);

    // 6. Top 5 selling products
    const topSelling = await db.all(`
      SELECT p.name, pv.size, pv.color, pv.sku, COALESCE(SUM(si.quantity), 0) as sold_qty
      FROM sale_items si
      JOIN product_variants pv ON si.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed'
      GROUP BY si.variant_id
      ORDER BY sold_qty DESC
      LIMIT 5
    `);

    // 7. Last 5 sales
    const latestSales = await db.all(`
      SELECT s.*, c.name as client_name
      FROM sales s
      LEFT JOIN customers c ON s.client_id = c.id
      ORDER BY s.id DESC
      LIMIT 5
    `);

    // 8. Low Stock variants list
    const lowStockVariants = await db.all(`
      SELECT pv.id, p.name, pv.size, pv.color, pv.sku, pv.stock
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.stock <= 5 AND pv.status = 1
      ORDER BY pv.stock ASC
      LIMIT 10
    `);

    return res.json({
      salesToday: salesToday?.total || 0,
      salesMonth: salesMonth?.total || 0,
      lowStockCount: lowStock?.count || 0,
      outOfStockCount: outOfStock?.count || 0,
      itemsSoldToday: itemsSold?.total_qty || 0,
      topSelling,
      latestSales,
      lowStockVariants
    });
  } catch (error) {
    console.error('Error loading dashboard report:', error);
    return res.status(500).json({ error: 'Error al generar el reporte del panel.' });
  }
});

// GET /api/reports/analytics - Custom Date Range Reports
router.get('/analytics', authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query;

  let dateFilter = '';
  const params: any[] = [];

  if (startDate) {
    dateFilter += ' AND date(s.created_at) >= date(?)';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND date(s.created_at) <= date(?)';
    params.push(endDate);
  }

  try {
    const db = await getDB();

    // 1. Sales history grouped by date (for charts)
    const salesTimeline = await db.all(`
      SELECT date(s.created_at) as date, 
             COALESCE(SUM(s.total), 0) as total,
             COALESCE(SUM(s.subtotal), 0) as subtotal,
             COUNT(s.id) as sales_count
      FROM sales s
      WHERE s.status = 'completed' ${dateFilter}
      GROUP BY date(s.created_at)
      ORDER BY date ASC
    `, params);

    // 2. Sales by user (employee performance)
    const salesByUser = await db.all(`
      SELECT u.username, 
             COUNT(s.id) as sales_count,
             COALESCE(SUM(s.total), 0) as total_sales
      FROM sales s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'completed' ${dateFilter}
      GROUP BY s.user_id
      ORDER BY total_sales DESC
    `, params);

    // 3. Sales by owner (socia/propietaria distribution)
    const salesByOwner = await db.all(`
      SELECT COALESCE(pr.name, 'Sin Asignar') as owner_name, 
             COUNT(DISTINCT s.id) as sales_count,
             COALESCE(SUM(si.total), 0) as total_sales
      FROM sale_items si
      JOIN product_variants pv ON si.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN proprietarias pr ON p.owner_id = pr.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed' ${dateFilter}
      GROUP BY p.owner_id
      ORDER BY total_sales DESC
    `, params);

    // 4. Utility / Profit calculation (raw, superseded by profitQuery below)
    await db.get(`
      SELECT COALESCE(SUM(s.total), 0) as revenue,
             COALESCE(SUM(si.quantity * pv.buy_price), 0) as cost,
             COALESCE(SUM((si.unit_price - pv.buy_price) * si.quantity) - SUM(s.discount * (si.total / s.total)), 0) as raw_profit
      FROM sale_items si
      JOIN product_variants pv ON si.variant_id = pv.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed' ${dateFilter}
    `, params);

    // Adjusting profit calculation to account for discounts:
    // Profit = Total Sales - Cost of Goods Sold (COGS).
    // Let's compute it accurately:
    const profitQuery = await db.get(`
      SELECT 
        COALESCE(SUM(s.total), 0) as revenue,
        COALESCE(SUM(si.quantity * pv.buy_price), 0) as cost
      FROM sale_items si
      JOIN product_variants pv ON si.variant_id = pv.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed' ${dateFilter}
    `, params);

    const revenue = profitQuery?.revenue || 0;
    const cogs = profitQuery?.cost || 0;
    const netProfit = revenue - cogs;

    return res.json({
      salesTimeline,
      salesByUser,
      salesByOwner,
      summary: {
        revenue,
        cogs,
        profit: netProfit
      }
    });
  } catch (error) {
    console.error('Error generating reports:', error);
    return res.status(500).json({ error: 'Error al generar analíticas.' });
  }
});

export default router;
