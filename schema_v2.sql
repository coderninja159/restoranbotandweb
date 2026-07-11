-- Schema V2 for Restaurant Bot and Web Ecosystem
-- Adds orders, order_items, and assigns prices to products.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to recreate with updated constraints/columns
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- Users Table (Telegram Users)
CREATE TABLE users (
    id BIGINT PRIMARY KEY, -- Telegram User ID
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name_uz VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_categories_slug ON categories(slug);

-- Products Table (with Price column required)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name_uz VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL, -- UZS Prices
    old_price NUMERIC(10, 2) DEFAULT NULL, -- Old price for discounts
    image_url TEXT DEFAULT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_available ON products(is_available);

-- Orders Table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL, -- Telegram User ID
    user_name VARCHAR(255) NOT NULL,
    user_phone VARCHAR(50) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    order_type VARCHAR(50) NOT NULL, -- 'delivery', 'pickup', 'table'
    table_number VARCHAR(50) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Order Items Table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(10, 2) NOT NULL -- Price at purchase
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Seed Data Insertion
-- Insert Categories
INSERT INTO categories (name_uz, slug) VALUES
('Birinchi taomlar', 'birinchi-taomlar'),
('Ikkinchi taomlar', 'ikkinchi-taomlar'),
('Salatlar', 'salatlar'),
('Somsa', 'somsa'),
('Goryachie zakuski', 'goryachie-zakuski'),
('Shashliklar', 'shashliklar');

-- Insert Products with UZS prices
-- 1. Birinchi taomlar (category_id = 1)
INSERT INTO products (category_id, name_uz, price, old_price, image_url) VALUES
(1, 'Sho''rva', 22000, 30000, '/images/shorva.png'),
(1, 'Mastava', 20000, 28000, '/images/shorva.png'),
(1, 'Lagmon suyuq', 25000, 35000, '/images/shorva.png');

-- 2. Ikkinchi taomlar (category_id = 2)
INSERT INTO products (category_id, name_uz, price, old_price, image_url) VALUES
(2, 'Manti (dona)', 6000, 8500, '/images/manti.png'),
(2, 'Kozon kabob', 45000, 65000, '/images/plov.png'),
(2, 'Tushonka', 40000, 55000, NULL),
(2, 'Vaguri', 55000, 75000, NULL),
(2, 'Tabaka 1 kg', 85000, 110000, NULL),
(2, 'Osh + bedana tuxum', 30000, 42000, '/images/plov.png');

-- 3. Salatlar (category_id = 3)
INSERT INTO products (category_id, name_uz, price, old_price, image_url) VALUES
(3, 'Baklajan xrustyashiy', 22000, 30000, NULL),
(3, 'Achu-chuchuk', 12000, 18000, '/images/achichuk.png'),
(3, 'Suzma', 10000, 14000, NULL),
(3, 'Choban', 15000, 20000, NULL),
(3, 'Svejiy', 12000, 17000, NULL),
(3, 'Sezar', 28000, 38000, NULL),
(3, 'Olivye', 20000, 27000, NULL),
(3, 'Toshkent', 24000, 32000, NULL),
(3, 'Vesenniy', 18000, 24000, NULL),
(3, 'Fri', 15000, 20000, NULL),
(3, 'Mujskoy kapris', 32000, 45000, NULL),
(3, 'Solyonniy assorti', 25000, 34000, NULL),
(3, 'Achik suzma', 10000, 13000, NULL),
(3, 'Katik domashniy', 12000, 16000, NULL),
(3, 'Kazi (dona)', 15000, 20000, NULL),
(3, 'Til mol go''sht', 35000, 48000, NULL);

-- 4. Somsa (category_id = 4)
INSERT INTO products (category_id, name_uz, price, old_price, image_url) VALUES
(4, 'Go''sht somsa', 8000, 11000, '/images/somsa.png'),
(4, 'Ko''k somsa', 7000, 9500, '/images/somsa.png'),
(4, 'Ovoshnoy somsa', 6000, 8000, '/images/somsa.png');

-- 5. Goryachie zakuski (category_id = 5)
INSERT INTO products (category_id, name_uz, price, old_price, image_url) VALUES
(5, 'Kartoshka fri', 15000, 20000, NULL),
(5, 'Qaynatilgan guruch', 8000, 11000, NULL),
(5, 'Kovurilgan chuchvara', 22000, 30000, NULL);

-- 6. Shashliklar (category_id = 6)
INSERT INTO products (category_id, name_uz, price, old_price, image_url) VALUES
(6, 'Semechki shashlik', 18000, 24000, '/images/shashlik.png'),
(6, 'Mol jaz shashlik', 20000, 27000, '/images/shashlik.png'),
(6, 'Qo''y jaz shashlik', 22000, 30000, '/images/shashlik.png'),
(6, 'Qiyma shashlik', 16000, 22000, '/images/shashlik.png'),
(6, 'Tovug file shashlik', 17000, 23000, '/images/shashlik.png'),
(6, 'Tovug ganot shashlik', 15000, 20000, '/images/shashlik.png'),
(6, 'Ovoshnoy shashlik', 10000, 14000, '/images/shashlik.png'),
(6, 'Gribnoy shashlik', 12000, 16000, '/images/shashlik.png'),
(6, 'Napoleon shashlik', 24000, 32000, '/images/shashlik.png'),
(6, 'Rulet shashlik', 22000, 30000, '/images/shashlik.png'),
(6, 'Koreyka shashlik', 25000, 34000, '/images/shashlik.png'),
(6, 'Jigar shashlik', 15000, 20000, '/images/shashlik.png'),
(6, 'Tovug bedro shashlik', 17000, 23000, '/images/shashlik.png'),
(6, 'Yangi kartoshka shashlik', 12000, 16000, '/images/shashlik.png');
