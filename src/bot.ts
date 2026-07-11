import { Telegraf, Markup, session, Context } from 'telegraf';
import { getCategories, getProductsByCategoryId, createOrder, getAllProducts, getUserOrderHistory, saveUser } from './db.js';
import fs from 'fs';
import path from 'path';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('CRITICAL ERROR: TELEGRAM_BOT_TOKEN is not defined in environment variables.');
  process.exit(1);
}

const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:5173';

interface CartItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
}

interface BotSession {
  registrationStep?: 'ask_name' | 'ask_phone';
  regData: {
    name?: string;
    phone?: string;
  };
  isRegistered?: boolean;
  cart: CartItem[];
  checkoutStep?: 'ask_order_type' | 'ask_address' | 'ask_table';
  checkoutData: {
    order_type?: 'delivery' | 'pickup' | 'table';
    address?: string;
    table_number?: string;
  };
}

interface MyContext extends Context {
  session: BotSession;
}

export const bot = new Telegraf<MyContext>(token);

// Register session middleware
bot.use(session({
  defaultSession: (): BotSession => ({
    regData: {},
    cart: [],
    checkoutData: {}
  })
}));

// Helper to get local image path if exists
function getProductImagePath(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  // Resolve image in frontend/public (Vite dev source)
  const devPath = path.join(process.cwd(), 'frontend', 'public', imageUrl);
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  // Resolve in frontend/dist (Production build source)
  const distPath = path.join(process.cwd(), 'frontend', 'dist', imageUrl);
  if (fs.existsSync(distPath)) {
    return distPath;
  }
  return null;
}

// Function to send the main menu keyboard
async function sendMainMenu(ctx: MyContext, text: string) {
  const keyboard = Markup.keyboard([
    ['🍽 Menyu / Buyurtma', '🛒 Savatcha'],
    ['📦 Buyurtmalar tarixi', 'ℹ️ Ma\'lumot'],
    [Markup.button.webApp('📱 Mini Appni ochish', webAppUrl)]
  ]).resize();

  await ctx.reply(text, keyboard);
}

// Start handler - Starts registration wizard
bot.start(async (ctx) => {
  ctx.session = {
    regData: {},
    cart: [],
    checkoutData: {}
  };

  try {
    // Set Telegram Menu Button to open the Web App
    try {
      await ctx.setChatMenuButton({
        type: 'web_app',
        text: 'Menyu 🍽',
        web_app: { url: webAppUrl }
      });
    } catch (err) {
      console.warn('Failed to set chat menu button:', err);
    }

    await ctx.reply(
      `Assalomu alaykum! Barokat Restorani botiga xush kelibsiz.\n\n` +
      `Tizimdan foydalanish uchun, iltimos, ism va familiyangizni kiriting:`
    );
    ctx.session.registrationStep = 'ask_name';
  } catch (error) {
    console.error('Error in /start handler:', error);
  }
});

// Help command or Ma'lumot button
const sendInfoMessage = async (ctx: MyContext) => {
  const infoText = 
    `📍 *Manzilimiz:* Sirdaryo shahri, Mo'ljal: Abu Bakr masjidi oldida\n\n` +
    `📞 *Telefon:* +998 93 123 45 67\n\n` +
    `🕒 *Ish vaqti:* 09:00 - 23:00\n\n` +
    `Tezkor buyurtma berish uchun botimizdan yoki pastdagi "Mini App" orqali Uzum Market ko'rinishidagi qulay interfeysdan foydalanishingiz mumkin.`;
  await ctx.replyWithMarkdown(infoText);
};

bot.hears('ℹ️ Ma\'lumot', sendInfoMessage);

// Order history command
bot.hears('📦 Buyurtmalar tarixi', async (ctx) => {
  if (!ctx.session.isRegistered) {
    return ctx.reply('Iltimos, avval /start buyrug\'i orqali ro\'yxatdan o\'ting.');
  }

  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const orders = await getUserOrderHistory(userId);
    if (orders.length === 0) {
      return ctx.reply('Sizda hali buyurtmalar mavjud emas.');
    }

    let historyText = `📦 *Sizning oxirgi buyurtmalaringiz:*\n\n`;
    orders.slice(0, 5).forEach((order) => {
      const date = new Date(order.created_at).toLocaleDateString('uz-UZ');
      const statusEmoji = order.status === 'completed' ? '✅' : order.status === 'cancelled' ? '❌' : '⏳';
      const typeText = order.order_type === 'delivery' ? 'Yetkazish' : order.order_type === 'pickup' ? 'Olib ketish' : 'Stolda';
      
      historyText += `${statusEmoji} *Buyurtma #${order.id}* (${date})\n`;
      historyText += `🔹 Tur: ${typeText}\n`;
      historyText += `🔹 Summa: ${new Intl.NumberFormat('uz-UZ').format(order.total_amount)} so'm\n`;
      historyText += `🔹 Status: ${order.status.toUpperCase()}\n`;
      historyText += `🔹 Taomlar: ${order.items.map(i => `${i.product_name} (${i.quantity}x)`).join(', ')}\n\n`;
    });

    await ctx.replyWithMarkdown(historyText);
  } catch (error) {
    console.error('Error fetching order history for bot:', error);
    await ctx.reply('Tizimda xatolik yuz berdi, buyurtmalar tarixini yuklab bo\'lmadi.');
  }
});

// Menyu trigger
const triggerMenu = async (ctx: MyContext) => {
  if (!ctx.session.isRegistered) {
    return ctx.reply('Iltimos, avval /start buyrug\'i orqali ro\'yxatdan o\'ting.');
  }

  try {
    const categories = await getCategories();
    if (categories.length === 0) {
      return ctx.reply('Hozircha kategoriyalar mavjud emas.');
    }

    const buttons = categories.map(cat => 
      Markup.button.callback(cat.name_uz, `cat_${cat.id}`)
    );

    // Grid layout: 2 columns
    const grid: any[] = [];
    for (let i = 0; i < buttons.length; i += 2) {
      grid.push(buttons.slice(i, i + 2));
    }

    await ctx.reply('Taom toifasini tanlang:', Markup.inlineKeyboard(grid));
  } catch (error) {
    console.error('Error listing categories:', error);
    await ctx.reply('Kategoriyalarni yuklashda xatolik yuz berdi.');
  }
};

bot.hears('🍽 Menyu / Buyurtma', triggerMenu);

// Helper function to send or edit a product message (pagination)
async function sendOrEditProductMessage(
  ctx: MyContext,
  categoryId: number,
  productIndex: number,
  editMessage = false
) {
  try {
    const products = await getProductsByCategoryId(categoryId);
    const categories = await getCategories();
    const currentCategory = categories.find(c => c.id === categoryId);
    const categoryTitle = currentCategory ? currentCategory.name_uz : 'Menyu';

    if (products.length === 0) {
      const emptyText = `"${categoryTitle}" kategoriyasida hozircha taomlar mavjud emas.`;
      if (editMessage) {
        await ctx.editMessageText(emptyText).catch(console.error);
      } else {
        await ctx.reply(emptyText);
      }
      return;
    }

    // Ensure index is within bounds (loop around)
    const safeIndex = (productIndex + products.length) % products.length;
    const prod = products[safeIndex];

    const priceFormatted = new Intl.NumberFormat('uz-UZ').format(prod.price);
    let detailsText = `🍽 *${categoryTitle}* (${safeIndex + 1}/${products.length})\n\n`;
    detailsText += `🔸 *${prod.name_uz}*\n`;
    detailsText += `💰 Narxi: *${priceFormatted} so'm*`;
    
    if (prod.old_price) {
      const oldPriceFormatted = new Intl.NumberFormat('uz-UZ').format(prod.old_price);
      detailsText += ` (Eski: ~${oldPriceFormatted} so'm~)`;
    }
    detailsText += `\n`;

    // Build the inline keyboard buttons
    const buttons = [
      [
        Markup.button.callback('➕ Savatga', `add_${prod.id}`),
        Markup.button.callback('➖ Kamaytirish', `remove_${prod.id}`)
      ]
    ];

    // If there is more than 1 product, add navigation buttons (<- and ->)
    if (products.length > 1) {
      const prevIndex = (safeIndex - 1 + products.length) % products.length;
      const nextIndex = (safeIndex + 1) % products.length;
      buttons.push([
        Markup.button.callback('⬅️ Oldingi', `prodpage_${categoryId}_${prevIndex}`),
        Markup.button.callback('➡️ Keyingi', `prodpage_${categoryId}_${nextIndex}`)
      ]);
    }

    const inlineKeyboard = Markup.inlineKeyboard(buttons);
    const imagePath = getProductImagePath(prod.image_url);

    if (editMessage) {
      try {
        const isPhotoMessage = ctx.callbackQuery && 'message' in ctx.callbackQuery && ctx.callbackQuery.message && 'photo' in ctx.callbackQuery.message;

        if (imagePath && isPhotoMessage) {
          // Edit existing photo message's media and caption
          await ctx.editMessageMedia({
            type: 'photo',
            media: { source: imagePath },
            caption: detailsText,
            parse_mode: 'Markdown'
          }, {
            reply_markup: inlineKeyboard.reply_markup
          });
          return;
        } else if (!imagePath && !isPhotoMessage) {
          // Edit existing text message's text
          await ctx.editMessageText(detailsText, {
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard.reply_markup
          });
          return;
        }
      } catch (err) {
        console.warn('Failed to edit message in-place, falling back to delete and send:', err);
      }

      // Fallback: Delete old message and send a new one
      try {
        await ctx.deleteMessage().catch(console.error);
      } catch (e) {}
    }

    // Send new message
    if (imagePath) {
      await ctx.replyWithPhoto({ source: imagePath }, {
        caption: detailsText,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard.reply_markup
      });
    } else {
      await ctx.replyWithMarkdown(detailsText, inlineKeyboard);
    }
  } catch (error) {
    console.error('Error in sendOrEditProductMessage:', error);
  }
}

// Category selection callback
bot.action(/^cat_(\d+)$/, async (ctx) => {
  const categoryId = parseInt(ctx.match[1], 10);
  try {
    await ctx.answerCbQuery().catch(console.error);
    await sendOrEditProductMessage(ctx, categoryId, 0, false);
  } catch (error) {
    console.error('Error fetching products for category action:', error);
  }
});

// Product pagination callback
bot.action(/^prodpage_(\d+)_(\d+)$/, async (ctx) => {
  const categoryId = parseInt(ctx.match[1], 10);
  const productIndex = parseInt(ctx.match[2], 10);
  try {
    await ctx.answerCbQuery().catch(console.error);
    await sendOrEditProductMessage(ctx, categoryId, productIndex, true);
  } catch (error) {
    console.error('Error handling product page action:', error);
  }
});

// Cart add callback
bot.action(/^add_(\d+)$/, async (ctx) => {
  const productId = parseInt(ctx.match[1], 10);
  try {
    const products = await getAllProducts(false);
    const product = products.find(p => p.id === productId);

    if (!product) {
      return ctx.answerCbQuery('Taom topilmadi!').catch(console.error);
    }

    const cartItem = ctx.session.cart.find(item => item.product_id === productId);
    if (cartItem) {
      cartItem.quantity += 1;
    } else {
      ctx.session.cart.push({
        product_id: product.id,
        product_name: product.name_uz,
        quantity: 1,
        price: Number(product.price)
      });
    }

    const count = ctx.session.cart.reduce((sum, item) => sum + item.quantity, 0);
    await ctx.answerCbQuery(`Qo'shildi! Savatchada: ${count} ta taom`).catch(console.error);
  } catch (error) {
    console.error('Error in add_ callback:', error);
  }
});

// Cart remove callback
bot.action(/^remove_(\d+)$/, async (ctx) => {
  const productId = parseInt(ctx.match[1], 10);
  try {
    const index = ctx.session.cart.findIndex(item => item.product_id === productId);

    if (index === -1) {
      return ctx.answerCbQuery('Ushbu taom savatchangizda yo\'q.').catch(console.error);
    }

    const cartItem = ctx.session.cart[index];
    if (cartItem.quantity > 1) {
      cartItem.quantity -= 1;
    } else {
      ctx.session.cart.splice(index, 1);
    }

    const count = ctx.session.cart.reduce((sum, item) => sum + item.quantity, 0);
    await ctx.answerCbQuery(`Kamaytirildi! Savatchada: ${count} ta taom`).catch(console.error);
  } catch (error) {
    console.error('Error in remove_ callback:', error);
  }
});

// Savatchani ko'rish
const showCart = async (ctx: MyContext) => {
  if (!ctx.session.isRegistered) {
    return ctx.reply('Iltimos, avval /start buyrug\'i orqali ro\'yxatdan o\'ting.');
  }

  if (ctx.session.cart.length === 0) {
    return ctx.reply('🛒 Savatchangiz bo\'sh. Taom buyurtma qilish uchun "🍽 Menyu" bo\'limiga o\'ting.');
  }

  let cartText = `🛒 *Savatchangiz tarkibi:*\n\n`;
  let total = 0;

  ctx.session.cart.forEach((item, idx) => {
    const subtotal = item.quantity * item.price;
    total += subtotal;
    cartText += `${idx + 1}. *${item.product_name}*\n`;
    cartText += `   ${item.quantity} x ${new Intl.NumberFormat('uz-UZ').format(item.price)} so'm = *${new Intl.NumberFormat('uz-UZ').format(subtotal)} so'm*\n`;
  });

  cartText += `\n💵 *Jami summa: ${new Intl.NumberFormat('uz-UZ').format(total)} so'm*`;

  const inlineKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🚖 Buyurtma berish', 'checkout_start')],
    [Markup.button.callback('🧹 Savatchani tozalash', 'cart_clear')]
  ]);

  await ctx.replyWithMarkdown(cartText, inlineKeyboard);
};

bot.hears('🛒 Savatcha', showCart);

bot.action('cart_clear', async (ctx) => {
  ctx.session.cart = [];
  await ctx.answerCbQuery('Savatcha tozalandi').catch(console.error);
  await ctx.reply('Savatchangiz muvaffaqiyatli tozalandi.');
});

// Checkout Start
bot.action('checkout_start', async (ctx) => {
  try {
    await ctx.answerCbQuery().catch(console.error);
    if (ctx.session.cart.length === 0) {
      return ctx.reply('Savat bo\'sh!');
    }

    ctx.session.checkoutStep = 'ask_order_type';
    await ctx.reply(
      'Iltimos, buyurtma turini tanlang:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('🚖 Yetkazib berish', 'type_delivery'),
          Markup.button.callback('🚶 Olib ketish', 'type_pickup')
        ],
        [
          Markup.button.callback('🍽 Stolga buyurtma', 'type_table')
        ]
      ])
    );
  } catch (error) {
    console.error('Error starting checkout:', error);
  }
});

// Checkout order type callbacks
bot.action(/^type_(delivery|pickup|table)$/, async (ctx) => {
  const type = ctx.match[1] as 'delivery' | 'pickup' | 'table';
  try {
    await ctx.answerCbQuery().catch(console.error);
    ctx.session.checkoutData = { order_type: type };

    if (type === 'delivery') {
      ctx.session.checkoutStep = 'ask_address';
      await ctx.reply('Iltimos, yetkazib berish manzilini to\'liq kiriting (ko\'cha, uy, xonadon):');
    } else if (type === 'table') {
      ctx.session.checkoutStep = 'ask_table';
      await ctx.reply('Iltimos, o\'tirgan stolingiz raqamini kiriting:');
    } else {
      ctx.session.checkoutStep = undefined;
      await askConfirmation(ctx);
    }
  } catch (error) {
    console.error('Error saving order type callback:', error);
  }
});

// Ask confirmation function
async function askConfirmation(ctx: MyContext) {
  const typeMap = {
    delivery: 'Yetkazib berish 🚖',
    pickup: 'Olib ketish 🚶',
    table: 'Stolda buyurtma 🍽'
  };

  let total = 0;
  let summary = `📋 *Buyurtma Tafsilotlari:*\n\n`;
  summary += `👤 *Mijoz:* ${ctx.session.regData.name}\n`;
  summary += `📞 *Telefon:* ${ctx.session.regData.phone}\n`;
  summary += `🚖 *Turi:* ${typeMap[ctx.session.checkoutData.order_type!]}\n`;

  if (ctx.session.checkoutData.order_type === 'delivery') {
    summary += `📍 *Manzil:* ${ctx.session.checkoutData.address}\n`;
  } else if (ctx.session.checkoutData.order_type === 'table') {
    summary += `🍽 *Stol raqami:* ${ctx.session.checkoutData.table_number}\n`;
  }

  summary += `\n*Taomlar:*\n`;
  ctx.session.cart.forEach((item) => {
    const subtotal = item.quantity * item.price;
    total += subtotal;
    summary += `- ${item.product_name} (${item.quantity}x) = ${new Intl.NumberFormat('uz-UZ').format(subtotal)} so'm\n`;
  });

  summary += `\n💵 *Jami to'lov: ${new Intl.NumberFormat('uz-UZ').format(total)} so'm*`;

  await ctx.replyWithMarkdown(
    summary,
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Buyurtmani tasdiqlash', 'checkout_confirm')],
      [Markup.button.callback('❌ Bekor qilish', 'checkout_cancel')]
    ])
  );
}

// Checkout Confirm Action
bot.action('checkout_confirm', async (ctx) => {
  try {
    await ctx.answerCbQuery().catch(console.error);

    const userId = ctx.from?.id;
    if (!userId || ctx.session.cart.length === 0) {
      return ctx.reply('Xatolik: Buyurtma ma\'lumotlari xato.');
    }

    const total = ctx.session.cart.reduce((sum, i) => sum + i.quantity * i.price, 0);

    const orderId = await createOrder({
      user_id: userId,
      user_name: ctx.session.regData.name || 'Mijoz',
      user_phone: ctx.session.regData.phone || '',
      total_amount: total,
      order_type: ctx.session.checkoutData.order_type!,
      table_number: ctx.session.checkoutData.table_number,
      address: ctx.session.checkoutData.address
    }, ctx.session.cart.map(i => ({
      product_id: i.product_id,
      quantity: i.quantity,
      price: i.price
    })));

    // Clear cart and checkout session
    ctx.session.cart = [];
    ctx.session.checkoutData = {};
    ctx.session.checkoutStep = undefined;

    await ctx.reply(
      `🎉 Buyurtmangiz muvaffaqiyatli qabul qilindi!\n\n` +
      `🏷 Buyurtma raqami: #${orderId}\n\n` +
      `Tez orada operatorimiz siz bilan bog'lanadi. Rahmat!`
    );
  } catch (error) {
    console.error('Error confirming order:', error);
    await ctx.reply('Afsuski, buyurtmani rasmiylashtirishda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.');
  }
});

// Checkout Cancel Action
bot.action('checkout_cancel', async (ctx) => {
  ctx.session.checkoutData = {};
  ctx.session.checkoutStep = undefined;
  await ctx.answerCbQuery('Buyurtma bekor qilindi').catch(console.error);
  await ctx.reply('Buyurtma bekor qilindi. Savatchangiz o\'zgarmay qoldi.');
});

// Global Text message and Registration / Checkout handler
bot.on('text', async (ctx) => {
  const text = ctx.message.text;

  // Handle registration flow steps
  if (ctx.session.registrationStep === 'ask_name') {
    if (text.length < 3) {
      return ctx.reply('Iltimos, to\'liq ism va familiyangizni kiriting:');
    }
    ctx.session.regData.name = text;
    ctx.session.registrationStep = 'ask_phone';

    await ctx.reply(
      `Rahmat, ${text}!\n\n` +
      `Endi pastdagi "📞 Telefon raqamni ulashish" tugmasini bosing yoki telefon raqamingizni qo'lda kiriting (+998XXXXXXXXX formatida):`,
      Markup.keyboard([
        [Markup.button.contactRequest('📞 Telefon raqamni ulashish')]
      ]).resize()
    );
    return;
  }

  if (ctx.session.registrationStep === 'ask_phone') {
    // Basic phone pattern check
    if (!/^\+?998\d{9}$/.test(text.replace(/\s+/g, ''))) {
      return ctx.reply('Iltimos, telefon raqamini to\'g\'ri formatda kiriting (Masalan: +998931234567):');
    }
    ctx.session.regData.phone = text;
    ctx.session.registrationStep = undefined;
    ctx.session.isRegistered = true;

    // Save user registration to database
    if (ctx.from?.id) {
      try {
        await saveUser(ctx.from.id, ctx.session.regData.name || 'Mijoz', ctx.session.regData.phone);
      } catch (err) {
        console.error('Failed to save registered user:', err);
      }
    }

    await sendMainMenu(ctx, `Tabriklaymiz! Ro'yxatdan muvaffaqiyatli o'tdingiz. Pastdagi tugmalar orqali taomlarni tanlashingiz va buyurtma berishingiz mumkin:`);
    return;
  }

  // Handle checkout flow steps
  if (ctx.session.checkoutStep === 'ask_address') {
    if (text.length < 5) {
      return ctx.reply('Iltimos, manzilni to\'liqroq yozing:');
    }
    ctx.session.checkoutData.address = text;
    ctx.session.checkoutStep = undefined;
    await askConfirmation(ctx);
    return;
  }

  if (ctx.session.checkoutStep === 'ask_table') {
    if (text.length === 0) {
      return ctx.reply('Stol raqamini kiriting:');
    }
    ctx.session.checkoutData.table_number = text;
    ctx.session.checkoutStep = undefined;
    await askConfirmation(ctx);
    return;
  }

  // General Text Routing
  if (ctx.session.isRegistered) {
    // If text matches buttons but somehow wasn't caught by hears:
    if (text === '🍽 Menyu / Buyurtma') return triggerMenu(ctx);
    if (text === '🛒 Savatcha') return showCart(ctx);
    if (text === '📦 Buyurtmalar tarixi') return; // Handled by hears
    if (text === 'ℹ️ Ma\'lumot') return; // Handled by hears

    // Otherwise show menu reminder
    await ctx.reply('Quyidagi menyu tugmalaridan foydalaning:');
  } else {
    // User is not registered
    await ctx.reply('Iltimos, avval ro\'yxatdan o\'ting. /start buyrug\'ini yuboring.');
  }
});

// Handle contact shares for phone number registration
bot.on('contact', async (ctx) => {
  if (ctx.session.registrationStep === 'ask_phone') {
    const contact = ctx.message.contact;
    if (contact) {
      ctx.session.regData.phone = contact.phone_number;
      ctx.session.registrationStep = undefined;
      ctx.session.isRegistered = true;

      // Save user registration to database
      if (ctx.from?.id) {
        try {
          await saveUser(ctx.from.id, ctx.session.regData.name || 'Mijoz', ctx.session.regData.phone);
        } catch (err) {
          console.error('Failed to save registered user:', err);
        }
      }

      await sendMainMenu(ctx, `Tabriklaymiz! Telefon raqamingiz muvaffaqiyatli qabul qilindi. Pastdagi menyudan foydalanishingiz mumkin:`);
    } else {
      await ctx.reply('Kontaktni ulashib bo\'lmadi. Iltimos, telefon raqamingizni qo\'lda yozib yuboring:');
    }
  }
});

// Global error handler for telegraf
bot.catch((err, ctx) => {
  console.error(`Telegraf encountered an error for ${ctx.updateType}:`, err);
});
