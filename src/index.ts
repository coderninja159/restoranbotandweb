import 'dotenv/config'; // Loads variables from .env file
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { bot } from './bot.js';
import { closePool, getCategories, getProductsByCategoryId, getAllProducts, createOrder, getAdminOrders, updateOrderStatus, createProduct, updateProduct, deleteProduct, getUserOrderHistory, getUser } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const webhookUrl = process.env.RENDER_EXTERNAL_URL || process.env.WEBHOOK_URL;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const webhookPath = botToken ? `/webhook/${botToken}` : '';

// Enable CORS
app.use(cors());

// Health Check Endpoint (can be pinged to prevent sleep)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Register Telegraf webhook middleware BEFORE express.json()
if (webhookUrl && webhookPath) {
  app.use(bot.webhookCallback(webhookPath));
  console.log(`Registered Telegram webhook at path: ${webhookPath}`);
}

app.use(express.json());

// Serve static files from the React app build directory
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// API Endpoints
// 1. Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await getCategories();
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get Products (optionally filtered by category_id)
app.get('/api/products', async (req, res) => {
  try {
    const categoryId = req.query.category_id ? parseInt(req.query.category_id as string, 10) : null;
    let products;
    if (categoryId && !isNaN(categoryId)) {
      products = await getProductsByCategoryId(categoryId);
    } else {
      products = await getAllProducts();
    }
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Create Order
app.post('/api/orders', async (req, res) => {
  try {
    const { user_id, user_name, user_phone, total_amount, order_type, table_number, address, items } = req.body;

    if (!user_id || !user_name || !user_phone || !total_amount || !order_type || !items || !items.length) {
      return res.status(400).json({ error: 'Missing required order fields.' });
    }

    // Map items to match Database expectations (item.id or item.product_id -> product_id)
    const dbItems = items.map((item: any) => ({
      product_id: Number(item.id || item.product_id),
      quantity: Number(item.quantity),
      price: Number(item.price)
    }));

    // Insert order to database
    const orderId = await createOrder({
      user_id: Number(user_id),
      user_name,
      user_phone,
      total_amount: Number(total_amount),
      order_type,
      table_number,
      address
    }, dbItems);

    // Format receipt message for Telegram
    let itemsText = '';
    for (const [index, item] of items.entries()) {
      itemsText += `${index + 1}. *${item.name_uz || 'Taom'}* x ${item.quantity} - ${Number(item.price * item.quantity).toLocaleString('uz-UZ')} UZS\n`;
    }

    const orderTypeText = order_type === 'table' 
      ? `Stol: ${table_number}-stol 🍽` 
      : order_type === 'delivery' 
        ? `Etkazib berish (Dostavka) 🚚\nManzil: ${address}` 
        : 'Olib ketish (Samovivoz) 🛍';

    const telegramMessage = 
`✅ *Buyurtmangiz qabul qilindi!*

🆔 *Buyurtma ID:* #${orderId}
👤 *Mijoz:* ${user_name}
📞 *Telefon:* ${user_phone}
📍 *Turi:* ${orderTypeText}

*Buyurtma tarkibi:*
${itemsText}
💰 *Jami summa:* ${Number(total_amount).toLocaleString('uz-UZ')} UZS

_Tez orada siz bilan bog'lanamiz!_`;

    // Send confirmation message to the user via Telegram Bot
    try {
      await bot.telegram.sendMessage(user_id, telegramMessage, { parse_mode: 'Markdown' });
    } catch (tgError) {
      console.warn(`Could not send telegram message to user ${user_id}:`, tgError);
    }

    res.status(201).json({ success: true, orderId });
  } catch (error: any) {
    console.error('Error handling checkout API:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Admin Get Orders
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await getAdminOrders();
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Admin Update Order Status (with Telegram Push notification)
app.put('/api/admin/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }
    
    const updatedOrder = await updateOrderStatus(Number(id), status);
    
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    
    // Status messages mapping in Uzbek
    const statusMessages: Record<string, string> = {
      pending: 'kutilmoqda ⏳',
      confirmed: 'tasdiqlandi ✅. Taomlaringiz tayyorlanishni boshladi!',
      completed: 'yakunlandi 🥳. Buyurtmangiz yetkazib berildi/tayyor bo\'ldi! Yoqimli ishtaha!',
      cancelled: 'bekor qilindi ❌'
    };
    
    const statusText = statusMessages[status] || status;
    const notificationText = `🔔 *Buyurtma statusi yangilandi!*\n\n` +
      `📦 *Buyurtma ID:* #${id}\n` +
      `🚦 *Yangi status:* Buyurtmangiz *${statusText}*`;
      
    try {
      await bot.telegram.sendMessage(updatedOrder.user_id, notificationText, { parse_mode: 'Markdown' });
    } catch (tgError) {
      console.warn(`Could not send status update notification to user ${updatedOrder.user_id}:`, tgError);
    }
    
    res.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Admin Create Product
app.post('/api/admin/products', async (req, res) => {
  try {
    const { category_id, name_uz, price, old_price, rating, reviews_count, image_url, is_available } = req.body;
    if (!category_id || !name_uz || !price) {
      return res.status(400).json({ error: 'Category ID, name, and price are required.' });
    }
    const product = await createProduct({
      category_id: Number(category_id),
      name_uz,
      price: Number(price),
      old_price: old_price ? Number(old_price) : null,
      rating: rating ? Number(rating) : 5.0,
      reviews_count: reviews_count ? Number(reviews_count) : 0,
      image_url: image_url || null,
      is_available: is_available !== undefined ? Boolean(is_available) : true
    });
    res.status(201).json({ success: true, product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Admin Update Product
app.put('/api/admin/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name_uz, price, old_price, rating, reviews_count, image_url, is_available } = req.body;
    if (!category_id || !name_uz || !price) {
      return res.status(400).json({ error: 'Category ID, name, and price are required.' });
    }
    const product = await updateProduct(Number(id), {
      category_id: Number(category_id),
      name_uz,
      price: Number(price),
      old_price: old_price ? Number(old_price) : null,
      rating: rating ? Number(rating) : 5.0,
      reviews_count: reviews_count ? Number(reviews_count) : 0,
      image_url: image_url || null,
      is_available: is_available !== undefined ? Boolean(is_available) : true
    });
    res.json({ success: true, product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Admin Delete Product
app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteProduct(Number(id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. User Order History
app.get('/api/orders/history/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const history = await getUserOrderHistory(Number(user_id));
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Get User Profile Details
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUser(Number(id));
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback all other routes to index.html (SPA routing)
app.get('/*splat', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  // Prevent falling back to index.html for static asset files that do not exist (e.g. .css, .js, images)
  if (/\.[a-zA-Z0-9]+$/.test(req.path)) {
    return res.status(404).end();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Frontend not built yet. Run npm run build in frontend directory.');
    }
  });
});

// Launch the Telegram bot and Express server
let server: any;
async function bootstrap() {
  try {
    // Start Express API Server first
    server = app.listen(PORT, () => {
      console.log(`Express API Server is running on port ${PORT}`);
    });

    // Launch Telegram Bot
    if (webhookUrl && webhookPath) {
      console.log('Setting up Telegram Bot Webhook...');
      const fullWebhookUrl = `${webhookUrl}${webhookPath}`;
      await bot.telegram.setWebhook(fullWebhookUrl);
      console.log(`Bot webhook successfully set to: ${fullWebhookUrl}`);
    } else {
      console.log('Starting Restaurant Telegram Bot via Long Polling...');
      bot.launch()
        .then(() => {
          console.log('Bot is successfully running and polling for updates.');
        })
        .catch((error) => {
          console.error('Failed to launch Telegram Bot polling:', error);
        });
    }
  } catch (error) {
    console.error('Failed to launch application:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop Express server
    if (server) {
      server.close();
      console.log('Express API server stopped.');
    }

    // Stop the Telegram Bot polling
    bot.stop(signal);
    console.log('Telegram bot polling stopped.');
    
    // Close the PostgreSQL pool
    await closePool();
    
    console.log('Graceful shutdown completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Register signal handlers
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Execute bootstrapper
bootstrap();
