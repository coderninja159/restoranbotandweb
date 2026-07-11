import pg from 'pg';

const { Pool } = pg;

// Parse connection string or fallback to config
const connectionString = process.env.DATABASE_URL;
let dbConfig: any = {};

if (!connectionString) {
  console.warn('WARNING: DATABASE_URL environment variable is not defined. Database queries will fail.');
} else {
  try {
    const url = new URL(connectionString);
    dbConfig = {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 5432,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.split('/')[1] || 'postgres',
    };
  } catch (e) {
    dbConfig = { connectionString };
  }
}

// Create pg connection pool
export const pool = new Pool({
  ...dbConfig,
  // Add defensive timeout settings
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10, // Maximum pool size
  ssl: {
    rejectUnauthorized: false
  }
});

// Event listener for idle pool clients to log errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err.message || err);
});

export interface Category {
  id: number;
  name_uz: string;
  slug: string;
  created_at: Date;
}

export interface Product {
  id: number;
  category_id: number;
  name_uz: string;
  price: number;
  discount: number;
  image_url: string | null;
  is_available: boolean;
  created_at: Date;
}

export interface OrderInput {
  user_id: number;
  user_name: string;
  user_phone: string;
  total_amount: number;
  order_type: 'delivery' | 'pickup' | 'table';
  table_number?: string;
  address?: string;
}

export interface OrderItemInput {
  product_id: number;
  quantity: number;
  price: number;
}

export interface OrderWithItems {
  id: number;
  user_id: number;
  user_name: string;
  user_phone: string;
  total_amount: number;
  order_type: 'delivery' | 'pickup' | 'table';
  table_number: string | null;
  address: string | null;
  status: string;
  created_at: Date;
  items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

/**
 * Fetch all categories from the database, sorted by id.
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const queryText = 'SELECT id, name_uz, slug, created_at FROM categories ORDER BY id ASC;';
    const res = await pool.query<Category>(queryText);
    return res.rows;
  } catch (error) {
    console.error('Error fetching categories from database:', error);
    throw new Error('Kategoriyalarni yuklashda xatolik yuz berdi. Iltimos, keyinroq urinib ko\'ring.');
  }
}

/**
 * Fetch products by category ID.
 */
export async function getProductsByCategoryId(categoryId: number, onlyAvailable = true): Promise<Product[]> {
  try {
    let queryText = 'SELECT id, category_id, name_uz, price, discount, image_url, is_available, created_at FROM products WHERE category_id = $1';
    const params: any[] = [categoryId];

    if (onlyAvailable) {
      queryText += ' AND is_available = TRUE';
    }

    queryText += ' ORDER BY id ASC;';

    const res = await pool.query<Product>(queryText, params);
    return res.rows.map(row => ({
      ...row,
      price: Number(row.price),
      discount: Number(row.discount || 0)
    }));
  } catch (error) {
    console.error(`Error fetching products for category_id ${categoryId}:`, error);
    throw new Error('Mahsulotlarni yuklashda xatolik yuz berdi. Iltimos, keyinroq urinib ko\'ring.');
  }
}

/**
 * Fetch all products from the database.
 */
export async function getAllProducts(onlyAvailable = true): Promise<Product[]> {
  try {
    let queryText = 'SELECT id, category_id, name_uz, price, discount, image_url, is_available, created_at FROM products';
    if (onlyAvailable) {
      queryText += ' WHERE is_available = TRUE';
    }
    queryText += ' ORDER BY id ASC;';
    const res = await pool.query<Product>(queryText);
    return res.rows.map(row => ({
      ...row,
      price: Number(row.price),
      discount: Number(row.discount || 0)
    }));
  } catch (error) {
    console.error('Error fetching all products:', error);
    throw new Error('Mahsulotlarni yuklashda xatolik yuz berdi.');
  }
}

/**
 * Create a new order and its items within a database transaction.
 */
export async function createOrder(order: OrderInput, items: OrderItemInput[]): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderQuery = `
      INSERT INTO orders (user_id, user_name, user_phone, total_amount, order_type, table_number, address, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id;
    `;
    const orderParams = [
      order.user_id,
      order.user_name,
      order.user_phone,
      order.total_amount,
      order.order_type,
      order.table_number || null,
      order.address || null,
      'pending'
    ];

    const orderRes = await client.query<{ id: number }>(orderQuery, orderParams);
    const orderId = orderRes.rows[0].id;

    const itemQuery = `
      INSERT INTO order_items (order_id, product_id, quantity, price)
      VALUES ($1, $2, $3, $4);
    `;

    for (const item of items) {
      await client.query(itemQuery, [orderId, item.product_id, item.quantity, item.price]);
    }

    await client.query('COMMIT');
    return orderId;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order in transaction:', error);
    throw new Error('Buyurtmani saqlashda xatolik yuz berdi.');
  } finally {
    client.release();
  }
}

/**
 * Fetch all orders for the Admin Panel
 */
export async function getAdminOrders(): Promise<OrderWithItems[]> {
  try {
    const ordersRes = await pool.query(`
      SELECT id, user_id, user_name, user_phone, total_amount, order_type, table_number, address, status, created_at
      FROM orders
      ORDER BY created_at DESC;
    `);

    const itemsRes = await pool.query(`
      SELECT oi.id, oi.order_id, oi.product_id, p.name_uz as product_name, oi.quantity, oi.price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id;
    `);

    const ordersMap = new Map<number, OrderWithItems>();
    for (const row of ordersRes.rows) {
      ordersMap.set(row.id, {
        ...row,
        total_amount: Number(row.total_amount),
        items: []
      });
    }

    for (const item of itemsRes.rows) {
      const order = ordersMap.get(item.order_id);
      if (order) {
        order.items.push({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: Number(item.price)
        });
      }
    }

    return Array.from(ordersMap.values());
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    throw error;
  }
}

/**
 * Update an order's status
 */
export async function updateOrderStatus(orderId: number, status: string): Promise<any> {
  try {
    const res = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *;',
      [status, orderId]
    );
    return res.rows[0];
  } catch (error) {
    console.error(`Error updating order status for ID ${orderId}:`, error);
    throw error;
  }
}

/**
 * Create a new product
 */
export async function createProduct(p: {
  category_id: number;
  name_uz: string;
  price: number;
  discount?: number;
  image_url?: string | null;
  is_available?: boolean;
}): Promise<Product> {
  try {
    const query = `
      INSERT INTO products (category_id, name_uz, price, discount, image_url, is_available)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const res = await pool.query<Product>(query, [
      p.category_id,
      p.name_uz,
      p.price,
      p.discount || 0,
      p.image_url || null,
      p.is_available !== undefined ? p.is_available : true
    ]);
    return {
      ...res.rows[0],
      price: Number(res.rows[0].price),
      discount: Number(res.rows[0].discount || 0)
    };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(id: number, p: {
  category_id: number;
  name_uz: string;
  price: number;
  discount?: number;
  image_url?: string | null;
  is_available?: boolean;
}): Promise<Product> {
  try {
    const query = `
      UPDATE products
      SET category_id = $1, name_uz = $2, price = $3, discount = $4, image_url = $5, is_available = $6
      WHERE id = $7
      RETURNING *;
    `;
    const res = await pool.query<Product>(query, [
      p.category_id,
      p.name_uz,
      p.price,
      p.discount || 0,
      p.image_url || null,
      p.is_available !== undefined ? p.is_available : true,
      id
    ]);
    return {
      ...res.rows[0],
      price: Number(res.rows[0].price),
      discount: Number(res.rows[0].discount || 0)
    };
  } catch (error) {
    console.error(`Error updating product ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(id: number): Promise<boolean> {
  try {
    await pool.query('DELETE FROM products WHERE id = $1;', [id]);
    return true;
  } catch (error) {
    console.error(`Error deleting product ${id}:`, error);
    throw error;
  }
}

/**
 * Fetch past orders for a specific user ID
 */
export async function getUserOrderHistory(userId: number): Promise<OrderWithItems[]> {
  try {
    const ordersRes = await pool.query(`
      SELECT id, user_id, user_name, user_phone, total_amount, order_type, table_number, address, status, created_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `, [userId]);

    if (ordersRes.rows.length === 0) return [];

    const orderIds = ordersRes.rows.map(o => o.id);
    const itemsRes = await pool.query(`
      SELECT oi.id, oi.order_id, oi.product_id, p.name_uz as product_name, oi.quantity, oi.price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ANY($1::int[]);
    `, [orderIds]);

    const ordersMap = new Map<number, OrderWithItems>();
    for (const row of ordersRes.rows) {
      ordersMap.set(row.id, {
        ...row,
        total_amount: Number(row.total_amount),
        items: []
      });
    }

    for (const item of itemsRes.rows) {
      const order = ordersMap.get(item.order_id);
      if (order) {
        order.items.push({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: Number(item.price)
        });
      }
    }

    return Array.from(ordersMap.values());
  } catch (error) {
    console.error(`Error fetching user order history for ${userId}:`, error);
    throw error;
  }
}

/**
 * Save user registration details (insert or update)
 */
export async function saveUser(id: number, name: string, phone: string): Promise<void> {
  try {
    await pool.query(`
      INSERT INTO users (id, name, phone)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) 
      DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
    `, [id, name, phone]);
  } catch (error) {
    console.error(`Error saving user ${id}:`, error);
    throw error;
  }
}

/**
 * Fetch user registration details
 */
export async function getUser(id: number): Promise<{ id: number; name: string; phone: string } | null> {
  try {
    const res = await pool.query('SELECT id, name, phone FROM users WHERE id = $1', [id]);
    if (res.rows.length > 0) {
      return {
        id: Number(res.rows[0].id),
        name: res.rows[0].name,
        phone: res.rows[0].phone
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    throw error;
  }
}

/**
 * Gracefully close the database pool connection.
 */
export async function closePool(): Promise<void> {
  console.log('Closing database connection pool...');
  await pool.end();
  console.log('Database connection pool closed.');
}
