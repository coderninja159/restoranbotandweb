-- SQL Schema for Restaurant Bot and Web Ecosystem
-- Compatible with Supabase and standard PostgreSQL.

-- Enable UUID extension if needed (optional, using serial/integer for IDs as standard)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist to allow clean recreations
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;

-- Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name_uz VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for fast lookup by category slug
CREATE INDEX idx_categories_slug ON categories(slug);

-- Products Table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name_uz VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) DEFAULT NULL, -- Nullable as prices are pending
    image_url TEXT DEFAULT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for performance optimizations
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_available ON products(is_available);

-- Seed Data Insertion
-- Insert Categories
INSERT INTO categories (name_uz, slug) VALUES
('Birinchi taomlar', 'birinchi-taomlar'),
('Ikkinchi taomlar', 'ikkinchi-taomlar'),
('Salatlar', 'salatlar'),
('Somsa', 'somsa'),
('Goryachie zakuski', 'goryachie-zakuski'),
('Shashliklar', 'shashliklar');

-- Insert Products mapped to categories
-- 1. Birinchi taomlar (category_id = 1)
INSERT INTO products (category_id, name_uz) VALUES
(1, 'Sho''rva'),
(1, 'Mastava'),
(1, 'Lagmon suyuq');

-- 2. Ikkinchi taomlar (category_id = 2)
INSERT INTO products (category_id, name_uz) VALUES
(2, 'Manti'),
(2, 'Kozon kabob'),
(2, 'Tushonka'),
(2, 'Vaguri'),
(2, 'Tabaka 1 kg'),
(2, 'Osh + bedana tuxum');

-- 3. Salatlar (category_id = 3)
INSERT INTO products (category_id, name_uz) VALUES
(3, 'Baklajan xrustyashiy'),
(3, 'Achu-chuchuk'),
(3, 'Suzma'),
(3, 'Choban'),
(3, 'Svejiy'),
(3, 'Sezar'),
(3, 'Olivye'),
(3, 'Toshkent'),
(3, 'Vesenniy'),
(3, 'Fri'),
(3, 'Mujskoy kapris'),
(3, 'Solyonniy assorti'),
(3, 'Achik suzma'),
(3, 'Katik domashniy'),
(3, 'Kazi'),
(3, 'Til mol go''sht');

-- 4. Somsa (category_id = 4)
INSERT INTO products (category_id, name_uz) VALUES
(4, 'Go''sht somsa'),
(4, 'Ko''k somsa'),
(4, 'Ovoshnoy somsa');

-- 5. Goryachie zakuski (category_id = 5)
INSERT INTO products (category_id, name_uz) VALUES
(5, 'Fri'),
(5, 'Qaynatilgan guruch'),
(5, 'Kovurilgan chuchvara');

-- 6. Shashliklar (category_id = 6)
INSERT INTO products (category_id, name_uz) VALUES
(6, 'Semechki'),
(6, 'Mol jaz'),
(6, 'Qo''y jaz'),
(6, 'Qiyma'),
(6, 'Tovug file'),
(6, 'Tovug ganot'),
(6, 'Ovoshnoy'),
(6, 'Gribnoy'),
(6, 'Napoleon'),
(6, 'Rulet'),
(6, 'Koreyka'),
(6, 'Jigar'),
(6, 'Tovug bedro'),
(6, 'Yangi kartoshka');
