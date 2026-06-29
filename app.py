import os
import base64
import uuid
from functools import wraps
from decimal import Decimal
from datetime import datetime
from html import escape
from io import BytesIO
import json
import urllib.request
import mysql.connector
from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request, session, send_from_directory
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime, timedelta  # Add timedelta if not already imported
import requests  # Add if not already imported
import requests
import os

# Load optional .env values for database credentials and app secrets.
load_dotenv()

# Flask serves the built React app from dist/ and exposes JSON APIs under /api.
app = Flask(__name__, static_folder="dist", static_url_path="")
app.secret_key = os.getenv("FLASK_SECRET_KEY", "zicture-dev-secret")
CORS(app, supports_credentials=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PHOTO_DIR = os.path.join(BASE_DIR, "photo")

# Shared category map used by the catalog, filters, admin form, and seed products.
CATEGORIES = {
    "all": {"label": "All Products", "icon": "Grid2X2"},
    "food": {"label": "Food", "icon": "Utensils"},
    "grocery": {"label": "Grocery", "icon": "ShoppingBasket"},
    "games": {"label": "Games", "icon": "Gamepad2"},
    "clothes": {"label": "Clothes", "icon": "Shirt"},
    "fashion": {"label": "Fashion", "icon": "ShoppingBag"},
    "medicine": {"label": "Medicine", "icon": "Pill"},
    "software": {"label": "Software", "icon": "Code2"},
    "kids": {"label": "Kids", "icon": "Baby"},
    "machineries": {"label": "Machineries", "icon": "Wrench"},
    "electronics": {"label": "Electronics", "icon": "Laptop"},
    "books": {"label": "Books", "icon": "BookOpen"},
    "beauty": {"label": "Beauty", "icon": "Sparkles"},
    "home": {"label": "Home & Living", "icon": "House"},
    "sports": {"label": "Sports", "icon": "Dumbbell"},
    "automotive": {"label": "Automotive", "icon": "Car"},
    "stationery": {"label": "Stationery", "icon": "PenLine"},
    "travel": {"label": "Travel", "icon": "Plane"},
    "pets": {"label": "Pet Care", "icon": "Heart"},
    "garden": {"label": "Garden", "icon": "Flower2"},
}

SAMPLE_PRODUCTS = [
    ("Gaming Laptop", "electronics", 78000, "High performance laptop for study, work, and gaming", "pexels-josh-sorenson-1714208.jpg", 5, 12, 1, 0, 1),
    ("Android Smartphone", "electronics", 24500, "Fast mobile phone with long battery life", "mobile-app-development-1.png", 5, 30, 1, 1, 1),
    ("Organic Rice Pack", "food", 780, "Quality rice pack for family meals", "image (27).jpg", 5, 70, 1, 0, 1),
    ("Family Grocery Box", "grocery", 1350, "Rice, lentils, snacks, and daily kitchen essentials", "image (38).jpg", 4, 64, 1, 0, 1),
    ("Cotton Shirt", "clothes", 800, "Quality cotton shirt with clean casual styling", "16052288-christmas-shopping-girl-with-bags-in-shopping-mall.webp", 4, 40, 0, 0, 1),
    ("Urban Fashion Combo", "fashion", 3200, "Shoes, top, and casual accessories for daily looks", "pexels-edgars-kisuro-1488463.jpg", 5, 20, 0, 1, 1),
    ("Programming Book Set", "books", 950, "Helpful technology and learning books", "pexels-pixabay-33487.jpg", 5, 35, 0, 1, 1),
    ("Skin Care Bundle", "beauty", 1250, "Daily personal care and beauty bundle", "remmake.png", 5, 30, 1, 0, 1),
    ("Fitness Kit", "sports", 1600, "Basic sports and fitness equipment", "pexels-thallen-merlin-1630436.jpg", 4, 22, 0, 0, 1),
    ("Office Suite", "software", 4500, "Professional office software license", "image (133).jpg", 5, 15, 0, 1, 1),
    ("Kids Learning Tablet", "kids", 2400, "Educational toy tablet with learning activities", "pexels-polesie-toys-4487907.jpg", 5, 33, 0, 0, 1),
    ("Power Drill", "machineries", 3500, "Heavy duty drill for everyday workshop tasks", "image (159).jpg", 5, 10, 0, 0, 1),
    ("First Aid Kit", "medicine", 750, "Complete first aid kit for home safety", "image (44).jpg", 5, 40, 1, 0, 1),
    ("Home Decor Set", "home", 1800, "Decorative home and living accessories", "set.jpg", 4, 20, 0, 1, 1),
    ("Car Care Pack", "automotive", 1100, "Cleaning and care essentials for vehicles", "pexels-mike-b-102977.jpg", 4, 28, 0, 0, 1),
    ("Student Stationery Pack", "stationery", 420, "Notebook, pen, pencil, and study supplies", "pexels-pixabay-33487.jpg", 5, 80, 1, 0, 1),
    ("Weekend Travel Kit", "travel", 2600, "Bag, organizer, bottle, and compact travel essentials", "pexels-kaique-rocha-90368.jpg", 4, 18, 0, 1, 1),
    ("Pet Care Starter", "pets", 1450, "Food bowl, grooming brush, and care essentials", "pexels-polesie-toys-4487907.jpg", 4, 26, 0, 0, 1),
    ("Balcony Garden Set", "garden", 1750, "Planter, gloves, seed pack, and home garden tools", "pexels-nicole-michalou-5779170.jpg", 5, 22, 1, 0, 1),
    ("Organic Bread", "food", 45, "Fresh organic bread for breakfast and snacks", "image (44).jpg", 5, 50, 1, 0, 1),
    ("Fresh Vegetables", "food", 120, "Seasonal vegetables for daily cooking", "image (164).jpg", 4, 100, 1, 0, 1),
    ("Dairy Products", "food", 80, "Premium milk, yogurt, and dairy essentials", "image (124).jpg", 5, 75, 0, 0, 1),
    ("Fruits Basket", "food", 150, "Assorted fresh fruits for family meals", "image (26).jpg", 5, 60, 1, 0, 1),
    ("Action Game", "games", 1500, "Latest action game for console and PC players", "image (44).jpg", 5, 20, 0, 1, 1),
    ("Adventure Game", "games", 1800, "Epic adventure game with story missions", "image (164).jpg", 4, 15, 0, 1, 1),
    ("Strategy Game", "games", 2000, "Strategic gameplay for long sessions", "image (124).jpg", 5, 18, 0, 0, 1),
    ("Jeans Pants", "clothes", 1500, "Premium jeans with everyday comfort", "image (164).jpg", 5, 30, 0, 0, 1),
    ("Summer Dress", "clothes", 1200, "Casual summer dress with soft fabric", "image (44).jpg", 5, 25, 0, 1, 1),
    ("Thermometer", "medicine", 300, "Digital thermometer for home health checks", "image (164).jpg", 4, 60, 1, 0, 1),
    ("Blood Pressure Monitor", "medicine", 1500, "Digital BP monitor for family care", "image (124).jpg", 5, 20, 0, 0, 1),
    ("Antivirus Pro", "software", 1200, "Security software license for personal devices", "image (164).jpg", 5, 30, 0, 0, 1),
    ("Photo Editor", "software", 2000, "Advanced image editor subscription", "image (124).jpg", 4, 25, 0, 1, 1),
    ("Toy Building Blocks", "kids", 500, "Educational blocks for creative play", "image (44).jpg", 5, 50, 1, 0, 1),
    ("Puzzle Game", "kids", 400, "Fun puzzle game for kids and families", "image (164).jpg", 4, 60, 0, 0, 1),
    ("Circular Saw", "machineries", 5000, "Professional saw for workshop projects", "image (164).jpg", 4, 8, 0, 0, 1),
    ("USB-C Cable", "electronics", 250, "Fast charging cable for modern devices", "image (44).jpg", 5, 200, 1, 0, 1),
    ("Mechanical Keyboard", "electronics", 2500, "Gaming keyboard with tactile switches", "image (124).jpg", 5, 50, 0, 1, 1),
    ("Tablet Pro", "electronics", 32000, "Portable tablet for reading, work, and media", "pexels-pixabay-163036.jpg", 4, 18, 0, 1, 1),
    ("Noise Cancelling Headphones", "electronics", 5200, "Wireless headphones with clear sound and soft ear pads", "image (106).jpg", 5, 26, 0, 0, 1),
    ("Smart Watch Active", "electronics", 6500, "Fitness, calls, notifications, and daily tracking on wrist", "image (120).jpg", 4, 34, 0, 1, 1),
    ("Office Chair", "home", 8500, "Comfortable chair for work and study setup", "pexels-julie-aagaard-2433868.jpg", 4, 16, 0, 0, 1),
    ("Kitchen Storage Set", "home", 1450, "Clean storage boxes for kitchen and home organization", "pexels-nicole-michalou-5779170.jpg", 4, 40, 1, 0, 1),
    ("Cotton Bed Sheet", "home", 1750, "Soft bed sheet set for daily home comfort", "pexels-kristina-paukshtite-1146760.jpg", 5, 32, 0, 0, 1),
    ("Perfume Gift Box", "beauty", 2200, "Elegant personal care gift item", "image (83).jpg", 5, 24, 0, 1, 1),
    ("Makeup Essentials Kit", "beauty", 1850, "Useful beauty kit for daily styling and travel", "image (35).jpg", 5, 27, 0, 0, 1),
    ("Football", "sports", 900, "Durable sports ball for everyday play", "pexels-pixabay-163546.jpg", 4, 35, 1, 0, 1),
    ("Yoga Mat", "sports", 780, "Comfortable exercise mat for home workouts", "pexels-thallen-merlin-1630436.jpg", 4, 42, 0, 0, 1),
    ("Dumbbell Pair", "sports", 2600, "Adjustable dumbbell pair for strength training", "pexels-bruno-massao-2873486.jpg", 5, 15, 0, 1, 1),
    ("Notebook Bundle", "stationery", 300, "Colorful notebooks for class and office", "pexels-luis-quintero-2148216.jpg", 4, 90, 1, 0, 1),
    ("Premium Pen Set", "stationery", 260, "Smooth writing pens for school, office, and exams", "pexels-pixabay-33487.jpg", 4, 120, 1, 0, 1),
    ("Engine Oil", "automotive", 1350, "Quality engine care product", "pexels-mike-b-191360.jpg", 4, 20, 0, 0, 1),
    ("Motorbike Helmet", "automotive", 3200, "Protective helmet with comfortable inner padding", "pexels-partha-sekhar-borah-1988624.jpg", 5, 14, 0, 1, 1),
    ("Coffee Beans", "food", 650, "Roasted coffee beans for rich daily coffee", "image (38).jpg", 4, 45, 0, 0, 1),
    ("Accounting Software", "software", 3200, "Business accounting and invoicing software license", "image (133).jpg", 5, 14, 0, 0, 1),
    ("Water Pump", "machineries", 7400, "Useful water pump for home and small farm use", "image (164).jpg", 5, 8, 0, 1, 1),
    ("Winter Jacket", "clothes", 2600, "Warm jacket with modern casual styling", "image (44).jpg", 5, 21, 0, 0, 1),
    ("Hand Sanitizer Pack", "medicine", 280, "Daily hygiene sanitizer pack for family use", "image (38).jpg", 4, 100, 1, 0, 1),
]

# Known head office cities for each supported country
HEAD_OFFICES = {
    'Bangladesh': 'Magura',
    'Pakistan': 'Karachi',
    'Afghanistan': 'Kabul',
    'China': 'Guangzhou',
    'United States': 'New York',
    'United Kingdom': 'London',
    'India': 'New Delhi',
    'Japan': 'Tokyo',
}

# Currency Exchange Service
class CurrencyExchangeService:
    
    def __init__(self):
        self.base_currency = 'USD'
        self.fallback_rates = {
            'EUR': 0.85, 'GBP': 0.73, 'JPY': 110.0, 'CAD': 1.25,
            'AUD': 1.35, 'CHF': 0.92, 'CNY': 6.45, 'INR': 74.50,
            'BRL': 5.20, 'RUB': 74.00, 'KRW': 1180.0, 'MXN': 20.0,
            'SGD': 1.35, 'HKD': 7.80, 'NOK': 8.50, 'SEK': 8.60,
            'DKK': 6.30, 'PLN': 3.80, 'CZK': 21.50, 'HUF': 295.0,
            'BGN': 1.66, 'RON': 4.15, 'HRK': 6.40, 'TRY': 8.50,
            'ILS': 3.25, 'CLP': 760.0, 'PHP': 50.0, 'MYR': 4.15,
            'THB': 31.0, 'IDR': 14250.0, 'VND': 23100.0, 'BDT': 84.50,
            'PKR': 155.0, 'LKR': 198.0, 'NPR': 119.0, 'SAR': 3.75,
            'AED': 3.67, 'QAR': 3.64, 'KWD': 0.30, 'BHD': 0.38,
            'OMR': 0.38, 'JOD': 0.71, 'EGP': 15.70, 'MAD': 9.00,
            'ZAR': 14.50, 'NGN': 410.0, 'GHS': 6.10, 'KES': 110.0
        }
    
    def get_exchange_rates(self, force_refresh=False):
        """Get exchange rates from cache or API"""
        try:
            if not force_refresh:
                cached_rates = self._get_cached_rates()
                if cached_rates:
                    return cached_rates
            
            # Fetch from API
            rates = self._fetch_from_api()
            if rates:
                self._cache_rates(rates)
                return rates
            else:
                # Fallback to cached rates even if old
                cached_rates = self._get_cached_rates(ignore_expiry=True)
                if cached_rates:
                    print("Warning: Using old cached rates due to API failure")
                    return cached_rates
                else:
                    # Ultimate fallback
                    print("Warning: Using fallback rates")
                    return self._get_fallback_rates()
                    
        except Exception as e:
            print(f"Error getting exchange rates: {str(e)}")
            return self._get_fallback_rates()
    
    def _get_cached_rates(self, ignore_expiry=False):
        """Get rates from database cache"""
        try:
            if ignore_expiry:
                query = """
                    SELECT target_currency, rate, last_updated 
                    FROM exchange_rates 
                    WHERE base_currency = %s
                    ORDER BY last_updated DESC
                """
                result = fetch_all(query, (self.base_currency,))
            else:
                expiry_time = datetime.now() - timedelta(hours=24)
                query = """
                    SELECT target_currency, rate, last_updated 
                    FROM exchange_rates 
                    WHERE base_currency = %s 
                    AND last_updated > %s
                """
                result = fetch_all(query, (self.base_currency, expiry_time))
            
            if result:
                rates = {row['target_currency']: float(row['rate']) for row in result}
                rates[self.base_currency] = 1.0  # Base currency rate
                return rates
            
            return None
            
        except Exception as e:
            print(f"Error getting cached rates: {str(e)}")
            return None
    
    def _fetch_from_api(self):
        """Fetch rates from external API"""
        try:
            url = f"https://api.exchangerate-api.com/v4/latest/{self.base_currency}"
            
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if 'rates' in data:
                rates = data['rates']
                rates[self.base_currency] = 1.0
                return rates
            
            return None
            
        except Exception as e:
            print(f"Error fetching from API: {str(e)}")
            return None
    
    def _cache_rates(self, rates):
        """Cache rates in database"""
        try:
            cnx = connect()
            cur = cnx.cursor()
            
            for currency, rate in rates.items():
                if currency != self.base_currency:
                    cur.execute("""
                        INSERT INTO exchange_rates (base_currency, target_currency, rate, last_updated)
                        VALUES (%s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE 
                        rate = VALUES(rate), 
                        last_updated = VALUES(last_updated)
                    """, (self.base_currency, currency, rate, datetime.now()))
            
            cnx.commit()
            cur.close()
            cnx.close()
            print(f"Cached {len(rates)} exchange rates")
            
        except Exception as e:
            print(f"Error caching rates: {str(e)}")
    
    def _get_fallback_rates(self):
        """Get fallback rates when all else fails"""
        rates = self.fallback_rates.copy()
        rates[self.base_currency] = 1.0
        return rates
    
    def convert_currency(self, amount, from_currency, to_currency):
        """Convert amount from one currency to another"""
        try:
            if from_currency == to_currency:
                return float(amount)
            
            rates = self.get_exchange_rates()
            
            # Convert to base currency first
            if from_currency != self.base_currency:
                if from_currency not in rates:
                    raise ValueError(f"Currency {from_currency} not supported")
                amount_in_base = float(amount) / rates[from_currency]
            else:
                amount_in_base = float(amount)
            
            # Convert to target currency
            if to_currency != self.base_currency:
                if to_currency not in rates:
                    raise ValueError(f"Currency {to_currency} not supported")
                final_amount = amount_in_base * rates[to_currency]
            else:
                final_amount = amount_in_base
            
            return round(final_amount, 2)
            
        except Exception as e:
            print(f"Error converting currency: {str(e)}")
            raise
    
    def get_supported_currencies(self):
        """Get list of supported currencies"""
        try:
            rates = self.get_exchange_rates()
            return list(rates.keys())
        except Exception:
            return list(self.fallback_rates.keys()) + [self.base_currency]
    
    def format_price(self, amount, currency_code):
        """Format price with currency symbol"""
        currency_symbols = {
            'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CNY': '¥',
            'CAD': 'C$', 'AUD': 'A$', 'CHF': 'CHF', 'INR': '₹',
            'BRL': 'R$', 'RUB': '₽', 'KRW': '₩', 'MXN': '$',
            'SGD': 'S$', 'HKD': 'HK$', 'SEK': 'kr', 'NOK': 'kr',
            'DKK': 'kr', 'PLN': 'zł', 'TRY': '₺', 'BDT': '৳',
            'PKR': '₨', 'SAR': 'SR', 'AED': 'AED', 'EGP': 'E£',
            'ZAR': 'R', 'NGN': '₦', 'THB': '฿', 'MYR': 'RM',
            'IDR': 'Rp', 'VND': '₫', 'PHP': '₱'
        }
        
        symbol = currency_symbols.get(currency_code, currency_code + ' ')
        
        # Format based on currency
        if currency_code in ['JPY', 'KRW', 'VND', 'IDR']:
            # No decimal places for these currencies
            return f"{symbol}{int(amount):,}"
        else:
            return f"{symbol}{amount:,.2f}"

# Initialize currency service
currency_service = CurrencyExchangeService()


def save_profile_image(data_url):
    """Persist a base64 profile image from the React registration preview."""
    if not data_url or not isinstance(data_url, str) or "," not in data_url:
        return ""
    header, payload = data_url.split(",", 1)
    if "base64" not in header or not header.startswith("data:image/"):
        return ""
    ext = header.split("data:image/", 1)[1].split(";", 1)[0].lower()
    if ext not in {"png", "jpg", "jpeg", "webp"}:
        ext = "png"
    raw = base64.b64decode(payload, validate=True)
    if len(raw) > 2 * 1024 * 1024:
        raise ValueError("Profile image must be under 2MB")
    profile_dir = os.path.join(PHOTO_DIR, "profiles")
    os.makedirs(profile_dir, exist_ok=True)
    filename = f"profile-{uuid.uuid4().hex}.{ext}"
    with open(os.path.join(profile_dir, filename), "wb") as fh:
        fh.write(raw)
    return f"profiles/{filename}"


def db_config(database=True):
    """Return the XAMPP/MySQL connection settings."""
    cfg = {
        "host": os.getenv("DB_HOST", "127.0.0.1"),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASSWORD", ""),
        "charset": "utf8mb4",
        "use_unicode": True,
    }
    if database:
        cfg["database"] = os.getenv("DB_NAME", "zicture")
    return cfg


def connect(database=True):
    """Create a MySQL connection. database=False is used before DB creation."""
    return mysql.connector.connect(**db_config(database))


def row_to_json(row):
    """Convert MySQL rows with Decimal values into JSON-safe Python values."""
    if isinstance(row, dict):
        return {k: row_to_json(v) for k, v in row.items()}
    if isinstance(row, list):
        return [row_to_json(v) for v in row]
    if isinstance(row, Decimal):
        return float(row)
    return row


def fetch_all(query, params=()):
    """Read many records and return them as JSON-safe dictionaries."""
    cnx = connect()
    cur = cnx.cursor(dictionary=True)
    cur.execute(query, params)
    rows = cur.fetchall()
    cur.close()
    cnx.close()
    return row_to_json(rows)


def fetch_one(query, params=()):
    """Read one record and return it as a JSON-safe dictionary."""
    cnx = connect()
    cur = cnx.cursor(dictionary=True)
    cur.execute(query, params)
    row = cur.fetchone()
    cur.close()
    cnx.close()
    return row_to_json(row) if row else None


def execute(query, params=()):
    """Run a write query and return the inserted id when available."""
    cnx = connect()
    cur = cnx.cursor()
    cur.execute(query, params)
    cnx.commit()
    last_id = cur.lastrowid
    cur.close()
    cnx.close()
    return last_id


def current_user():
    """Resolve the logged-in user from the Flask session cookie."""
    user_id = session.get("user_id")
    if not user_id:
        return None
    return fetch_one("SELECT id, name, email, avatar, avatar AS profile_image, role FROM users WHERE id=%s", (user_id,))


def login_required(fn):
    """Block shop APIs until the user logs in."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user():
            return jsonify({"error": "Login required"}), 401
        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    """Block admin APIs unless the logged-in user has the admin role."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user or user["role"] != "admin":
            return jsonify({"error": "Admin login required"}), 403
        return fn(*args, **kwargs)

    return wrapper


def owner_key():
    """Use a stable per-user key for cart, wishlist, compare, and orders."""
    return f"user:{session['user_id']}"


def init_database():
    """Create or upgrade all tables needed by the Flask/React version."""
    db_name = os.getenv("DB_NAME", "zicture")
    cnx = connect(database=False)
    cur = cnx.cursor()
    cur.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    cnx.commit()
    cur.close()
    cnx.close()

    cnx = connect()
    cur = cnx.cursor()
    cur.execute(
        """CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            avatar VARCHAR(255),
            provider VARCHAR(50) DEFAULT 'email',
            role VARCHAR(30) DEFAULT 'customer',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    cur.execute(
        """CREATE TABLE IF NOT EXISTS products (
            id INT PRIMARY KEY AUTO_INCREMENT,
            sku VARCHAR(80),
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            description TEXT,
            image VARCHAR(255),
            rating INT DEFAULT 0,
            stock INT DEFAULT 100,
            is_daily TINYINT(1) DEFAULT 0,
            is_upcoming TINYINT(1) DEFAULT 0,
            is_featured TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    cur.execute(
        """CREATE TABLE IF NOT EXISTS cart (
            id INT PRIMARY KEY AUTO_INCREMENT,
            session_id VARCHAR(255) NOT NULL,
            product_id INT NOT NULL,
            quantity INT DEFAULT 1,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_owner_product (session_id, product_id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )"""
    )
    cur.execute(
        """CREATE TABLE IF NOT EXISTS wishlist (
            id INT PRIMARY KEY AUTO_INCREMENT,
            session_id VARCHAR(255) NOT NULL,
            product_id INT NOT NULL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_wishlist_owner_product (session_id, product_id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )"""
    )
    cur.execute(
        """CREATE TABLE IF NOT EXISTS compare_items (
            id INT PRIMARY KEY AUTO_INCREMENT,
            session_id VARCHAR(255) NOT NULL,
            product_id INT NOT NULL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_compare_owner_product (session_id, product_id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )"""
    )
    cur.execute(
        """CREATE TABLE IF NOT EXISTS orders (
            id INT PRIMARY KEY AUTO_INCREMENT,
            session_id VARCHAR(255) NOT NULL,
            total_price DECIMAL(10, 2) NOT NULL,
            subtotal DECIMAL(10, 2) DEFAULT 0,
            discount DECIMAL(10, 2) DEFAULT 0,
            tax DECIMAL(10, 2) DEFAULT 0,
            shipping DECIMAL(10, 2) DEFAULT 0,
            coupon_code VARCHAR(50),
            customer_name VARCHAR(255),
            customer_email VARCHAR(255),
            delivery_city VARCHAR(100),
            delivery_address TEXT,
            payment_method VARCHAR(80) DEFAULT 'demo_card',
            payment_status VARCHAR(50) DEFAULT 'demo_paid',
            status VARCHAR(50) DEFAULT 'confirmed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    cur.execute(
        """CREATE TABLE IF NOT EXISTS order_items (
            id INT PRIMARY KEY AUTO_INCREMENT,
            order_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )"""
    )
    cur.execute(
        """CREATE TABLE IF NOT EXISTS feedback (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT,
            name VARCHAR(255),
            email VARCHAR(255),
            subject VARCHAR(255),
            message TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'new',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )"""
    )
    cur.execute(
        """CREATE TABLE IF NOT EXISTS delivery_locations (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL UNIQUE,
            city VARCHAR(100),
            street VARCHAR(255),
            zipcode VARCHAR(40),
            phone VARCHAR(80),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )"""
    )

    # Add exchange rates tables
    cur.execute(
        """CREATE TABLE IF NOT EXISTS exchange_rates (
            id INT PRIMARY KEY AUTO_INCREMENT,
            base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
            target_currency VARCHAR(3) NOT NULL,
            rate DECIMAL(12,6) NOT NULL,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_currency_pair (base_currency, target_currency),
            INDEX idx_target_currency (target_currency),
            INDEX idx_last_updated (last_updated)
        )"""
    )
    
    cur.execute(
        """CREATE TABLE IF NOT EXISTS exchange_rate_config (
            id INT PRIMARY KEY AUTO_INCREMENT,
            api_provider VARCHAR(50) NOT NULL,
            api_key VARCHAR(255),
            base_currency VARCHAR(3) DEFAULT 'USD',
            last_sync TIMESTAMP,
            sync_frequency INT DEFAULT 86400,
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    
    # Insert default configuration
    cur.execute("SELECT COUNT(*) FROM exchange_rate_config")
    if cur.fetchone()[0] == 0:
        cur.execute("INSERT INTO exchange_rate_config (api_provider, base_currency) VALUES ('exchangerate-api', 'USD')")

    def ensure_column(table, column, ddl):
        """Add a missing column without breaking existing XAMPP tables."""
        cur.execute(f"SHOW COLUMNS FROM {table} LIKE %s", (column,))
        if not cur.fetchone():
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")

    for column, ddl in {
        "sku": "sku VARCHAR(80) NULL AFTER id",
        "is_daily": "is_daily TINYINT(1) DEFAULT 0",
        "is_upcoming": "is_upcoming TINYINT(1) DEFAULT 0",
        "is_featured": "is_featured TINYINT(1) DEFAULT 1",
    }.items():
        ensure_column("products", column, ddl)
    for column, ddl in {
        "subtotal": "subtotal DECIMAL(10, 2) DEFAULT 0 AFTER total_price",
        "discount": "discount DECIMAL(10, 2) DEFAULT 0 AFTER subtotal",
        "tax": "tax DECIMAL(10, 2) DEFAULT 0 AFTER discount",
        "shipping": "shipping DECIMAL(10, 2) DEFAULT 0 AFTER tax",
        "coupon_code": "coupon_code VARCHAR(50) NULL AFTER shipping",
        "customer_name": "customer_name VARCHAR(255) NULL AFTER coupon_code",
        "customer_email": "customer_email VARCHAR(255) NULL AFTER customer_name",
        "delivery_city": "delivery_city VARCHAR(100) NULL AFTER customer_email",
        "delivery_address": "delivery_address TEXT NULL AFTER delivery_city",
        "payment_method": "payment_method VARCHAR(80) DEFAULT 'demo_card' AFTER delivery_address",
        "payment_status": "payment_status VARCHAR(50) DEFAULT 'demo_paid' AFTER payment_method",
    }.items():
        ensure_column("orders", column, ddl)
    for column, ddl in {
        "country": "country VARCHAR(80) NULL AFTER city",
        "is_head_office": "is_head_office TINYINT(1) DEFAULT 0 AFTER phone",
    }.items():
        ensure_column("delivery_locations", column, ddl)
    admin_email = os.getenv("ADMIN_EMAIL", "admin@zicture.com").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123").strip()
    cur.execute("SELECT COUNT(*) FROM users WHERE email=%s AND role='admin'", (admin_email,))
    admin_exists = cur.fetchone()[0] > 0
    if admin_password:
        password_hash = generate_password_hash(admin_password)
        if admin_exists:
            cur.execute(
                "UPDATE users SET password_hash=%s, provider='email' WHERE email=%s AND role='admin'",
                (password_hash, admin_email),
            )
        else:
            cur.execute(
                "INSERT INTO users (name,email,password_hash,role) VALUES (%s,%s,%s,'admin')",
                ("Zicture Admin", admin_email, password_hash),
            )
    cur.execute("SELECT COUNT(*) FROM products")
    if cur.fetchone()[0] == 0:
        cur.executemany(
            "INSERT INTO products (name,category,price,description,image,rating,stock,is_daily,is_upcoming,is_featured) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            SAMPLE_PRODUCTS,
        )
    else:
        cur.execute("SELECT name FROM products")
        existing_names = {row[0] for row in cur.fetchall()}
        missing = [product for product in SAMPLE_PRODUCTS if product[0] not in existing_names]
        if missing:
            cur.executemany(
                "INSERT INTO products (name,category,price,description,image,rating,stock,is_daily,is_upcoming,is_featured) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                missing,
            )
    cnx.commit()
    cur.close()
    cnx.close()


@app.before_request
def ensure_ready():
    """Auto-initialize the database before the first API request."""
    if request.path.startswith("/api/") and not app.config.get("DB_READY"):
        try:
            init_database()
            app.config["DB_READY"] = True
        except mysql.connector.Error as exc:
            return jsonify({"error": f"Database is not ready: {exc.msg}"}), 500


@app.route("/photo/<path:filename>")
def photo(filename):
    """Serve existing project product/profile images to React."""
    return send_from_directory(PHOTO_DIR, filename)


@app.route("/api/setup", methods=["POST"])
def setup():
    """Manual database setup endpoint, useful for testing."""
    init_database()
    return jsonify({"message": "Database ready"})


@app.route("/api/auth/me")
def me():
    """Return the current logged-in user, or null before login."""
    return jsonify({"user": current_user()})


@app.route("/api/auth/register", methods=["POST"])
def register():

    """Register a customer account using email/password.

    This endpoint allows shoppers to create an account with an email and password.
    Admin accounts must still use the separate admin login.
    """
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    name = (data.get("name") or (email.split("@")[0] if email else "")).strip()
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    # Prevent accidental overwrite of existing accounts
    existing = fetch_one("SELECT id, provider FROM users WHERE email=%s LIMIT 1", (email,))
    if existing:
        return jsonify({"error": "User already exists"}), 409
    password_hash = generate_password_hash(password)
    try:
        avatar = save_profile_image(data.get("avatar_data")) or None  # Convert empty string to None
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        return jsonify({"error": "Profile image could not be saved"}), 400
    user_id = execute("INSERT INTO users (name,email,password_hash,provider,avatar) VALUES (%s,%s,%s,%s,%s)", (name or email.split("@")[0], email, password_hash, 'email', avatar))
    session["user_id"] = user_id
    return jsonify({"user": current_user()})

@app.route("/api/profile/update", methods=["POST"])
@login_required
def update_profile():
    """Allow users to update their name and profile picture."""
    user = current_user()
    data = request.get_json(force=True) or {}
    
    name = (data.get("name") or "").strip()
    avatar_data = data.get("avatar_data")
    
    updates = []
    params = []
    
    # Update name if provided
    if name:
        updates.append("name = %s")
        params.append(name)
    
    # Update avatar if provided
    if avatar_data:
        try:
            avatar = save_profile_image(avatar_data) or None
            if avatar:
                updates.append("avatar = %s")
                params.append(avatar)
        except Exception as exc:
            return jsonify({"error": "Profile image could not be saved"}), 400
    
    if updates:
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
        params.append(user["id"])
        execute(query, tuple(params))
    
    return jsonify({"user": current_user(), "message": "Profile updated"})


@app.route("/api/auth/login", methods=["POST"])
def login():
    """Allow customers to login with email/password as an alternative to Google.

    Admins must continue to use `/api/auth/admin/login`.
    """
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    user = fetch_one("SELECT * FROM users WHERE email=%s LIMIT 1", (email,))
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    if user.get("role") == "admin":
        return jsonify({"error": "Administrators must use the admin login"}), 403
    if not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid credentials"}), 401
    session["user_id"] = user["id"]
    return jsonify({"user": current_user()})


@app.route("/api/auth/admin/login", methods=["POST"])
def admin_login():
    """Login only administrator accounts with a separate credential flow."""
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = fetch_one("SELECT * FROM users WHERE email=%s AND role='admin'", (email,))
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid administrator credentials"}), 401
    session["user_id"] = user["id"]
    return jsonify({"user": current_user()})





@app.route("/api/auth/logout", methods=["POST"])
def logout():
    """Clear the login session."""
    session.clear()
    return jsonify({"message": "Logged out"})


@app.route("/api/profile/location", methods=["GET", "POST"])
@login_required
def profile_location():
    """Save and read the user's delivery location, replacing the old PHP location page."""
    user = current_user()
    if request.method == "GET":
        location = fetch_one("SELECT country,city,street,zipcode,phone,is_head_office FROM delivery_locations WHERE user_id=%s", (user["id"],))
        if not location:
            return jsonify({"country": "Bangladesh", "city": "Dhaka", "street": "", "zipcode": "", "phone": "", "is_head_office": False})
        # Normalize boolean/int and fallback to HEAD_OFFICES mapping when needed
        is_head = bool(location.get("is_head_office")) if location.get("is_head_office") is not None else False
        country = location.get("country") or ""
        city = location.get("city") or ""
        if not is_head and country and city:
            head = HEAD_OFFICES.get(country)
            if head and head.lower() == city.lower():
                is_head = True
        location["is_head_office"] = bool(is_head)
        return jsonify(location)
    data = request.get_json(force=True)
    country = data.get("country", "Bangladesh")
    city = data.get("city", "")
    is_head = 1 if HEAD_OFFICES.get(country, "").lower() == (city or "").lower() else 0
    execute(
        """INSERT INTO delivery_locations (user_id,country,city,street,zipcode,phone,is_head_office)
           VALUES (%s,%s,%s,%s,%s,%s,%s)
           ON DUPLICATE KEY UPDATE country=VALUES(country), city=VALUES(city), street=VALUES(street), zipcode=VALUES(zipcode), phone=VALUES(phone), is_head_office=VALUES(is_head_office)""",
        (
            user["id"],
            country,
            city,
            data.get("street", ""),
            data.get("zipcode", ""),
            data.get("phone", ""),
            is_head,
        ),
    )
    return jsonify({"message": "Location saved"})


@app.route("/api/feedback", methods=["POST"])
@login_required
def feedback():
    """Store support/contact messages from the React support section."""
    user = current_user()
    data = request.get_json(force=True)
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "Message is required"}), 400
    execute(
        "INSERT INTO feedback (user_id,name,email,subject,message) VALUES (%s,%s,%s,%s,%s)",
        (user["id"], user["name"], user["email"], data.get("subject", "Support request"), message),
    )
    return jsonify({"message": "Thanks - your message was received."})


@app.route("/api/categories")
def categories():
    """Return all catalog categories for public browsing."""
    return jsonify(CATEGORIES)


@app.route("/api/rates")
def rates():
    """Return exchange rates with improved API integration"""
    try:
        force_refresh = request.args.get('refresh', 'false').lower() == 'true'
        rates = currency_service.get_exchange_rates(force_refresh=force_refresh)
        
        return jsonify({
            'success': True,
            'data': {
                'base_currency': 'USD',
                'rates': rates,
                'timestamp': datetime.now().isoformat()
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'data': {
                'base_currency': 'USD',
                'rates': currency_service._get_fallback_rates(),
                'timestamp': datetime.now().isoformat()
            }
        }), 500
    
@app.route("/api/currencies/convert", methods=["POST"])
def convert_currency():
    """Convert currency"""
    try:
        data = request.get_json(force=True) or {}
        amount = data.get('amount')
        from_currency = data.get('from_currency')
        to_currency = data.get('to_currency')
        
        if not all([amount, from_currency, to_currency]):
            return jsonify({
                'success': False,
                'error': 'Missing required parameters'
            }), 400
        
        converted_amount = currency_service.convert_currency(
            amount, from_currency, to_currency
        )
        
        formatted_amount = currency_service.format_price(
            converted_amount, to_currency
        )
        
        return jsonify({
            'success': True,
            'data': {
                'original_amount': float(amount),
                'from_currency': from_currency,
                'to_currency': to_currency,
                'converted_amount': converted_amount,
                'formatted_amount': formatted_amount
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    
@app.route("/api/countries", methods=["GET"])
def get_countries():
    """Get all countries with states and cities from database"""
    try:
        countries = fetch_all("""
            SELECT c.id, c.name, c.currency_code, c.currency_name, c.currency_symbol,
                   s.id as state_id, s.name as state_name,
                   ct.id as city_id, ct.name as city_name, ct.zipcode
            FROM countries c
            LEFT JOIN states s ON c.id = s.country_id AND s.is_active = 1
            LEFT JOIN cities ct ON s.id = ct.state_id AND ct.is_active = 1
            WHERE c.is_active = 1
            ORDER BY c.name, s.name, ct.name
        """)
        
        # Group the data by country
        countries_dict = {}
        for row in countries:
            country_name = row['name']
            
            if country_name not in countries_dict:
                countries_dict[country_name] = {
                    'id': row['id'],
                    'name': country_name,
                    'currency_code': row['currency_code'],
                    'currency_name': row['currency_name'],
                    'currency_symbol': row['currency_symbol'],
                    'regions': {}
                }
            
            if row['state_id'] and row['state_name']:
                state_name = row['state_name']
                if state_name not in countries_dict[country_name]['regions']:
                    countries_dict[country_name]['regions'][state_name] = []
                
                if row['city_id'] and row['city_name']:
                    countries_dict[country_name]['regions'][state_name].append({
                        'name': row['city_name'],
                        'zipcode': row['zipcode'] or '00000'
                    })
        
        return jsonify({
            'success': True,
            'data': countries_dict
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })
    
@app.route("/api/admin/currencies", methods=["GET"])
@admin_required
def admin_currencies():
    """Get currency statistics for admin panel"""
    try:
        rates = currency_service.get_exchange_rates()
        supported = currency_service.get_supported_currencies()
        
        # Get last update time from database
        last_update = fetch_one("""
            SELECT MAX(last_updated) as last_update 
            FROM exchange_rates 
            WHERE base_currency = 'USD'
        """)
        
        return jsonify({
            'success': True,
            'data': {
                'total_currencies': len(supported),
                'base_currency': 'USD',
                'supported_currencies': supported,
                'sample_rates': {k: v for k, v in list(rates.items())[:10]},
                'last_updated': last_update['last_update'] if last_update else None
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route("/api/currencies/supported", methods=["GET"])
def get_supported_currencies():
    """Get supported currencies"""
    try:
        # Get currencies from your countries database
        countries_currencies = fetch_all("""
            SELECT DISTINCT currency_code, currency_name, currency_symbol 
            FROM countries 
            WHERE currency_code IS NOT NULL 
            ORDER BY currency_code
        """)
        
        # If you don't have the countries table with currencies yet, use this fallback:
        if not countries_currencies:
            # Fallback currency list
            fallback_currencies = [
                {'code': 'USD', 'name': 'US Dollar', 'symbol': '$'},
                {'code': 'EUR', 'name': 'Euro', 'symbol': '€'},
                {'code': 'GBP', 'name': 'British Pound', 'symbol': '£'},
                {'code': 'JPY', 'name': 'Japanese Yen', 'symbol': '¥'},
                {'code': 'CAD', 'name': 'Canadian Dollar', 'symbol': 'C$'},
                {'code': 'AUD', 'name': 'Australian Dollar', 'symbol': 'A$'},
                {'code': 'BDT', 'name': 'Bangladeshi Taka', 'symbol': '৳'},
                {'code': 'INR', 'name': 'Indian Rupee', 'symbol': '₹'},
                {'code': 'CNY', 'name': 'Chinese Yuan', 'symbol': '¥'},
                {'code': 'PKR', 'name': 'Pakistani Rupee', 'symbol': '₨'},
                {'code': 'SAR', 'name': 'Saudi Riyal', 'symbol': 'SR'},
                {'code': 'AED', 'name': 'UAE Dirham', 'symbol': 'AED'},
                {'code': 'THB', 'name': 'Thai Baht', 'symbol': '฿'},
                {'code': 'MYR', 'name': 'Malaysian Ringgit', 'symbol': 'RM'},
                {'code': 'SGD', 'name': 'Singapore Dollar', 'symbol': 'S$'},
                {'code': 'HKD', 'name': 'Hong Kong Dollar', 'symbol': 'HK$'},
                {'code': 'KRW', 'name': 'South Korean Won', 'symbol': '₩'},
                {'code': 'CHF', 'name': 'Swiss Franc', 'symbol': 'CHF'},
                {'code': 'SEK', 'name': 'Swedish Krona', 'symbol': 'kr'},
                {'code': 'NOK', 'name': 'Norwegian Krone', 'symbol': 'kr'},
                {'code': 'DKK', 'name': 'Danish Krone', 'symbol': 'kr'},
                {'code': 'PLN', 'name': 'Polish Zloty', 'symbol': 'zł'},
                {'code': 'TRY', 'name': 'Turkish Lira', 'symbol': '₺'},
                {'code': 'RUB', 'name': 'Russian Ruble', 'symbol': '₽'},
                {'code': 'BRL', 'name': 'Brazilian Real', 'symbol': 'R$'},
                {'code': 'MXN', 'name': 'Mexican Peso', 'symbol': '$'},
                {'code': 'ZAR', 'name': 'South African Rand', 'symbol': 'R'},
                {'code': 'EGP', 'name': 'Egyptian Pound', 'symbol': 'E£'},
                {'code': 'NGN', 'name': 'Nigerian Naira', 'symbol': '₦'},
                {'code': 'IDR', 'name': 'Indonesian Rupiah', 'symbol': 'Rp'},
                {'code': 'PHP', 'name': 'Philippine Peso', 'symbol': '₱'},
                {'code': 'VND', 'name': 'Vietnamese Dong', 'symbol': '₫'},
                {'code': 'AFN', 'name': 'Afghan Afghani', 'symbol': 'AF'}
            ]
            currencies = fallback_currencies
        else:
            currencies = []
            for country in countries_currencies:
                currencies.append({
                    'code': country['currency_code'],
                    'name': country['currency_name'],
                    'symbol': country['currency_symbol']
                })
        
        return jsonify({
            'success': True,
            'data': currencies
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route("/api/products")
def products():
    """Search, filter, and sort products for the public catalog and admin inventory."""
    category = request.args.get("category", "all")
    q = (request.args.get("q") or "").strip()
    sort = request.args.get("sort", "popular")
    where, params = [], []
    if category != "all" and category in CATEGORIES:
        where.append("category=%s")
        params.append(category)
    if q:
        where.append("(name LIKE %s OR description LIKE %s OR category LIKE %s)")
        needle = f"%{q}%"
        params.extend([needle, needle, needle])
    order = {
        "new": "created_at DESC, id DESC",
        "price_low": "price ASC, name ASC",
        "price_high": "price DESC, name ASC",
        "stock": "stock ASC, name ASC",
    }.get(sort, "rating DESC, name ASC")
    sql = "SELECT * FROM products"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += f" ORDER BY {order}"
    return jsonify(fetch_all(sql, tuple(params)))


@app.route("/api/home")
def home():
    """Return public home page sections: featured, daily, upcoming, and stats."""
    return jsonify(
        {
            "featured": fetch_all("SELECT * FROM products WHERE is_featured=1 ORDER BY rating DESC, id DESC LIMIT 12"),
            "daily": fetch_all("SELECT * FROM products ORDER BY is_daily DESC, rating DESC, price ASC LIMIT 4"),
            "upcoming": fetch_all("SELECT * FROM products ORDER BY is_upcoming DESC, created_at DESC, id DESC LIMIT 10"),
            "stats": {
                "products": fetch_one("SELECT COUNT(*) count FROM products")["count"],
                "categories": len(CATEGORIES) - 1,
            },
        }
    )


def collection(table):
    """Read cart/wishlist/compare products for the current logged-in user."""
    quantity = "x.quantity" if table == "cart" else "1 AS quantity"
    return fetch_all(
        f"SELECT x.id AS item_id, {quantity}, p.* FROM {table} x JOIN products p ON x.product_id=p.id WHERE x.session_id=%s ORDER BY x.added_at DESC",
        (owner_key(),),
    )


@app.route("/api/cart", methods=["GET", "POST", "PUT", "DELETE"])
@login_required
def cart():
    """Cart API: list, add, update quantity, remove, or clear items."""
    if request.method == "GET":
        return jsonify(collection("cart"))
    data = request.get_json(force=True, silent=True) or {}
    if request.method == "POST":
        product_id = int(data.get("product_id", 0))
        existing = fetch_one("SELECT id, quantity FROM cart WHERE session_id=%s AND product_id=%s LIMIT 1", (owner_key(), product_id))
        if existing:
            execute("UPDATE cart SET quantity=%s WHERE id=%s", (min(int(existing["quantity"]) + 1, 100), existing["id"]))
        else:
            execute("INSERT INTO cart (session_id, product_id, quantity) VALUES (%s,%s,1)", (owner_key(), product_id))
    elif request.method == "PUT":
        execute("UPDATE cart SET quantity=%s WHERE id=%s AND session_id=%s", (max(1, min(int(data.get("quantity", 1)), 100)), data.get("item_id"), owner_key()))
    elif request.method == "DELETE":
        if data.get("item_id"):
            execute("DELETE FROM cart WHERE id=%s AND session_id=%s", (data.get("item_id"), owner_key()))
        else:
            execute("DELETE FROM cart WHERE session_id=%s", (owner_key(),))
    return jsonify(collection("cart"))


@app.route("/api/wishlist", methods=["GET", "POST", "DELETE"])
@login_required
def wishlist():
    """Wishlist API: save and remove products."""
    if request.method == "GET":
        return jsonify(collection("wishlist"))
    data = request.get_json(force=True)
    if request.method == "POST":
        existing = fetch_one("SELECT id FROM wishlist WHERE session_id=%s AND product_id=%s LIMIT 1", (owner_key(), data.get("product_id")))
        if not existing:
            execute("INSERT INTO wishlist (session_id,product_id) VALUES (%s,%s)", (owner_key(), data.get("product_id")))
    else:
        execute("DELETE FROM wishlist WHERE product_id=%s AND session_id=%s", (data.get("product_id"), owner_key()))
    return jsonify(collection("wishlist"))


@app.route("/api/compare", methods=["GET", "POST", "DELETE"])
@login_required
def compare():
    """Compare API: keep a focused list of up to four products."""
    if request.method == "GET":
        return jsonify(collection("compare_items"))
    data = request.get_json(force=True)
    if request.method == "POST":
        existing = fetch_one("SELECT id FROM compare_items WHERE session_id=%s AND product_id=%s LIMIT 1", (owner_key(), data.get("product_id")))
        if existing:
            return jsonify(collection("compare_items"))
        count = fetch_one("SELECT COUNT(*) count FROM compare_items WHERE session_id=%s", (owner_key(),))["count"]
        if count >= 4:
            return jsonify({"error": "Compare list is limited to 4 products"}), 400
        if not existing:
            execute("INSERT INTO compare_items (session_id,product_id) VALUES (%s,%s)", (owner_key(), data.get("product_id")))
    else:
        execute("DELETE FROM compare_items WHERE product_id=%s AND session_id=%s", (data.get("product_id"), owner_key()))
    return jsonify(collection("compare_items"))


@app.route("/api/checkout", methods=["POST"])
@login_required
def checkout():
    """Create an order using demo payment, then reduce stock and clear cart."""
    user = current_user()
    data = request.get_json(force=True)
    saved_location = fetch_one("SELECT * FROM delivery_locations WHERE user_id=%s", (user["id"],)) or {}
    items = collection("cart")
    if not items:
        return jsonify({"error": "Cart is empty"}), 400
    subtotal = sum(float(i["price"]) * int(i["quantity"]) for i in items)
    coupon = (data.get("coupon") or "").strip().upper()
    coupon_discount = subtotal * 0.20 if coupon == "ZICTURE20" else 0
    # Determine head-office discount from saved location or mapping
    saved_country = (saved_location.get("country") or "").strip()
    saved_city = (saved_location.get("city") or "").strip()
    is_head = False
    if saved_location.get("is_head_office") is not None:
        is_head = bool(saved_location.get("is_head_office"))
    else:
        # fallback to mapping
        head_for_country = HEAD_OFFICES.get(saved_country)
        if head_for_country and head_for_country.lower() == saved_city.lower():
            is_head = True
    head_discount = subtotal * 0.10 if is_head else 0
    discount = coupon_discount + head_discount
    tax = (subtotal - discount) * 0.05
    shipping = 0 if subtotal >= 500 else 80
    total = max(0, subtotal - discount) + tax + shipping
    cnx = connect()
    cur = cnx.cursor()
    cur.execute(
        """INSERT INTO orders (session_id,total_price,subtotal,discount,tax,shipping,coupon_code,customer_name,customer_email,delivery_city,delivery_address,payment_method,payment_status,status)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'demo_paid','confirmed')""",
        (
            owner_key(),
            total,
            subtotal,
            discount,
            tax,
            shipping,
            coupon,
            user["name"],
            user["email"],
            data.get("city") or saved_location.get("city", ""),
            data.get("address") or saved_location.get("street", ""),
            data.get("payment_method", "demo_card"),
        ),
    )
    order_id = cur.lastrowid
    for item in items:
        cur.execute("INSERT INTO order_items (order_id,product_id,quantity,price) VALUES (%s,%s,%s,%s)", (order_id, item["id"], item["quantity"], item["price"]))
        cur.execute("UPDATE products SET stock=GREATEST(stock-%s,0) WHERE id=%s", (item["quantity"], item["id"]))
    cur.execute("DELETE FROM cart WHERE session_id=%s", (owner_key(),))
    cnx.commit()
    cur.close()
    cnx.close()
    return jsonify({"order_id": order_id, "total": round(total, 2), "invoice_url": f"/api/invoice/{order_id}", "message": "Demo payment accepted"})


@app.route("/api/orders")
@login_required
def orders():
    """Return the current user's order history."""
    return jsonify(fetch_all("SELECT * FROM orders WHERE session_id=%s ORDER BY created_at DESC", (owner_key(),)))


def get_order_payload(order_id):
    """Load one order with its items for JSON details and PDF invoices."""
    order = fetch_one("SELECT * FROM orders WHERE id=%s AND session_id=%s", (order_id, owner_key()))
    if not order and current_user().get("role") == "admin":
        order = fetch_one("SELECT * FROM orders WHERE id=%s", (order_id,))
    if not order:
        return None
    items = fetch_all(
        """SELECT oi.quantity, oi.price, p.name, p.category
           FROM order_items oi JOIN products p ON oi.product_id=p.id
           WHERE oi.order_id=%s ORDER BY oi.id""",
        (order_id,),
    )
    return {"order": order, "items": items}


@app.route("/api/orders/<int:order_id>")
@login_required
def order_detail(order_id):
    """Return one order with line items for invoice and details views."""
    payload = get_order_payload(order_id)
    if not payload:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(payload)


def simple_pdf(lines, filename, heading="Zicture Invoice"):
    """Generate a small dependency-free PDF so invoices work without PHP/Dompdf."""
    safe_lines = []
    for line in lines:
        text = str(line).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        safe_lines.append(text[:100])
    y = 760
    stream = "0.96 0.98 1 rg\n0 0 612 842 re f\n0.06 0.09 0.16 rg\n0 750 612 92 re f\n"
    stream += f"BT /F2 22 Tf 1 1 1 rg 46 792 Td ({heading}) Tj ET\n"
    stream += "BT /F1 10 Tf 0.1 0.13 0.2 rg 46 720 Td\n"
    for line in safe_lines:
        stream += f"({line}) Tj\n0 -16 Td\n"
        y -= 16
        if y < 60:
            break
    stream += "ET\n"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
        f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ]
    pdf = "%PDF-1.4\n"
    offsets = [0]
    for idx, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{idx} 0 obj\n{obj}\nendobj\n"
    xref = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    for offset in offsets[1:]:
        pdf += str(offset).rjust(10, "0") + " 00000 n \n"
    pdf += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF"
    return Response(
        pdf,
        mimetype="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def pdf_download(data, filename):
    """Return a PDF byte stream as a browser download."""
    return Response(
        data,
        mimetype="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(data)),
        },
    )


def reportlab_available():
    """Keep PDF downloads working even before optional dependencies are installed."""
    try:
        import reportlab  # noqa: F401
        return True
    except ImportError:
        return False


def zicture_pdf_theme():
    """Centralized PDF colors so invoices and ProductBook match the storefront."""
    from reportlab.lib import colors

    return {
        "dark": colors.HexColor("#101828"),
        "blue": colors.HexColor("#175cd3"),
        "green": colors.HexColor("#0f766e"),
        "yellow": colors.HexColor("#ffc107"),
        "muted": colors.HexColor("#667085"),
        "line": colors.HexColor("#d0d5dd"),
        "soft": colors.HexColor("#f5f7fb"),
        "white": colors.white,
    }


def draw_pdf_chrome(canvas, doc, title="Zicture"):
    """Draw a branded page header/footer for ReportLab documents."""
    from reportlab.lib.units import inch

    theme = zicture_pdf_theme()
    canvas.saveState()
    width, height = doc.pagesize
    canvas.setFillColor(theme["dark"])
    canvas.rect(0, height - 0.58 * inch, width, 0.58 * inch, fill=1, stroke=0)
    canvas.setFillColor(theme["yellow"])
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(doc.leftMargin, height - 0.36 * inch, "Zicture")
    canvas.setFillColor(theme["white"])
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(width - doc.rightMargin, height - 0.36 * inch, title)
    canvas.setStrokeColor(theme["line"])
    canvas.line(doc.leftMargin, 0.48 * inch, width - doc.rightMargin, 0.48 * inch)
    canvas.setFillColor(theme["muted"])
    canvas.setFont("Helvetica", 8)
    canvas.drawString(doc.leftMargin, 0.28 * inch, "Zicture - The Online Shopping")
    canvas.drawRightString(width - doc.rightMargin, 0.28 * inch, f"Page {doc.page}")
    canvas.restoreState()


def build_catalog_pdf(products):
    """Build an attractive public ProductBook PDF with grouped department tables."""
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=34,
        leftMargin=34,
        topMargin=72,
        bottomMargin=52,
        title="Zicture ProductBook",
    )
    theme = zicture_pdf_theme()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("CoverTitle", parent=styles["Title"], fontSize=30, leading=34, textColor=theme["dark"], alignment=TA_CENTER, spaceAfter=10))
    styles.add(ParagraphStyle("CoverSub", parent=styles["BodyText"], fontSize=11, leading=16, textColor=theme["muted"], alignment=TA_CENTER))
    styles.add(ParagraphStyle("CategoryTitle", parent=styles["Heading2"], fontSize=15, leading=18, textColor=theme["dark"], spaceBefore=16, spaceAfter=8))
    styles.add(ParagraphStyle("SmallMuted", parent=styles["BodyText"], fontSize=8.5, leading=11, textColor=theme["muted"]))
    styles.add(ParagraphStyle("ProductName", parent=styles["BodyText"], fontSize=9, leading=11, textColor=theme["dark"]))

    story = []
    logo_path = os.path.join(PHOTO_DIR, "Z_Energy_logo.png")
    if os.path.exists(logo_path):
        from reportlab.platypus import Image
        story.append(Image(logo_path, width=0.86 * inch, height=0.86 * inch))
        story.append(Spacer(1, 12))

    story += [
        Paragraph("Zicture ProductBook", styles["CoverTitle"]),
        Paragraph("A polished catalog of every department with prices, stock, rating, and short product details.", styles["CoverSub"]),
        Spacer(1, 20),
    ]
    stat_table = Table(
        [
            ["Total Products", "Departments", "Currency"],
            [str(len(products)), str(len({p["category"] for p in products})), "Tk / BDT"],
        ],
        colWidths=[2.0 * inch, 2.0 * inch, 2.0 * inch],
    )
    stat_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), theme["dark"]),
                ("TEXTCOLOR", (0, 0), (-1, 0), theme["yellow"]),
                ("BACKGROUND", (0, 1), (-1, 1), theme["soft"]),
                ("TEXTCOLOR", (0, 1), (-1, 1), theme["blue"]),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, theme["line"]),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    story.append(stat_table)
    story.append(Spacer(1, 20))
    story.append(Paragraph(f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["CoverSub"]))
    story.append(PageBreak())

    grouped = {}
    for product in products:
        grouped.setdefault(product["category"], []).append(product)

    for category, items in grouped.items():
        story.append(Paragraph(CATEGORIES.get(category, {}).get("label", category.title()), styles["CategoryTitle"]))
        table_data = [["Product", "Price", "Stock", "Rating", "Description"]]
        for product in items:
            table_data.append(
                [
                    Paragraph(product["name"], styles["ProductName"]),
                    f"Tk {float(product['price']):,.2f}",
                    str(product["stock"]),
                    f"{product['rating']}/5",
                    Paragraph((product.get("description") or "")[:125], styles["SmallMuted"]),
                ]
            )
        table = Table(table_data, colWidths=[1.6 * inch, 0.9 * inch, 0.62 * inch, 0.7 * inch, 2.45 * inch], repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), theme["dark"]),
                    ("TEXTCOLOR", (0, 0), (-1, 0), theme["white"]),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 8.5),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, theme["soft"]]),
                    ("TEXTCOLOR", (1, 1), (1, -1), theme["green"]),
                    ("TEXTCOLOR", (3, 1), (3, -1), colors.HexColor("#f59e0b")),
                    ("GRID", (0, 0), (-1, -1), 0.35, theme["line"]),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 10))

    doc.build(story, onFirstPage=lambda c, d: draw_pdf_chrome(c, d, "ProductBook"), onLaterPages=lambda c, d: draw_pdf_chrome(c, d, "ProductBook"))
    data = buffer.getvalue()
    buffer.close()
    return data


def build_invoice_pdf(order, items):
    """Build a branded invoice PDF for demo checkout orders."""
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=38,
        leftMargin=38,
        topMargin=74,
        bottomMargin=56,
        title=f"Zicture Invoice {order['id']}",
    )
    theme = zicture_pdf_theme()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("InvoiceTitle", parent=styles["Title"], fontSize=25, leading=29, textColor=theme["dark"], spaceAfter=4))
    styles.add(ParagraphStyle("InvoiceHero", parent=styles["Title"], fontSize=22, leading=26, textColor=theme["white"], alignment=TA_CENTER, spaceAfter=4))
    styles.add(ParagraphStyle("Muted", parent=styles["BodyText"], fontSize=9, leading=13, textColor=theme["muted"]))
    styles.add(ParagraphStyle("WhiteMuted", parent=styles["BodyText"], fontSize=9, leading=13, textColor=colors.HexColor("#d0d5dd"), alignment=TA_CENTER))
    styles.add(ParagraphStyle("Right", parent=styles["BodyText"], alignment=TA_RIGHT, fontSize=9, leading=13, textColor=theme["muted"]))
    styles.add(ParagraphStyle("ItemName", parent=styles["BodyText"], fontSize=9, leading=12, textColor=theme["dark"]))

    logo_path = os.path.join(PHOTO_DIR, "Z_Energy_logo.png")
    logo = Image(logo_path, width=0.64 * inch, height=0.64 * inch) if os.path.exists(logo_path) else Paragraph("Z", styles["InvoiceHero"])
    hero = Table(
        [
            [logo, Paragraph("Zicture Bill Evidence", styles["InvoiceHero"])],
            ["", Paragraph(f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} | Order #{order['id']}", styles["WhiteMuted"])],
        ],
        colWidths=[0.9 * inch, 5.2 * inch],
    )
    hero.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), theme["dark"]),
                ("TEXTCOLOR", (0, 0), (-1, -1), theme["white"]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("SPAN", (0, 0), (0, 1)),
                ("PADDING", (0, 0), (-1, -1), 14),
            ]
        )
    )

    story = [
        hero,
        Spacer(1, 14),
        Paragraph("Payment Summary", styles["InvoiceTitle"]),
        Paragraph(f"Status: {escape(str(order.get('status', 'confirmed')).title())} | Payment: {escape(str(order.get('payment_status', 'demo_paid')))} via {escape(str(order.get('payment_method', 'demo_card')))}", styles["Muted"]),
        Spacer(1, 16),
    ]
    stats = Table(
        [
            ["Order", "Payment", "Total"],
            [f"#{order['id']}", str(order.get("payment_status", "demo_paid")).replace("_", " ").title(), f"Tk {float(order.get('total_price') or 0):,.2f}"],
        ],
        colWidths=[2.0 * inch, 2.0 * inch, 2.1 * inch],
    )
    stats.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), theme["dark"]),
                ("TEXTCOLOR", (0, 0), (-1, 0), theme["yellow"]),
                ("BACKGROUND", (0, 1), (-1, 1), theme["soft"]),
                ("TEXTCOLOR", (0, 1), (-1, 1), theme["blue"]),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, theme["line"]),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(stats)
    story.append(Spacer(1, 18))
    customer = Table(
        [
            [
                Paragraph(f"<b>Bill To</b><br/>{escape(str(order.get('customer_name') or 'Customer'))}<br/>{escape(str(order.get('customer_email') or ''))}", styles["Muted"]),
                Paragraph(f"<b>Deliver To</b><br/>{escape(str(order.get('delivery_city') or 'Not set'))}<br/>{escape(str(order.get('delivery_address') or ''))}", styles["Right"]),
            ]
        ],
        colWidths=[3.05 * inch, 3.05 * inch],
    )
    customer.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), theme["soft"]), ("BOX", (0, 0), (-1, -1), 0.5, theme["line"]), ("PADDING", (0, 0), (-1, -1), 12), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(customer)
    story.append(Spacer(1, 18))

    table_data = [["Product", "Category", "Qty", "Price", "Line Total"]]
    for item in items:
        quantity = int(item["quantity"])
        price = float(item["price"])
        table_data.append(
            [
                Paragraph(escape(str(item["name"])), styles["ItemName"]),
                escape(str(item["category"]).title()),
                str(quantity),
                f"Tk {price:,.2f}",
                f"Tk {price * quantity:,.2f}",
            ]
        )
    item_table = Table(table_data, colWidths=[2.25 * inch, 1.1 * inch, 0.45 * inch, 1.05 * inch, 1.15 * inch], repeatRows=1)
    item_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), theme["dark"]),
                ("TEXTCOLOR", (0, 0), (-1, 0), theme["white"]),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, theme["soft"]]),
                ("TEXTCOLOR", (3, 1), (-1, -1), theme["green"]),
                ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.35, theme["line"]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.append(item_table)
    story.append(Spacer(1, 18))

    totals = [
        ["Subtotal", f"Tk {float(order.get('subtotal') or 0):,.2f}"],
        ["Discount", f"- Tk {float(order.get('discount') or 0):,.2f}"],
        ["Tax", f"Tk {float(order.get('tax') or 0):,.2f}"],
        ["Shipping", "FREE" if float(order.get("shipping") or 0) == 0 else f"Tk {float(order.get('shipping') or 0):,.2f}"],
        ["Total", f"Tk {float(order.get('total_price') or 0):,.2f}"],
    ]
    total_table = Table(totals, colWidths=[1.45 * inch, 1.45 * inch], hAlign="RIGHT")
    total_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -2), theme["soft"]),
                ("BACKGROUND", (0, -1), (-1, -1), theme["blue"]),
                ("TEXTCOLOR", (0, -1), (-1, -1), theme["white"]),
                ("TEXTCOLOR", (1, 1), (1, 1), colors.HexColor("#dc2626")),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.35, theme["line"]),
                ("PADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(total_table)
    story.append(Spacer(1, 18))
    story.append(Paragraph("Thank you for shopping with Zicture. This invoice was generated by the Flask + React version.", styles["Muted"]))

    doc.build(story, onFirstPage=lambda c, d: draw_pdf_chrome(c, d, "Invoice"), onLaterPages=lambda c, d: draw_pdf_chrome(c, d, "Invoice"))
    data = buffer.getvalue()
    buffer.close()
    return data


@app.route("/api/invoice/<int:order_id>")
@login_required
def invoice(order_id):
    """Download a PDF invoice for a completed demo checkout."""
    payload = get_order_payload(order_id)
    if not payload:
        return jsonify({"error": "Order not found"}), 404
    order = payload["order"]
    if reportlab_available():
        return pdf_download(build_invoice_pdf(order, payload["items"]), f"zicture-invoice-{order_id}.pdf")
    lines = [
        f"Order #{order['id']}",
        f"Customer: {order.get('customer_name') or ''} <{order.get('customer_email') or ''}>",
        f"Delivery: {order.get('delivery_city') or ''}, {order.get('delivery_address') or ''}",
        f"Payment: {order.get('payment_status')} via {order.get('payment_method')}",
        f"Status: {order.get('status')}",
        "",
        "Items:",
    ]
    for item in payload["items"]:
        lines.append(f"- {item['name']} x {item['quantity']} @ Tk {float(item['price']):.2f}")
    lines += [
        "",
        f"Subtotal: Tk {float(order.get('subtotal') or 0):.2f}",
        f"Discount: Tk {float(order.get('discount') or 0):.2f}",
        f"Tax: Tk {float(order.get('tax') or 0):.2f}",
        f"Shipping: Tk {float(order.get('shipping') or 0):.2f}",
        f"Total: Tk {float(order.get('total_price') or 0):.2f}",
    ]
    return simple_pdf(lines, f"zicture-invoice-{order_id}.pdf")


@app.route("/api/product-book.pdf")
def product_book_pdf():
    """Download a public PDF catalog similar to the old PHP ProductBook."""
    products = fetch_all("SELECT name,category,price,stock,rating,description FROM products ORDER BY category, name")
    if reportlab_available():
        return pdf_download(build_catalog_pdf(products), "zicture-product-book.pdf")
    lines = [
        "Zicture ProductBook",
        f"Total Products: {len(products)}",
        "Currency: Tk / BDT",
        "",
    ]
    current_category = ""
    for product in products:
        if product["category"] != current_category:
            current_category = product["category"]
            lines.append("")
            lines.append(f"## {current_category.title()}")
        lines.append(
            f"{product['name']} | Tk {float(product['price']):.2f} | Stock {product['stock']} | Rating {product['rating']}/5"
        )
    return simple_pdf(lines, "zicture-product-book.pdf", "Zicture ProductBook")


@app.route("/api/admin/summary")
@admin_required
def admin_summary():
    """Admin dashboard data: stats, recent orders, customers, and sales by category."""
    return jsonify(
        {
            "products": fetch_one("SELECT COUNT(*) count FROM products")["count"],
            "orders": fetch_one("SELECT COUNT(*) count FROM orders")["count"],
            "customers": fetch_one("SELECT COUNT(*) count FROM users WHERE role='customer'")["count"],
            "revenue": fetch_one("SELECT COALESCE(SUM(total_price),0) total FROM orders WHERE status<>'cancelled'")["total"],
            "lowStock": fetch_one("SELECT COUNT(*) count FROM products WHERE stock<=10")["count"],
            "pending": fetch_one("SELECT COUNT(*) count FROM orders WHERE status IN ('confirmed','processing')")["count"],
            "ordersList": fetch_all("SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT 20"),
            "customersList": fetch_all("SELECT id,name,email,provider,created_at FROM users WHERE role='customer' ORDER BY created_at DESC LIMIT 20"),
            "feedbackList": fetch_all("SELECT * FROM feedback ORDER BY created_at DESC LIMIT 20"),
            "categorySales": fetch_all(
                """SELECT p.category, COUNT(oi.id) items, COALESCE(SUM(oi.quantity * oi.price),0) total
                   FROM order_items oi JOIN products p ON oi.product_id=p.id
                   GROUP BY p.category ORDER BY total DESC LIMIT 8"""
            ),
        }
    )


@app.route("/api/admin/products", methods=["POST", "PUT", "DELETE"])
@admin_required
def admin_products():
    """Admin product management: add, edit, delete, or disable sold products."""
    data = request.get_json(force=True)
    if request.method == "DELETE":
        ordered = fetch_one("SELECT COUNT(*) count FROM order_items WHERE product_id=%s", (data.get("id"),))["count"]
        if ordered:
            execute("UPDATE products SET stock=0, is_featured=0 WHERE id=%s", (data.get("id"),))
            return jsonify({"message": "Product has order history, so it was disabled instead of deleted"})
        execute("DELETE FROM wishlist WHERE product_id=%s", (data.get("id"),))
        execute("DELETE FROM cart WHERE product_id=%s", (data.get("id"),))
        execute("DELETE FROM compare_items WHERE product_id=%s", (data.get("id"),))
        execute("DELETE FROM products WHERE id=%s", (data.get("id"),))
        return jsonify({"message": "Product removed"})

    fields = (
        data.get("name", "").strip(),
        data.get("category", "food"),
        float(data.get("price", 0)),
        data.get("description", ""),
        data.get("image", "Z_Energy_logo.png"),
        int(data.get("rating", 4)),
        int(data.get("stock", 0)),
        1 if data.get("is_daily") else 0,
        1 if data.get("is_upcoming") else 0,
        1 if data.get("is_featured", True) else 0,
    )
    if request.method == "POST":
        if not fields[0]:
            return jsonify({"error": "Product name is required"}), 400
        execute("INSERT INTO products (name,category,price,description,image,rating,stock,is_daily,is_upcoming,is_featured) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", fields)
    elif request.method == "PUT":
        if not data.get("id"):
            return jsonify({"error": "Product id is required"}), 400
        execute("UPDATE products SET name=%s,category=%s,price=%s,description=%s,image=%s,rating=%s,stock=%s,is_daily=%s,is_upcoming=%s,is_featured=%s WHERE id=%s", (*fields, data.get("id")))
    return jsonify({"message": "Saved"})


@app.route("/api/admin/orders/<int:order_id>", methods=["PUT"])
@admin_required
def admin_order(order_id):
    """Admin order workflow control."""
    status = request.get_json(force=True).get("status", "processing")
    if status not in ["confirmed", "processing", "shipped", "completed", "cancelled"]:
        return jsonify({"error": "Invalid status"}), 400
    execute("UPDATE orders SET status=%s WHERE id=%s", (status, order_id))
    return jsonify({"message": "Order updated"})


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def spa(path):
    """Serve the built React app and support client-side navigation."""
    target = os.path.join(app.static_folder or "", path)
    if path and os.path.exists(target):
        return send_from_directory(app.static_folder, path)
    if app.static_folder and os.path.exists(os.path.join(app.static_folder, "index.html")):
        return send_from_directory(app.static_folder, "index.html")
    return jsonify({"message": "Run npm.cmd run dev for the React frontend or npm.cmd run build first."})


if __name__ == "__main__":
    host = os.getenv("FLASK_HOST", "127.0.0.1")
    port = int(os.getenv("FLASK_PORT", "5001"))
    app.run(host=host, port=port, debug=True)


