import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Baby, BarChart3, BookMarked, BookOpen, Car, Code2, CreditCard, Download,
  Dumbbell, Edit3, Eye, EyeOff, FileText, Flower2, Gamepad2, Grid2X2, Headphones, Heart,
  House, KeyRound, Laptop, Lock, LogOut, Mail, MapPin, Menu, MessageCircle, PackagePlus, PenLine, Pill, Plane, ChevronDown,
  Search, ShieldCheck, Shirt, ShoppingBag, ShoppingBasket, ShoppingCart, Tag,
  Sparkles, Star, Trash2, Truck, UploadCloud, User, Utensils, Wrench, X
} from 'lucide-react';

const API = '/api';

// Category icon map keeps Flask category metadata connected to React visuals.
const icons = {
  Baby, BookOpen, Car, Code2, Dumbbell, Flower2, Gamepad2, Grid2X2, Heart, House,
  Laptop, PenLine, Pill, Plane, Shirt, ShoppingBag, ShoppingBasket, Sparkles,
  Utensils, Wrench
};

// Shared API helper. Cookies are included so Flask session login works everywhere.
async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function normalizeUser(user) {
  if (!user) return null;
  const profileImage = user.profile_image || user.avatar || '';
  return { ...user, profile_image: profileImage, avatar: user.avatar || profileImage };
}

function displayFirstName(user) {
  const name = (user?.name || '').trim();
  const email = (user?.email || '').trim();
  
  // Always prefer the name field if it exists and isn't empty
  if (name) {
    return name.split(/\s+/)[0];
  }
  
  // Fallback to email username only if no name
  return email ? email.split('@')[0] : 'User';
}

function profileImageSrc(user) {
  const image = user?.profile_image || user?.avatar || '';
  if (!image) return '';
  return image.startsWith('http') || image.startsWith('/photo/') ? image : `/photo/${image}`;
}

// Global currency state and rates used by the legacy `money()` helper below.
let CURRENT_CURRENCY = 'BDT';
let GLOBAL_RATES = { BDT: 1 };

function setGlobalCurrency(c) {
  CURRENT_CURRENCY = c;
}

function setGlobalRates(rates) {
  // shallow merge so missing symbols don't wipe defaults
  GLOBAL_RATES = { ...GLOBAL_RATES, ...(rates || {}) };
}

const COUNTRY_META = {
  Bangladesh: { currency: 'BDT', label: 'BD', flag: 'bd' },
  Pakistan: { currency: 'PKR', label: 'PK', flag: 'pk' },
  Afghanistan: { currency: 'AFN', label: 'AF', flag: 'af' },
  China: { currency: 'CNY', label: 'CN', flag: 'cn' },
  'United States': { currency: 'USD', label: 'US', flag: 'us' },
  'United Kingdom': { currency: 'GBP', label: 'GB', flag: 'gb' },
  India: { currency: 'INR', label: 'IN', flag: 'in' },
  Japan: { currency: 'JPY', label: 'JP', flag: 'jp' },
  Canada: { currency: 'CAD', label: 'CA', flag: 'ca' },
  Australia: { currency: 'AUD', label: 'AU', flag: 'au' },
  Germany: { currency: 'EUR', label: 'DE', flag: 'de' },
  France: { currency: 'EUR', label: 'FR', flag: 'fr' },
  Italy: { currency: 'EUR', label: 'IT', flag: 'it' },
  Spain: { currency: 'EUR', label: 'ES', flag: 'es' },
  Netherlands: { currency: 'EUR', label: 'NL', flag: 'nl' },
  Brazil: { currency: 'BRL', label: 'BR', flag: 'br' },
  Mexico: { currency: 'MXN', label: 'MX', flag: 'mx' },
  Russia: { currency: 'RUB', label: 'RU', flag: 'ru' },
  'South Korea': { currency: 'KRW', label: 'KR', flag: 'kr' },
  Thailand: { currency: 'THB', label: 'TH', flag: 'th' },
  Malaysia: { currency: 'MYR', label: 'MY', flag: 'my' },
  Indonesia: { currency: 'IDR', label: 'ID', flag: 'id' },
  Singapore: { currency: 'SGD', label: 'SG', flag: 'sg' },
  Turkey: { currency: 'TRY', label: 'TR', flag: 'tr' },
  'South Africa': { currency: 'ZAR', label: 'ZA', flag: 'za' },
  Nigeria: { currency: 'NGN', label: 'NG', flag: 'ng' },
  Egypt: { currency: 'EGP', label: 'EG', flag: 'eg' },
  Argentina: { currency: 'ARS', label: 'AR', flag: 'ar' },
  'Saudi Arabia': { currency: 'SAR', label: 'SA', flag: 'sa' },
  'United Arab Emirates': { currency: 'AED', label: 'AE', flag: 'ae' }
};

function generatedFlagSvg(country) {
  const colors = COUNTRY_META[country]?.svg;
  if (!colors) return '';
  const circle = country === 'Japan' ? '<circle cx="18" cy="12" r="6" fill="#bc002d"/>' : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 24"><rect width="36" height="8" fill="${colors[0]}"/><rect y="8" width="36" height="8" fill="${colors[1]}"/><rect y="16" width="36" height="8" fill="${colors[2]}"/>${circle}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Map a selected country name to the currency code used across the app.
function countryToCurrency(country) {
  if (COUNTRY_META[country]?.currency) return COUNTRY_META[country].currency;
  const map = {
    'Bangladesh': 'BDT',
    'Pakistan': 'PKR',
    'Afghanistan': 'AFN',
    'China': 'CNY',
    'United States': 'USD'
  };
  return map[country] || 'BDT';
}

function countryCode(country) {
  return COUNTRY_META[country]?.label || countryToCurrency(country);
}

function currencySymbol(code) {
  const symbols = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
    CAD: 'C$', AUD: 'A$', CHF: 'CHF', INR: '₹',
    BRL: 'R$', RUB: '₽', KRW: '₩', MXN: '$',
    SGD: 'S$', HKD: 'HK$', SEK: 'kr', NOK: 'kr',
    DKK: 'kr', PLN: 'zł', TRY: '₺', BDT: '৳',
    PKR: '₨', SAR: 'SR', AED: 'AED', EGP: 'E£',
    ZAR: 'R', NGN: '₦', THB: '฿', MYR: 'RM',
    IDR: 'Rp', VND: '₫', PHP: '₱', AFN: 'AF'
  };
  return symbols[code] || code;
}
// Map country to emoji flag (fallback to empty string).
function countryToFlag(country) {
  if (COUNTRY_META[country]?.label) return COUNTRY_META[country].label;
  const map = {
    'Bangladesh': '🇧🇩',
    'Pakistan': '🇵🇰',
    'Afghanistan': '🇦🇫',
    'China': '🇨🇳',
    'United States': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'India': '🇮🇳',
    'Japan': '🇯🇵',
    'Canada': '🇨🇦',
    'Australia': '🇦🇺',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'Italy': '🇮🇹',
    'Spain': '🇪🇸',
    'Netherlands': '🇳🇱',
    'Brazil': '🇧🇷',
    'Mexico': '🇲🇽',
    'Russia': '🇷🇺',
    'South Korea': '🇰🇷',
    'Thailand': '🇹🇭',
    'Malaysia': '🇲🇾',
    'Indonesia': '🇮🇩',
    'Singapore': '🇸🇬',
    'Turkey': '🇹🇷',
    'South Africa': '🇿🇦',
    'Nigeria': '🇳🇬',
    'Egypt': '🇪🇬',
    'Argentina': '🇦🇷',
    'Saudi Arabia': '🇸🇦',
    'United Arab Emirates': '🇦🇪'
  };
  return map[country] || '';
}
// Return an image path for a given country flag (prefer SVG/PNG assets).
function countryToFlagSrc(country) {
  const map = {
    'Bangladesh': 'bd.svg',
    'Pakistan': 'pk.svg',
    'Afghanistan': 'af.svg',
    'China': 'cn.svg',
    'United States': 'us.svg'
  };
  const file = map[country];
  return file ? `/photo/flags/${file}` : '';
}

function countryFlagBase(country) {
  if (COUNTRY_META[country]?.flag) return COUNTRY_META[country].flag;
  const map = {
    'Bangladesh': 'bd',
    'Pakistan': 'pk',
    'Afghanistan': 'af',
    'China': 'cn',
    'United States': 'us',
    'United Kingdom': 'gb',
    'India': 'in',
    'Japan': 'jp',
    'Canada': 'ca',
    'Australia': 'au',
    'Germany': 'de',
    'France': 'fr',
    'Italy': 'it',
    'Spain': 'es',
    'Netherlands': 'nl',
    'Brazil': 'br',
    'Mexico': 'mx',
    'Russia': 'ru',
    'South Korea': 'kr',
    'Thailand': 'th',
    'Malaysia': 'my',
    'Indonesia': 'id',
    'Singapore': 'sg',
    'Turkey': 'tr',
    'South Africa': 'za',
    'Nigeria': 'ng',
    'Egypt': 'eg',
    'Argentina': 'ar',
    'Saudi Arabia': 'sa',
    'United Arab Emirates': 'ae'
  };
  return map[country] || null;
}

function countryFlagPng(country) {
  const base = countryFlagBase(country);
  return base ? `/photo/flags/${base}.png` : generatedFlagSvg(country);
}

function countryFlagSvg(country) {
  const base = countryFlagBase(country);
  return base ? `/photo/flags/${base}.svg` : generatedFlagSvg(country);
}
function money(value, targetCurrency = null) {
  const amount = Number(value || 0);
  const currency = targetCurrency || CURRENT_CURRENCY;
  
  // If we have a rate for the target currency, convert from USD base
  if (currency !== 'USD' && GLOBAL_RATES[currency]) {
    const convertedAmount = amount * GLOBAL_RATES[currency];
    const decimals = ['BDT', 'PKR', 'AFN', 'INR', 'JPY', 'KRW', 'VND', 'IDR'].includes(currency) ? 0 : 2;
    const formattedAmount = convertedAmount.toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
    
    const symbol = currencySymbol(currency);
    return `${symbol} ${formattedAmount}`;
  }
  
  // Fallback to original logic for BDT base
  const rate = GLOBAL_RATES[currency] ?? 1;
  const converted = amount * rate;
  const decimals = ['BDT', 'PKR', 'AFN', 'INR', 'JPY', 'KRW', 'VND', 'IDR'].includes(currency) ? 0 : 2;
  const formattedAmount = converted.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
  
  const symbol = currencySymbol(currency);
  return `${symbol} ${formattedAmount}`;
}

function ProductCard({ product, onCart, onWish, onCompare, onBuyNow, isWished = false, isCompared = false }) {
  return (
    <article className="product-card">
      <div className="product-media">
        <img src={`/photo/${product.image || 'Z_Energy_logo.png'}`} alt={product.name} />
        {(product.is_daily || product.rating >= 5) && <span className="deal-badge"><Sparkles size={13} />Daily Deal</span>}
        <button
          className={isWished ? 'icon-btn floating wish-btn active' : 'icon-btn floating wish-btn'}
          onClick={() => onWish(product.id)}
          aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isWished}
        >
          <Heart size={18} fill={isWished ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="product-body">
        <div className="product-meta"><span>{product.category}</span><span className={product.stock <= 10 ? 'low-stock' : ''}>{product.stock} left</span></div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="rating" aria-label={`${product.rating} out of 5 rating`}>
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={15} fill={i < product.rating ? 'currentColor' : 'none'} />)}
        </div>
        <div className="product-bottom">
          <strong>{money(product.price)}</strong>
          <div className="button-pair">
            <button className={isCompared ? 'icon-btn compare-btn active' : 'icon-btn compare-btn'} onClick={() => onCompare(product.id)} aria-label={isCompared ? 'Remove from compare' : 'Compare product'} aria-pressed={isCompared}><Grid2X2 size={18} /></button>
            <button className="primary-btn compact" onClick={() => onCart(product.id)}><ShoppingCart size={17} />Cart</button>
          </div>
        </div>
        <button className="ghost-btn wide" onClick={() => onBuyNow(product.id)}><CreditCard size={17} />Buy now</button>
      </div>
    </article>
  );
}

function ProfileUpdate({ user, onUpdated, onClose }) {
  const [form, setForm] = useState({ 
    name: user?.name || '', 
    avatar_data: '' 
  });
  const [avatarPreview, setAvatarPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleAvatarFile(file) {
    if (!file || !file.type?.startsWith('image/')) {
      setError('Please upload a valid profile image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setAvatarPreview(result);
      setForm(current => ({ ...current, avatar_data: result }));
    };
    reader.readAsDataURL(file);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api('/profile/update', { 
        method: 'POST', 
        body: JSON.stringify(form) 
      });
      onUpdated(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Profile update failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-border" role="document">
        <div className="modal-box">
          <button className="icon-btn close-btn" onClick={onClose} aria-label="Close">
            <X />
          </button>
          <div className="modal-scroll-region">
            <main className="auth-page">
              <section className="auth-panel">
                <div className="auth-heading">
                  <h2>Update Profile</h2>
                  <p>Update your name and profile picture.</p>
                </div>
                {error && <div className="alert">{error}</div>}
                <form onSubmit={submit} className="auth-form">
                  <label
                    className={avatarPreview ? 'avatar-upload has-image' : 'avatar-upload'}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleAvatarFile(e.dataTransfer.files?.[0]); }}
                  >
                    <input type="file" accept="image/*" onChange={e => handleAvatarFile(e.target.files?.[0])} />
                    <span className="avatar-preview">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Profile preview" />
                      ) : profileImageSrc(user) ? (
                        <img src={profileImageSrc(user)} alt="Current profile" />
                      ) : (
                        <UploadCloud size={24} />
                      )}
                    </span>
                    <span className="avatar-copy">Update photo</span>
                  </label>
                  <label className="auth-field">
                    <User size={19} />
                    <input 
                      value={form.name} 
                      onChange={e => setForm({ ...form, name: e.target.value })} 
                      type="text" 
                      placeholder=" " 
                      autoComplete="name" 
                    />
                    <span>Full Name</span>
                  </label>
                  <div className="auth-actions">
                    <button className="auth-submit" disabled={submitting}>
                      <User size={18} />
                      {submitting ? 'Updating...' : 'Update Profile'}
                    </button>
                    <button type="button" className="ghost-btn" onClick={onClose}>
                      Cancel
                    </button>
                  </div>
                </form>
              </section>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

function Login({ onAuthed, note }) {
  const [mode, setMode] = useState('customer');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(true);
  const [customerEmailForm, setCustomerEmailForm] = useState({ name: '', email: '', password: '', avatar_data: '' });
  const [avatarPreview, setAvatarPreview] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [displayNote, setDisplayNote] = useState(() => note || (mode === 'customer'
    ? 'Sign in with email and password to access cart, wishlist, delivery, orders, and checkout.'
    : 'Admin tools use a separate protected sign-in for inventory, orders, customers, and sales.'
  ));

  useEffect(() => {
    // Keep displayNote in sync when parent-provided note changes
    if (note) setDisplayNote(note);
  }, [note]);

  useEffect(() => {
    // No side effects required for simple email/password login here.
  }, []);

  async function submitAdmin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api('/auth/admin/login', { method: 'POST', body: JSON.stringify(form) });
      onAuthed(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCustomerLogin(e) {
    e.preventDefault();
    setError('');
    setEmailSubmitting(true);
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(customerEmailForm) });
      onAuthed(data.user);
    } catch (err) {
      setError(err.message || 'Email sign-in failed');
    } finally {
      setEmailSubmitting(false);
    }
  }

  async function submitCustomerRegister(e) {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setEmailSubmitting(true);
    try {
      const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(customerEmailForm) });
      onAuthed(data.user);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setEmailSubmitting(false);
    }
  }

  function handleAvatarFile(file) {
    if (!file || !file.type?.startsWith('image/')) {
      setError('Please upload a valid profile image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setAvatarPreview(result);
      setCustomerEmailForm(current => ({ ...current, avatar_data: result }));
    };
    reader.readAsDataURL(file);
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
    setForm({ email: '', password: '' });
    // Update the descriptive note when switching tabs inside the modal
    if (nextMode === 'admin') {
      setDisplayNote('Admin tools use a separate protected sign-in for inventory, orders, customers, and sales.');
    } else {
      setDisplayNote('Sign in with email and password to access cart, wishlist, delivery, orders, and checkout.');
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-gradient" aria-hidden="true" />
      <span className="auth-bubble bubble-one" aria-hidden="true" />
      <span className="auth-bubble bubble-two" aria-hidden="true" />
      <span className="auth-bubble bubble-three" aria-hidden="true" />
      <section className="auth-panel">
        <div className="brand-mark"><img src="/photo/Z_Energy_logo.png" alt="" /></div>
        <div className="auth-heading">
          <span>{mode === 'customer' ? 'Customer login' : 'Administrator access'}</span>
          <h2>{mode === 'customer' ? 'Continue to Zicture' : 'Control room login'}</h2>
          <p>{displayNote}</p>
        </div>
        <div className="auth-tabs" role="tablist" aria-label="Login type">
          <button type="button" className={mode === 'customer' ? 'active' : ''} onClick={() => switchMode('customer')}><Sparkles size={16} />Shopper</button>
          <button type="button" className={mode === 'admin' ? 'active' : ''} onClick={() => switchMode('admin')}><ShieldCheck size={16} />Admin</button>
        </div>
        {error && <div className="alert">{error}</div>}
        {mode === 'customer' ? (
          <>
            <form onSubmit={submitCustomerLogin} className="auth-form customer-email-form" style={{ marginTop: 12 }}>
              <label
                className={avatarPreview ? 'avatar-upload has-image' : 'avatar-upload'}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleAvatarFile(e.dataTransfer.files?.[0]); }}
              >
                <input type="file" accept="image/*" onChange={e => handleAvatarFile(e.target.files?.[0])} />
                <span className="avatar-preview">
                  {avatarPreview ? <img src={avatarPreview} alt="Profile preview" /> : <UploadCloud size={24} />}
                </span>
                <span className="avatar-copy">Profile photo</span>
              </label>
              <label className="auth-field">
                <User size={19} />
                <input value={customerEmailForm.name} onChange={e => setCustomerEmailForm({ ...customerEmailForm, name: e.target.value })} type="text" placeholder=" " autoComplete="name" />
                <span>Name</span>
              </label>
              <label className="auth-field">
                <Mail size={19} />
                <input value={customerEmailForm.email} onChange={e => setCustomerEmailForm({ ...customerEmailForm, email: e.target.value })} type="email" placeholder=" " autoComplete="username" required />
                <span>Email</span>
              </label>
              <label className="auth-field">
                <Lock size={19} />
                <input value={customerEmailForm.password} onChange={e => setCustomerEmailForm({ ...customerEmailForm, password: e.target.value })} type={showPassword ? 'text' : 'password'} placeholder=" " autoComplete="current-password" required />
                <span>Password</span>
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </label>
              <div className="auth-actions">
                <button className="auth-submit" disabled={emailSubmitting}><KeyRound size={18} />{emailSubmitting ? 'Checking...' : 'Sign in'}</button>
                <span className="auth-or" aria-hidden="true">or</span>
                <button type="button" className="ghost-btn" onClick={submitCustomerRegister} disabled={emailSubmitting}>Create account</button>
              </div>
            </form>
          </>
        ) : (
          <form onSubmit={submitAdmin} className="auth-form admin-login-form">
            <label className="auth-field">
              <Mail size={19} />
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" placeholder=" " autoComplete="username" required />
              <span>Admin email</span>
            </label>
            <label className="auth-field">
              <Lock size={19} />
              <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} type={showPassword ? 'text' : 'password'} placeholder=" " autoComplete="current-password" required />
              <span>Admin password</span>
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </label>
            <button className="auth-submit" disabled={submitting}><KeyRound size={18} />{submitting ? 'Checking...' : 'Enter admin panel'}</button>
          </form>
        )}
        <div className="auth-security-row">
          <span><ShieldCheck size={16} />Verified identity</span>
          <span><Lock size={16} />Session protected</span>
        </div>
        <button className="text-btn auth-switch" onClick={() => switchMode(mode === 'customer' ? 'admin' : 'customer')}>
          {mode === 'customer' ? 'Admin login' : 'Back to shopper login'}
        </button>
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState('home');
  const [previousView, setPreviousView] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState({});
  const [home, setHome] = useState({ featured: [], daily: [], upcoming: [], stats: {} });
  const [products, setProducts] = useState([]);
  const [bookProducts, setBookProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [compare, setCompare] = useState([]);
  const [orders, setOrders] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('popular');
  const [toast, setToast] = useState('');
  const [authPrompt, setAuthPrompt] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [currencyUpdateKey, setCurrencyUpdateKey] = useState(0); 
  const [rates, setRates] = useState({ BDT: 1 });
  const [showProfileUpdate, setShowProfileUpdate] = useState(false);
  const [location, setLocation] = useState({ country: 'Bangladesh', city: 'Dhaka' });



  function CurrencyConverter({ 
  amount, 
  onAmountChange, 
  selectedCurrency, 
  onCurrencyChange,
  showConverter = true 
}) {
  const [currencies, setCurrencies] = useState([]);
  const [convertedPrices, setConvertedPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Popular currencies for quick access
  const popularCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'BDT', 'INR', 'CNY', 'PKR', 'SAR', 'AED'];

  useEffect(() => {
    fetchSupportedCurrencies();
  }, []);

  useEffect(() => {
    if (amount && showConverter) {
      convertToMultipleCurrencies();
    }
  }, [amount, selectedCurrency, showConverter]);

  async function fetchSupportedCurrencies() {
    try {
      const res = await fetch('/api/currencies/supported');
      const data = await res.json();
      if (data.success) {
        setCurrencies(data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch currencies:', err);
      // Fallback currency list
      const fallbackCurrencies = popularCurrencies.map(code => ({
        code,
        name: code === 'USD' ? 'US Dollar' : code === 'EUR' ? 'Euro' : `${code} Currency`,
        symbol: code
      }));
      setCurrencies(fallbackCurrencies);
    }
  }

  async function convertToMultipleCurrencies() {
    if (!amount || amount <= 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const conversions = {};
      
      // Convert to popular currencies
      for (const targetCurrency of popularCurrencies.slice(0, 6)) {
        if (targetCurrency === selectedCurrency) continue;
        
        try {
          const res = await fetch('/api/currencies/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: parseFloat(amount),
              from_currency: selectedCurrency,
              to_currency: targetCurrency
            })
          });
          
          const data = await res.json();
          if (data.success) {
            conversions[targetCurrency] = {
              amount: data.data.converted_amount,
              formatted: data.data.formatted_amount
            };
          }
        } catch (err) {
          console.warn(`Failed to convert to ${targetCurrency}:`, err);
        }
      }
      
      setConvertedPrices(conversions);
    } catch (err) {
      setError('Failed to convert currencies');
      console.error('Currency conversion error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!showConverter) return null;

  return (
    <div className="currency-converter">
      <div className="converter-header">
        <h3>Currency Converter</h3>
        <button 
          className="text-btn" 
          onClick={convertToMultipleCurrencies}
          disabled={loading}
        >
          {loading ? 'Converting...' : 'Refresh'}
        </button>
      </div>
      
      <div className="converter-input">
        <input
          type="number"
          value={amount}
          onChange={(e) => onAmountChange?.(e.target.value)}
          placeholder="Enter amount"
          min="0"
          step="0.01"
        />
        <select
          value={selectedCurrency}
          onChange={(e) => onCurrencyChange?.(e.target.value)}
        >
          {popularCurrencies.map(code => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </div>

      {error && <div className="alert error">{error}</div>}

      {Object.keys(convertedPrices).length > 0 && (
        <div className="conversion-results">
          <h4>Converted Prices:</h4>
          <div className="conversion-grid">
            {Object.entries(convertedPrices).map(([currency, data]) => (
              <div key={currency} className="conversion-item">
                <span className="currency-code">{currency}</span>
                <span className="converted-amount">{data.formatted}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
  // Fetch live exchange rates (BDT -> target) and update global rates used by money().
// Replace the existing rates loading useEffect (around line 144) with:
useEffect(() => {
  let mounted = true;
  async function loadRates() {
    try {
      // Use the new improved API endpoint
      const res = await fetch('/api/rates?refresh=false');
      const response = await res.json();
      
      if (response.success && response.data?.rates && mounted) {
        setRates(response.data.rates);
        setGlobalRates(response.data.rates);
      } else {
        throw new Error('No rates in response');
      }
    } catch (err) {
      console.warn('Failed to load exchange rates, using fallback:', err);
      // Enhanced fallback with more currencies
      const fallback = { 
        BDT: 84.50, USD: 1, EUR: 0.85, GBP: 0.73, JPY: 110.0, 
        CAD: 1.25, AUD: 1.35, CHF: 0.92, CNY: 6.45, INR: 74.50,
        BRL: 5.20, RUB: 74.00, KRW: 1180.0, MXN: 20.0, SGD: 1.35,
        HKD: 7.80, NOK: 8.50, SEK: 8.60, DKK: 6.30, PLN: 3.80,
        PKR: 155.0, SAR: 3.75, AED: 3.67, THB: 31.0, MYR: 4.15,
        IDR: 14250.0, VND: 23100.0, PHP: 50.0, EGP: 15.70, ZAR: 14.50,
        NGN: 410.0, TRY: 8.50
      };
      if (mounted) {
        setRates(fallback);
        setGlobalRates(fallback);
      }
    }
  }
  loadRates();
  
  // Auto-refresh rates every hour
  const interval = setInterval(loadRates, 3600000); // 1 hour
  
  return () => { 
    mounted = false; 
    clearInterval(interval);
  };
}, []);

  useEffect(() => {
    api('/auth/me').then(data => setUser(data.user)).finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!booting) refreshAll();
  }, [user, booting]);

  useEffect(() => {
    if (!user) return;
    const cached = localStorage.getItem(`zicture_compare_${user.id}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setCompare(parsed);
      } catch {
        localStorage.removeItem(`zicture_compare_${user.id}`);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) localStorage.setItem(`zicture_compare_${user.id}`, JSON.stringify(compare));
  }, [compare, user?.id]);

  // Load saved user location (requires login). Fall back to Bangladesh when unavailable.
  useEffect(() => {
    let mounted = true;
    async function loadLocation() {
      try {
        const loc = await api('/profile/location');
        if (!mounted || !loc) return;
        const country = loc.country || 'Bangladesh';
        setLocation({ country, city: loc.city || '' });
        const cur = countryToCurrency(country);
        setCurrency(cur);
        setGlobalCurrency(cur);
      } catch (err) {
        // not logged in or failed, keep defaults
        const cur = countryToCurrency('Bangladesh');
        setCurrency(cur);
        setGlobalCurrency(cur);
        if (mounted) setLocation({ country: 'Bangladesh', city: 'Dhaka' });
      }
    }
    loadLocation();
    return () => { mounted = false; };
  }, [user, booting]);

  useEffect(() => {
    api(`/products?category=${category}&q=${encodeURIComponent(query)}&sort=${sort}`).then(setProducts).catch(notify);
  }, [category, query, sort]);

  useEffect(() => {
    if (view === 'book') {
      api('/products?category=all&sort=popular').then(setBookProducts).catch(notify);
    }
  }, [view]);

  function notify(message) {
    setToast(message?.message || message);
    setTimeout(() => setToast(''), 2600);
  }

  async function refreshAll() {
    try {
      const [cat, h] = await Promise.all([api('/categories'), api('/home')]);
      setCategories(cat);
      setHome(h);
      if (user) {
        const [c, w, cp, o] = await Promise.all([api('/cart'), api('/wishlist'), api('/compare'), api('/orders')]);
        setCart(c);
        setWishlist(w);
        setCompare(cp);
        setOrders(o);
        if (user.role === 'admin') setAdmin(await api('/admin/summary'));
      } else {
        setCart([]);
        setWishlist([]);
        setCompare([]);
        setOrders([]);
        setAdmin(null);
      }
    } catch (err) {
      notify(err);
    }
  }

  function requireLogin(message = 'Please login first to use this feature.') {
    if (user) return false;
    setAuthPrompt(message);
    return true;
  }

  function goToView(nextView) {
    if (nextView !== view) setPreviousView(view);
    setView(nextView);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function addCart(id) {
    if (requireLogin('Please login before adding products to cart.')) return;
    setCart(await api('/cart', { method: 'POST', body: JSON.stringify({ product_id: id }) }));
    notify('Added to cart');
  }

  async function toggleWishlist(id) {
    if (requireLogin('Please login before saving wishlist items.')) return;
    const saved = wishlistIds.has(Number(id));
    setWishlist(await api('/wishlist', { method: saved ? 'DELETE' : 'POST', body: JSON.stringify({ product_id: id }) }));
    notify(saved ? 'Removed from wishlist' : 'Saved to wishlist');
  }

  async function toggleCompare(id) {
    if (requireLogin('Please login before comparing products.')) return;
    const saved = compareIds.has(Number(id));
    if (saved) setCompare(current => current.filter(item => Number(item.id) !== Number(id)));
    try {
      setCompare(await api('/compare', { method: saved ? 'DELETE' : 'POST', body: JSON.stringify({ product_id: id }) }));
      notify(saved ? 'Removed from compare' : 'Added to compare');
    } catch (err) {
      notify(err);
      refreshAll();
    }
  }

  async function buyNow(id) {
    if (requireLogin('Please login before buying a product.')) return;
    setCart(await api('/cart', { method: 'POST', body: JSON.stringify({ product_id: id }) }));
    goToView('cart');
    notify('Product added. Complete demo payment from cart.');
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    setCart([]);
    setWishlist([]);
    setCompare([]);
    setOrders([]);
    goToView('home');
    setMenuOpen(false);
  }

  const wishlistIds = useMemo(() => new Set(wishlist.map(item => Number(item.id))), [wishlist]);
  const compareIds = useMemo(() => new Set(compare.map(item => Number(item.id))), [compare]);

  if (booting) return <div className="loading">Loading Zicture...</div>;

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cardActions = { addCart, addWishlist: toggleWishlist, addCompare: toggleCompare, buyNow, isWishlisted: id => wishlistIds.has(Number(id)), isCompared: id => compareIds.has(Number(id)) };

  return (
    <div className="app-shell">
      <Header
        user={user}
        view={view}
        cart={cart}
        wishlist={wishlist}
        categories={categories}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        setView={goToView}
        setCategory={setCategory}
        setSort={setSort}
        query={query}
        setQuery={setQuery}
        logout={logout}
        notify={notify}
        openLogin={() => setAuthPrompt('Sign in to access cart, wishlist, compare, and checkout.')}
        requireLogin={requireLogin}
        location={location}
        setLocation={setLocation}
        setShowProfileUpdate={setShowProfileUpdate}
      />
      {toast && <div className="toast">{toast}</div>}
      {authPrompt && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-border" role="document" aria-labelledby="login-title">
            <div className="modal-box">
              <button className="icon-btn close-btn" onClick={() => setAuthPrompt('')} aria-label="Close login"><X /></button>
              <div className="modal-scroll-region">
                <Login onAuthed={(nextUser) => { setUser(nextUser); setAuthPrompt(''); }} note={authPrompt} />
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfileUpdate && (
        <ProfileUpdate 
          user={user} 
          onUpdated={(updatedUser) => { 
            setUser(updatedUser); 
            setShowProfileUpdate(false); 
          }} 
          onClose={() => setShowProfileUpdate(false)} 
        />
      )}

      {view !== 'home' && <button className="back-btn" onClick={() => goToView(previousView === view ? 'home' : previousView)}>Back to {previousView === view ? 'Home' : previousView}</button>}
      {view === 'home' && <Home key={`${currency}-${currencyUpdateKey}`} home={home} cart={cart} categories={categories} category={category} setCategory={setCategory} setView={goToView} notify={notify} actions={cardActions} />}
      {view === 'products' && <Catalog key={`${currency}-${currencyUpdateKey}`} products={products} categories={categories} category={category} setCategory={setCategory} query={query} setQuery={setQuery} sort={sort} setSort={setSort} actions={cardActions} />}
      {view === 'book' && <ProductBook key={currency} products={bookProducts.length ? bookProducts : products.length ? products : home.featured} categories={categories} setCategory={setCategory} setView={goToView} actions={cardActions} />}
      {view === 'cart' && (user ? <Cart cart={cart} setCart={setCart} total={cartTotal} refresh={refreshAll} notify={notify} /> : <ProtectedEmpty openLogin={() => setAuthPrompt('Please login to open your cart.')} />)}
      {view === 'wishlist' && (user ? <Collection title="Wishlist" items={wishlist} empty="No saved products yet." actions={cardActions} /> : <ProtectedEmpty openLogin={() => setAuthPrompt('Please login to open your wishlist.')} />)}
      {view === 'compare' && (user ? <Compare items={compare} onRemove={toggleCompare} /> : <ProtectedEmpty openLogin={() => setAuthPrompt('Please login to compare products.')} />)}
      {view === 'orders' && (user ? <Orders orders={orders} /> : <ProtectedEmpty openLogin={() => setAuthPrompt('Please login to see your orders.')} />)}
      {view === 'location' && (user ? <Location notify={notify} onSaved={(loc) => { 
        setLocation({ country: loc.country, city: loc.city }); 
        
        // Always prioritize database currency
        let newCurrency = 'USD';
        
        if (loc.currency_code) {
          newCurrency = loc.currency_code;
        } else {
          newCurrency = countryToCurrency(loc.country);
        }
        
        console.log('App: Setting currency to', newCurrency, 'for country', loc.country);
        setCurrency(newCurrency); 
        setGlobalCurrency(newCurrency);
        setCurrencyUpdateKey(prev => prev + 1); // Force re-render
        notify(`Location and currency set to ${loc.country} (${newCurrency})`); 
      }} /> : <ProtectedEmpty openLogin={() => setAuthPrompt('Please login to save delivery location.')} />)}
      {view === 'support' && <Support notify={notify} user={user} openLogin={() => setAuthPrompt('Please login before sending feedback.')} />}
      {view === 'admin' && (user?.role === 'admin' ? <Admin summary={admin} categories={categories} refresh={refreshAll} notify={notify} /> : <ProtectedEmpty title="Admin login required" message="Admin tools are available from the admin account only." openLogin={() => setAuthPrompt('Please login with the admin account to manage products, orders, customers, and sales.')} />)}
      <Footer setView={goToView} />
    </div>
  );
}

function Home({ home, cart, categories, category, setCategory, setView, notify, actions }) {
  const categoryEntries = Object.entries(categories).filter(([key]) => key !== 'all');

  return (
    <main>
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Hot deals, easy cart, fast delivery</span>
          <h1>Zicture - The Online Shopping</h1>
          <p>Shop daily essentials, books, fashion, games, medicine, electronics, software, and more with working search, cart, wishlist, compare, coupon, support, and invoice download.</p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => setView('products')}><ShoppingBag size={18} />Shop Now</button>
            <button className="ghost-btn" onClick={() => setView('book')}><BookOpen size={18} />ProductBook</button>
            <button className="ghost-btn" onClick={() => setView('cart')}><Tag size={18} />Coupon Discount</button>
            <button className="primary-btn success" onClick={() => setView('location')}><Truck size={18} />Fast Delivery</button>
          </div>
        </div>
        <aside className="hero-panel">
          <img src="/photo/happy-two-women-with-colorful-shopping-bags-blue-wall_231208-11829.jpg" alt="Happy online shopping" />
          <div className="hero-panel-strip">
            <strong>20% off<span>Use ZICTURE20</span></strong>
            <strong>ProductBook<span>Open catalog</span></strong>
            <strong>BDT<span>Currency</span></strong>
          </div>
        </aside>
      </section>
      <section className="service-grid" id="services">
        <button onClick={() => setView('products')}><Sparkles size={24} /><strong>Hot Deals</strong><span>Popular products sorted by rating.</span></button>
        <button onClick={() => setView('cart')}><ShoppingCart size={24} /><strong>Easy Cart</strong><span>Coupon, tax, shipping, and demo pay.</span></button>
        <button onClick={() => setView('location')}><Truck size={24} /><strong>Fast Delivery</strong><span>Save city, phone, and address.</span></button>
        <button onClick={() => setView('support')}><Headphones size={24} /><strong>Support Center</strong><span>Contact, FAQ, and feedback.</span></button>
      </section>
      <section className="featured-categories">
        <div className="section-title-row"><div><h2>Featured Categories</h2><p>More departments for every product type.</p></div><button className="ghost-btn" onClick={() => setView('book')}>Open ProductBook</button></div>
        <div className="category-card-grid">
          {categoryEntries.map(([key, meta]) => {
            const Icon = icons[meta.icon] || Grid2X2;
            return (
              <button className="category-card" key={key} onClick={() => { setCategory(key); setView('products'); }}>
                <Icon size={30} />
                <strong>{meta.label}</strong>
                <span>Browse Products</span>
              </button>
            );
          })}
        </div>
      </section>
      <CouponPanel setView={setView} notify={notify} />
      <Section id="daily-section" title="Daily Picks" products={home.daily} actions={actions} />
      <section className="trending-strip" id="trending">
        <div>
          <h2>Trending On Zicture</h2>
          <p>Hot deals, easy cart, fast delivery, support center, and ProductBook are ready.</p>
        </div>
        <div className="trending-actions">
          <button className="primary-btn" onClick={() => { setCategory('all'); setView('products'); }}>Hot Deals</button>
          <button className="ghost-btn" onClick={() => setView('cart')}>Easy Cart</button>
          <button className="ghost-btn" onClick={() => setView('location')}>Fast Delivery</button>
        </div>
      </section>
      <Section title="Featured Products" products={home.featured} actions={actions} />
      <UpcomingLaunches products={home.upcoming} categories={categories} setView={setView} actions={actions} />
    </main>
  );
}

function Header({ user, view, cart, wishlist, categories, menuOpen, setMenuOpen, setView, setCategory, setSort, query, setQuery, logout, notify, openLogin, requireLogin, location, setLocation, setShowProfileUpdate }) {
  const protectedViews = ['cart', 'wishlist', 'compare', 'orders', 'location', 'admin'];
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeNavKey, setActiveNavKey] = useState('home');

  useEffect(() => {
    function closeFloatingMenus() {
      setDepartmentOpen(false);
      setProfileOpen(false);
    }
    window.addEventListener('click', closeFloatingMenus);
    return () => window.removeEventListener('click', closeFloatingMenus);
  }, []);

  function scrollToSection(id) {
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 70);
  }

  function go(nextView, options = {}) {
    if (protectedViews.includes(nextView) && requireLogin(`Please login before opening ${nextView}.`)) return;
    if (options.category) setCategory(options.category);
    if (options.sort) setSort(options.sort);
    if (options.navKey) setActiveNavKey(options.navKey);
    setView(nextView);
    setMenuOpen(false);
    setDepartmentOpen(false);
    setProfileOpen(false);
    if (options.section) scrollToSection(options.section);
  }

  function handleNavClick(e, item) {
    e.preventDefault();
    e.stopPropagation();
    go(item.view, { ...item, navKey: item.key });
  }

  function search(e) {
    e.preventDefault();
    e.stopPropagation();
    setCategory('all');
    setActiveNavKey('all-items');
    setView('products');
    setMenuOpen(false);
  }

  const departments = Object.entries(categories).filter(([key]) => key !== 'all');
  const firstName = (user?.name || user?.email || 'User').split(/[ @]/)[0];
  const avatarSrc = profileImageSrc(user);
  const navItems = [
    { key: 'home', label: 'Home', view: 'home' },
    { key: 'trending', label: 'Trending On', view: 'home', section: 'trending' },
    { key: 'upcoming', label: 'Upcoming', view: 'home', section: 'upcoming' },
    { key: 'popular', label: 'Popular', view: 'products', category: 'all', sort: 'popular' },
    { key: 'shop', label: 'Shop', view: 'products', category: 'all' },
    { key: 'services', label: 'Services', view: 'home', section: 'services' },
    { key: 'contact', label: 'Contact', view: 'support' },
    { key: 'all-items', label: 'All Item', view: 'products', category: 'all' },
    { key: 'product-book', label: 'ProductBook', view: 'book' },
    { key: 'admin', label: 'Admin', view: 'admin' },
  ];

  return (
    <header className="site-header">
      <div className="brand-bar">
        <div className="brand-row">
          <button className="brand-lockup" onClick={(e) => { e.stopPropagation(); go('home', { navKey: 'home' }); }} aria-label="Zicture home">
            <img src="/photo/Z_Energy_logo.png" alt="Zicture logo" className="brand-logo" />
            <span className="brand-copy"><strong>Zicture</strong><span>The Online Shopping</span></span>
          </button>
          <form className="header-search" onSubmit={search}>
            <input value={query} onChange={e => setQuery(e.target.value)} type="text" placeholder="   Search products by name, category, or description..." autoComplete="off" />
            <button className="search-submit" aria-label="Search"><Search size={18} /></button>
          </form>
          <nav className="quick-actions" aria-label="Account and shopping links">
            {/* Currency is chosen automatically from selected country (no manual control). */}
            {user ? (
              <div className="profile-menu">
                <button className="account-chip profile-trigger" onClick={(e) => { e.stopPropagation(); setDepartmentOpen(false); setProfileOpen(open => !open); }} aria-expanded={profileOpen}>
                  <span className="profile-avatar">
                    {user?.role === "admin" ? (
                      <img src="/photo/network-z.jpg" alt="Admin Profile" />
                    ) : avatarSrc ? (
                      <img src={avatarSrc} alt={`${firstName} profile`} />
                    ) : (
                      <span>{firstName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="profile-name">{firstName}</span>
                  <ChevronDown size={15} />
                </button>
                {profileOpen && (
                  <div className="profile-dropdown" onClick={(e) => e.stopPropagation()}>
                    <div className="profile-dropdown-head">
                      <span className="profile-avatar large">{avatarSrc ? <img src={avatarSrc} alt="" /> : <span>{firstName.slice(0, 2).toUpperCase()}</span>}</span>
                      <div><strong>{user.name || firstName}</strong><small>{user.email}</small></div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setShowProfileUpdate(true); setProfileOpen(false); }}>
                      <User size={16} />Edit Profile
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); go('orders'); }}><PackagePlus size={16} />Orders</button>
                    <button onClick={(e) => { e.stopPropagation(); logout(); }}><LogOut size={16} />Logout</button>
                  </div>
                )}
              </div>
            ) : <button className="account-chip" onClick={(e) => { e.stopPropagation(); setDepartmentOpen(false); setProfileOpen(false); setMenuOpen(false); openLogin(); }}><span className="profile-initials">ZS</span><span>Login</span></button>}
            <button className="location-btn" onClick={(e) => { e.stopPropagation(); go('location'); }}>
              {(countryFlagPng((location && location.country) ? location.country : '')) ? (
                  <span className="flag-pin" aria-hidden>
                    <span className="flag-head">
                      <img src={countryFlagPng((location && location.country) ? location.country : '')} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = countryFlagSvg((location && location.country) ? location.country : ''); }} alt={`${(location && location.country) ? location.country : ''} flag`} className="flag-img" />
                    </span>
                  </span>
              ) : (
                <span className="flag-emoji" aria-hidden>{countryToFlag((location && location.country) ? location.country : '')}</span>
              )}
              <span>
                {(location && location.country)
                  ? location.country
                  : 'Location'}
              </span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); go('wishlist'); }}><Heart size={16} fill={wishlist.length ? 'currentColor' : 'none'} /><span>Wishlist</span></button>
            <button className="cart-action" onClick={(e) => { e.stopPropagation(); go('cart'); }}><ShoppingCart size={16} /><span>Cart</span>{cart.length > 0 && <b>{cart.length}</b>}</button>
          </nav>
        </div>
      </div>
      <div className="main-nav">
        <button className="mobile-menu" onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} aria-expanded={menuOpen}><Menu size={20} />Zicture Menu</button>
        <nav className={menuOpen ? 'nav open' : 'nav'} onClick={(e) => e.stopPropagation()}>
          <div className="nav-drawer-heading mobile-only">
            <span>Menu</span>
            <button className="drawer-close-text" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} aria-label="Close menu">Close</button>
          </div>
          {navItems.slice(0, 1).map(item => <button key={item.key} className={activeNavKey === item.key ? 'active' : ''} onClick={(e) => handleNavClick(e, item)}>{item.label}</button>)}
          <div className={departmentOpen ? 'nav-department open' : 'nav-department'}>
            <button className="department-trigger" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setProfileOpen(false); setDepartmentOpen(!departmentOpen); }} aria-expanded={departmentOpen}>Department</button>
            <div className="department-menu" onClick={(e) => e.stopPropagation()}>
              {departments.map(([key, meta]) => {
                const Icon = icons[meta.icon] || Grid2X2;
                return <button key={key} onClick={(e) => { e.preventDefault(); e.stopPropagation(); go('products', { category: key, navKey: `department-${key}` }); }}><Icon size={17} />{meta.label}</button>;
              })}
            </div>
          </div>
          {navItems.slice(1).map(item => <button key={item.key} className={activeNavKey === item.key ? 'active' : ''} onClick={(e) => handleNavClick(e, item)}>{item.label}</button>)}
        </nav>
      </div>
    </header>
  );
}

function ProtectedEmpty({ title = 'Login required', message = 'You can browse the website freely, but this action needs your Zicture account.', openLogin }) {
  return (
    <main className="page">
      <div className="empty protected-empty">
        <User size={42} />
        <h2>{title}</h2>
        <p>{message}</p>
        <button className="primary-btn" onClick={openLogin}>Login now</button>
      </div>
    </main>
  );
}

function Footer({ setView }) {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <h3>Zicture</h3>
        <p>Your one-stop online shopping destination for quality products, hot deals, daily picks, and fast delivery.</p>
        <div className="social-row">
          <button onClick={() => setView('support')} aria-label="Message support"><MessageCircle size={16} /></button>
          <button onClick={() => setView('support')} aria-label="Email support"><Mail size={16} /></button>
          <button onClick={() => setView('location')} aria-label="View locations"><MapPin size={16} /></button>
        </div>
      </div>
      <div>
        <h4>Quick Links</h4>
        {['home', 'products', 'book', 'wishlist', 'compare', 'cart'].map(item => <button className="footer-link" key={item} onClick={() => setView(item)}>{item === 'products' ? 'All Item' : item === 'book' ? 'ProductBook' : item}</button>)}
      </div>
      <div>
        <h4>Services</h4>
        <button className="footer-link" onClick={() => setView('products')}>Daily Section</button>
        <button className="footer-link" onClick={() => setView('location')}>Fast Delivery</button>
        <button className="footer-link" onClick={() => setView('cart')}>Easy Cart</button>
        <button className="footer-link" onClick={() => setView('support')}>Support Center</button>
        <button className="footer-link" onClick={() => setView('cart')}>Coupon Discount</button>
      </div>
      <div>
        <h4>Support Center</h4>
        <p>+880 1798-070234<br />+880 1853-079398<br />bayazidh383@gmail.com<br />Dhaka, Bangladesh</p>
      </div>
      <small><span>&copy; 2022 <strong>Zicture - The Online Shopping</strong>. All Rights Reserved.</span><span>Developed by <strong>Team Alpha</strong></span></small>
    </footer>
  );
}

function Catalog({ products, categories, category, setCategory, query, setQuery, sort, setSort, actions }) {
  return (
    <main className="page">
      <div className="page-heading">
        <div><h1>{query ? `Search: ${query}` : 'Products'}</h1><p>Use the main header search, then filter by category and sort the results here.</p></div>
        <div className="toolbar sort-only">
          {query && <button className="ghost-btn" onClick={() => setQuery('')}><X size={16} />Clear Search</button>}
          <select value={sort} onChange={e => setSort(e.target.value)}><option value="popular">Popular</option><option value="new">Newest</option><option value="price_low">Price low</option><option value="price_high">Price high</option><option value="stock">Low stock</option></select>
        </div>
      </div>
      <div className="catalog-layout">
        <CategoryRail categories={categories} category={category} setCategory={setCategory} />
        <section className="catalog-results">
          {products.length === 0 ? <div className="empty">No products found for this search.</div> : <div className="product-grid">{products.map(p => <ProductCard key={p.id} product={p} onCart={actions.addCart} onWish={actions.addWishlist} onCompare={actions.addCompare} onBuyNow={actions.buyNow} isWished={actions.isWishlisted?.(p.id)} isCompared={actions.isCompared?.(p.id)} />)}</div>}
        </section>
      </div>
    </main>
  );
}

function CategoryRail({ categories, category, setCategory }) {
  return (
    <aside className="category-sidebar" aria-label="Product categories">
      <div className="category-sidebar-title">
        <strong>Departments</strong>
        <span>{Object.keys(categories).length} categories</span>
      </div>
      <div className="category-sidebar-list">
      {Object.entries(categories).map(([key, meta]) => {
        const Icon = icons[meta.icon] || Grid2X2;
        return <button key={key} className={category === key ? 'active' : ''} onClick={() => setCategory(key)}><Icon size={18} />{meta.label}</button>;
      })}
      </div>
    </aside>
  );
}

function Section({ id, title, products, actions }) {
  if (!products?.length) return null;
  return <section className="page-section" id={id}><div className="section-title-row"><h2>{title}</h2><span>{products.length} items</span></div><div className="product-grid">{products.map(p => <ProductCard key={p.id} product={p} onCart={actions.addCart} onWish={actions.addWishlist} onCompare={actions.addCompare} onBuyNow={actions.buyNow} isWished={actions.isWishlisted?.(p.id)} isCompared={actions.isCompared?.(p.id)} />)}</div></section>;
}

function UpcomingLaunches({ products, categories, setView, actions }) {
  if (!products?.length) return null;
  return (
    <section className="upcoming-panel" id="upcoming">
      <div className="upcoming-intro">
        <div className="upcoming-orbit"><PackagePlus size={48} /></div>
        <span className="eyebrow">Coming soon</span>
        <h2>Upcoming Product Launches</h2>
        <p>Preview new books, devices, lifestyle bundles, daily essentials, and festival deals.</p>
        <button className="primary-btn" onClick={() => setView('products')}>Browse New Items</button>
      </div>
      <div className="upcoming-grid">
        {products.map(product => (
          <article className="upcoming-card" key={product.id}>
            <img src={`/photo/${product.image || 'Z_Energy_logo.png'}`} alt={product.name} />
            <div>
              <span>{categories[product.category]?.label || product.category}</span>
              <strong>{product.name}</strong>
              <small>{money(product.price)}</small>
              <div className="upcoming-actions">
                <button className="ghost-btn" onClick={() => setView('products')}>Details</button>
                <button className={actions.isWishlisted?.(product.id) ? 'primary-btn compact saved' : 'primary-btn compact'} onClick={() => actions.addWishlist(product.id)}>{actions.isWishlisted?.(product.id) ? 'Saved' : 'Save'}</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Cart({ cart, setCart, total, refresh, notify }) {
  const [coupon, setCoupon] = useState('ZICTURE20');
  const [address, setAddress] = useState({ city: 'Dhaka', address: 'Demo customer address', payment_method: 'demo_card', country: 'Bangladesh', zipcode: '' });
  const [paidOrder, setPaidOrder] = useState(null);
  // head office mapping: country -> head office city
  const headOffices = {
    Bangladesh: 'Magura',
    Pakistan: 'Karachi',
    Afghanistan: 'Kabul',
    China: 'Guangzhou',
    'United States': 'New York',
    'United Kingdom': 'London',
    India: 'New Delhi',
    Japan: 'Tokyo',
    Canada: 'Toronto',
    Australia: 'Sydney',
    Germany: 'Berlin',
    France: 'Paris',
    'United Arab Emirates': 'Dubai',
    'Saudi Arabia': 'Riyadh'
  };

  // coupon discount and head-office extra discount (10%) apply to subtotal
  const couponDiscount = coupon.toUpperCase() === 'ZICTURE20' ? total * 0.2 : 0;
  const isHeadOffice = address && address.country && headOffices[address.country] && (headOffices[address.country].toLowerCase() === (address.city || '').toLowerCase());
  const headDiscount = isHeadOffice ? total * 0.10 : 0;
  const discount = couponDiscount + headDiscount;
  const tax = (total - discount) * 0.05;
  const shipping = total >= 500 || total === 0 ? 0 : 80;
  const finalTotal = Math.max(0, total - discount) + tax + shipping;

  useEffect(() => {
    api('/profile/location').then(loc => setAddress(current => ({ ...current, city: loc.city || current.city, address: loc.street || current.address, country: loc.country || current.country, zipcode: loc.zipcode || current.zipcode, phone: loc.phone || current.phone }))).catch(() => {});
  }, []);

  async function update(item, quantity) {
    setCart(await api('/cart', { method: 'PUT', body: JSON.stringify({ item_id: item.item_id, quantity }) }));
  }

  async function remove(item) {
    setCart(await api('/cart', { method: 'DELETE', body: JSON.stringify({ item_id: item.item_id }) }));
  }

  async function checkout() {
    try {
      const result = await api('/checkout', { method: 'POST', body: JSON.stringify({ ...address, coupon }) });
      notify(`${result.message}: order #${result.order_id}`);
      setPaidOrder(result);
      refresh();
    } catch (err) {
      notify(err);
    }
  }

  return (
    <main className="page two-col">
      <section className="stack">
        <div className="page-heading compact-heading"><div><h1>Shopping Cart</h1><p>Review quantities, delivery address, coupon, and demo payment.</p></div></div>
        {paidOrder && <div className="bill-card"><div><span>Bill Evidence Ready</span><h2>Order #{paidOrder.order_id} paid successfully</h2><p>Your invoice PDF uses the same Zicture PDF style as the ProductBook.</p></div><a className="primary-btn" href={paidOrder.invoice_url || `/api/invoice/${paidOrder.order_id}`}><Download size={18} />Download Bill PDF</a></div>}
        {cart.length === 0 && <div className="empty">Your cart is empty.</div>}
        {cart.map(item => <article className="line-item" key={item.item_id}><img src={`/photo/${item.image || 'Z_Energy_logo.png'}`} alt={item.name} /><div><h3>{item.name}</h3><p>{money(item.price)}</p></div><input type="number" min="1" value={item.quantity} onChange={e => update(item, e.target.value)} /><strong>{money(item.price * item.quantity)}</strong><button className="icon-btn danger" onClick={() => remove(item)} aria-label="Remove item"><Trash2 size={18} /></button></article>)}
      </section>
      <aside className="summary">
        <h2>Demo Payment</h2>
        <input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="Coupon" />
        <input value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} placeholder="City" />
        <textarea value={address.address} onChange={e => setAddress({ ...address, address: e.target.value })} placeholder="Delivery address" />
        <div className="totals">
          <span>Subtotal</span><b>{money(total)}</b>
          <span>Coupon discount</span><b>- {money(couponDiscount)}</b>
          {headDiscount > 0 && <><span>Head office discount (10%)</span><b>- {money(headDiscount)}</b></>}
          <span>Total discount</span><b>- {money(discount)}</b>
          <span>Tax</span><b>{money(tax)}</b>
          <span>Shipping</span><b>{shipping ? money(shipping) : 'FREE'}</b>
          <span>Total</span><strong>{money(finalTotal)}</strong>
        </div>
        <button className="primary-btn wide" disabled={!cart.length} onClick={checkout}><CreditCard size={18} />Pay demo bill</button>
      </aside>
    </main>
  );
}

function Collection({ title, items, empty, actions }) {
  return <main className="page"><div className="page-heading compact-heading"><div><h1>{title}</h1><p>Saved products stay ready for cart, buy-now, or comparison.</p></div></div>{items.length === 0 && <div className="empty">{empty}</div>}<div className="product-grid">{items.map(p => <ProductCard key={p.id} product={p} onCart={actions.addCart} onWish={actions.addWishlist} onCompare={actions.addCompare} onBuyNow={actions.buyNow} isWished={actions.isWishlisted?.(p.id)} isCompared={actions.isCompared?.(p.id)} />)}</div></main>;
}

function Compare({ items, onRemove }) {
  const prices = items.map(item => Number(item.price || 0));
  const stocks = items.map(item => Number(item.stock || 0));
  const ratings = items.map(item => Number(item.rating || 0));
  const categories = new Set(items.map(item => item.category));
  const bestPrice = prices.length ? Math.min(...prices) : null;
  const bestStock = stocks.length ? Math.max(...stocks) : null;
  const bestRating = ratings.length ? Math.max(...ratings) : null;

  function features(product) {
    const text = product.description || 'Quality product with fast Zicture delivery.';
    return text
      .split(/[,.]/)
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  return (
    <main className="page compare-page">
      <div className="page-heading compact-heading">
        <div>
          <h1>Compare</h1>
          <p>Compare up to four products by image, price, stock, rating, category, and key features.</p>
        </div>
      </div>
      {items.length === 0 && <div className="empty">Add up to four products to compare.</div>}
      {items.length > 0 && (
        <div className="compare-table-wrap">
          <div className="compare-table" style={{ '--compare-count': items.length }}>
            <div className="compare-row compare-header">
              <div className="compare-label">Product</div>
              {items.map(product => (
                <article className="compare-product" key={product.id}>
                  <button className="icon-btn compare-remove" onClick={() => onRemove(product.id)} aria-label={`Remove ${product.name} from compare`}><X size={16} /></button>
                  <img src={`/photo/${product.image || 'Z_Energy_logo.png'}`} alt={product.name} />
                  <h3>{product.name}</h3>
                  <strong>{money(product.price)}</strong>
                </article>
              ))}
            </div>
            <div className="compare-row">
              <div className="compare-label">Price</div>
              {items.map(product => <div key={product.id} className={Number(product.price) === bestPrice ? 'compare-cell diff-best' : 'compare-cell'}>{money(product.price)}</div>)}
            </div>
            <div className="compare-row">
              <div className="compare-label">Rating</div>
              {items.map(product => <div key={product.id} className={Number(product.rating) === bestRating ? 'compare-cell diff-best' : 'compare-cell'}>{product.rating}/5</div>)}
            </div>
            <div className="compare-row">
              <div className="compare-label">Stock</div>
              {items.map(product => <div key={product.id} className={Number(product.stock) === bestStock ? 'compare-cell diff-best' : 'compare-cell'}>{product.stock} available</div>)}
            </div>
            <div className="compare-row">
              <div className="compare-label">Category</div>
              {items.map(product => <div key={product.id} className={categories.size > 1 ? 'compare-cell diff-note' : 'compare-cell'}>{product.category}</div>)}
            </div>
            <div className="compare-row compare-feature-row">
              <div className="compare-label">Key Features</div>
              {items.map(product => (
                <div key={product.id} className="compare-cell">
                  <ul className="compare-features">
                    {features(product).map(feature => <li key={feature}>{feature}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Orders({ orders }) {
  return <main className="page"><div className="page-heading compact-heading"><div><h1>Orders</h1><p>All demo payments, order statuses, and PDF invoices appear here.</p></div></div>{orders.length === 0 && <div className="empty">No demo payments yet.</div>}<div className="table-card"><table><thead><tr><th>Order</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Invoice</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td>#{o.id}</td><td>{money(o.total_price)}</td><td>{o.payment_status}</td><td><span className={`status ${o.status}`}>{o.status}</span></td><td>{o.created_at}</td><td><a className="download-link" href={`/api/invoice/${o.id}`}><Download size={16} />PDF</a></td></tr>)}</tbody></table></div></main>;
}

function ProductBook({ products, categories, setCategory, setView, actions }) {
  const grouped = products.reduce((acc, product) => ({ ...acc, [product.category]: [...(acc[product.category] || []), product] }), {});
  return (
    <main className="page">
      <section className="book-hero"><div><span className="eyebrow">Digital catalog</span><h1>Zicture ProductBook</h1><p>A clean department view for every product, price, stock level, and quick cart action.</p></div><div className="hero-actions"><a className="primary-btn" href="/api/product-book.pdf"><Download size={18} />Download PDF</a><button className="ghost-btn" onClick={() => window.print()}><FileText size={18} />Print catalog</button></div></section>
      {Object.entries(grouped).map(([cat, items]) => <section className="book-section" key={cat}><div className="section-title-row"><h2>{categories[cat]?.label || cat}</h2><button className="ghost-btn" onClick={() => { setCategory(cat); setView('products'); }}><BookMarked size={18} />Shop</button></div><div className="book-grid">{items.map(p => <article key={p.id}><img src={`/photo/${p.image || 'Z_Energy_logo.png'}`} alt={p.name} /><div><h3>{p.name}</h3><p>{p.description}</p><strong>{money(p.price)}</strong><span>{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</span><div className="form-actions"><button className="primary-btn" onClick={() => actions.addCart(p.id)}><ShoppingCart size={17} />Cart</button><button className="ghost-btn" onClick={() => actions.buyNow(p.id)}><CreditCard size={17} />Buy</button></div></div></article>)}</div></section>)}
    </main>
  );
}

function CouponPanel({ setView, notify }) {
  async function copyCoupon() {
    await navigator.clipboard?.writeText('ZICTURE20');
    notify('Coupon ZICTURE20 copied');
  }
  return <section className="coupon-panel"><div><span>Usable coupon</span><h2>Save 20% with ZICTURE20</h2><p>Apply this code in cart. Checkout calculates discount, tax, shipping, and total.</p></div><div className="coupon-actions"><code>ZICTURE20</code><button className="primary-btn" onClick={copyCoupon}>Copy</button><button className="ghost-btn" onClick={() => setView('cart')}>Go to cart</button></div></section>;
}

function Location({ notify, onSaved }) {
  const [countriesData, setCountriesData] = useState({});


  const [loading, setLoading] = useState(true);
  const defaultCountry = 'Bangladesh';
  const defaultRegion = Object.keys(countriesData[defaultCountry]?.regions || {})[0] || 'Dhaka Division';
  const defaultCityObj = countriesData[defaultCountry]?.regions[defaultRegion]?.[0] || { name: 'Dhaka', zipcode: '1000' };
  const [form, setForm] = useState({ 
    country: defaultCountry, 
    region: defaultRegion, 
    city: defaultCityObj.name, 
    street: '', 
    zipcode: defaultCityObj.zipcode || '', 
    phone: '' 
  });

  // Try to load countries from database, fallback to hardcoded data
// Try to load countries from database, fallback to hardcoded data
useEffect(() => {
  async function loadCountries() {
    try {
      const response = await fetch('/api/countries');
      const data = await response.json();
      
      if (data.success && data.data && Object.keys(data.data).length > 0) {
        console.log('✅ Loaded countries from database:', Object.keys(data.data).length);
        
        // Database data is already in the right format!
        setCountriesData(data.data);
        
        // Update form with first country if needed
        const firstCountry = Object.keys(data.data)[0];
        if (firstCountry) {
          const firstRegion = Object.keys(data.data[firstCountry].regions)[0];
          const firstCity = data.data[firstCountry].regions[firstRegion]?.[0];
          
          setForm(prev => ({
            ...prev,
            country: firstCountry,
            region: firstRegion,
            city: firstCity?.name || '',
            zipcode: firstCity?.zipcode || ''
          }));
        }
      } else {
        console.log('⚠️ Using fallback countries data');
      }
    } catch (error) {
      console.error('❌ Failed to load countries, using fallback:', error);
    } finally {
      setLoading(false);
    }
  }
  
  loadCountries();
}, []);

useEffect(() => {
  if (!loading) {
    api('/profile/location').then(loc => {
      if (!loc) return;
      const country = loc.country || 'Bangladesh';
      
      // Find the saved country data
      const savedCountryData = Object.values(countriesData).find(c => c.name === country);
      
      if (savedCountryData) {
        let region = '';
        let cityData = null;
        
        // Find the region/state that contains the saved city
        if (loc.city) {
          for (const [regionName, cities] of Object.entries(savedCountryData.regions)) {
            const foundCity = cities.find(c => c.name === loc.city);
            if (foundCity) {
              region = regionName;
              cityData = foundCity;
              break;
            }
          }
        }
        
        // Fallback to first region if not found
        if (!region) {
          const regions = Object.keys(savedCountryData.regions);
          if (regions.length > 0) {
            region = regions[0];
            cityData = savedCountryData.regions[region][0] || { name: '', zipcode: '' };
          }
        }
        
        setForm({
          country,
          region,
          city: cityData?.name || loc.city || '',
          street: loc.street || '',
          zipcode: loc.zipcode || cityData?.zipcode || '',
          phone: loc.phone || ''
        });
        
        // Set currency for saved location
        if (savedCountryData.currency_code) {
          console.log('Setting saved currency to:', savedCountryData.currency_code);
          setGlobalCurrency(savedCountryData.currency_code);
        }
      }
    }).catch(() => {});
  }
}, [loading, countriesData]);

  // ADD THIS NEW useEffect (place it after the existing ones)


async function save(e) {
  e.preventDefault();
  await api('/profile/location', { method: 'POST', body: JSON.stringify({ country: form.country, city: form.city, street: form.street, zipcode: form.zipcode, phone: form.phone }) });
  notify('Location saved');
  
  // Get currency from the selected country
  const selectedCountryData = Object.values(countriesData).find(c => c.name === form.country);
  console.log('Save: Found country data:', selectedCountryData);
  
  if (typeof onSaved === 'function') {
    try {
      onSaved({ 
        country: form.country, 
        city: form.city, 
        street: form.street, 
        zipcode: form.zipcode, 
        phone: form.phone,
        currency_code: selectedCountryData?.currency_code || 'USD' // Include currency in save
      });
    } catch (e) {
      console.error('onSaved error:', e);
    }
  }
}

  if (loading) {
    return (
      <main className="page">
        <div className="page-heading compact-heading">
          <div>
            <h1>Set Location</h1>
            <p>Loading countries...</p>
          </div>
        </div>
      </main>
    );
  }

  const selectedCountryData = Object.values(countriesData).find(country => country.name === form.country);
  const regionList = selectedCountryData ? Object.keys(selectedCountryData.regions || {}) : [];
  const cityList = selectedCountryData?.regions[form.region] || [{ name: 'Other', zipcode: '' }];
  const headOfficesMap = {
    Bangladesh: 'Magura',
    Pakistan: 'Karachi',
    Afghanistan: 'Kabul',
    China: 'Guangzhou',
    'United States': 'New York',
    'United Kingdom': 'London',
    India: 'New Delhi',
    Japan: 'Tokyo',
    Canada: 'Toronto',
    Australia: 'Sydney',
    Germany: 'Berlin',
    France: 'Paris',
    'United Arab Emirates': 'Dubai',
    'Saudi Arabia': 'Riyadh'
  };

  return (
    <main className={`page two-col location-page ${form.country.toLowerCase().replace(/\s+/g, '-')}`}>
      <section>
        <div className="page-heading compact-heading"><div><h1>Set Location</h1><p>Save delivery details for cart, demo payment, and invoice records.</p></div></div>
        <div className="country-select">
          <label>Country</label>
          <div className="country-select-inner">
            {(countryFlagPng(form.country)) ? (
              <span className="flag-pin" aria-hidden>
                <span className="flag-head">
                  <img src={countryFlagPng(form.country)} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = countryFlagSvg(form.country); }} alt={`${form.country} flag`} className="flag-img" />
                </span>
              </span>
            ) : (
              <span className="flag-emoji" aria-hidden>{countryToFlag(form.country)}</span>
            )}
              <select value={form.country} onChange={e => {
                const c = e.target.value;
                const selectedCountryData = Object.values(countriesData).find(country => country.name === c);
                
                if (selectedCountryData) {
                  const regions = Object.keys(selectedCountryData.regions || {});
                  const r = regions[0] || '';
                  const ctObj = selectedCountryData.regions[r]?.[0] || { name: '', zipcode: '' };
                  
                  setForm({ 
                    ...form, 
                    country: c, 
                    region: r, 
                    city: ctObj.name, 
                    zipcode: ctObj.zipcode || '' 
                  });
                  
                  // Update currency immediately
                  console.log('Changing currency to:', selectedCountryData.currency_code);
                  setGlobalCurrency(selectedCountryData.currency_code);// Make sure rates are updated
                }
              }}>
              {Object.values(countriesData).map(country => (
                <option key={country.id} value={country.name}>
                  {country.name}
                </option>
              ))}
          </select>
          </div>
        </div>

        <div className="division-select">
          <label>Region</label>
              <select value={form.region} onChange={e => {
                const r = e.target.value;
                const selectedCountryData = Object.values(countriesData).find(country => country.name === form.country);
                const cities = selectedCountryData?.regions[r] || [];
                const ctObj = cities[0] || { name: '', zipcode: '' };
                setForm({ ...form, region: r, city: ctObj.name, zipcode: ctObj.zipcode || '' });
              }}>
            {regionList.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="location-grid">
          {Array.from(
            new Map(cityList.map(city => [city.name, city])).values()
          ).map((cityObj, index) => {
            const isHead = headOfficesMap[form.country] === cityObj.name;
            const isDhaka = cityObj.name === 'Dhaka';
            return (
              <button key={`${cityObj.name}-${index}`} className={form.city === cityObj.name ? 'active' : ''} onClick={() => setForm({ ...form, city: cityObj.name, zipcode: cityObj.zipcode || '' })}>
                <MapPin size={20} />
                {cityObj.name}
                {isHead && <span className="head-office">Head Office</span>}
                {(isHead || isDhaka) && <span className="free-delivery">Free delivery</span>}
                <span className="zip-code">ZIP {cityObj.zipcode}</span>
              </button>
            );
          })}
        </div>
      </section>
      <aside className="summary">
        <h2>Delivery Address</h2>
        <form onSubmit={save} className="admin-form">
          <input value={form.street || ''} onChange={e => setForm({ ...form, street: e.target.value })} placeholder="Street address" required />
          <input value={form.city || ''} readOnly placeholder="City" />
          <input value={form.country || ''} readOnly placeholder="Country" />
          <input value={form.zipcode || ''} onChange={e => setForm({ ...form, zipcode: e.target.value })} placeholder="Zip code" />
          <input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" required />
          <button className="primary-btn wide"><MapPin size={18} />Save location</button>
        </form>
      </aside>
    </main>
  );
}

function Support({ notify, user, openLogin }) {
  const [form, setForm] = useState({ subject: 'Support request', message: '' });
  const contactCards = [
    { title: 'Email', value: 'bayazidh383@gmail.com', detail: 'Replies usually arrive within 24 hours.', icon: Mail },
    { title: 'Phone', value: '+86 177 0850 0938', detail: '+880 1798-070234 for order support.', icon: Headphones },
    { title: 'Location', value: 'Guizhou, China', detail: 'Nationwide delivery with selected head office discounts.', icon: MapPin },
  ];
  const team = [
    { 
      name: 'Hussain Danyal ', 
      role: 'Group Leader – Team Alpha', 
      id: '24017EL151',
      image: 'danyal.jpg'  // add image inside /photo/
    },
    { 
      name: 'Hossain Md Bayazid', 
      role: 'Project Developer – Team Alpha', 
      id: '24017EL015',
      image: 'bayazid.png'
    },
    { 
      name: 'Team Alpha', 
      role: 'Design, UI & Collaboration Team', 
      image: 'team-alpha.png'
    }
  ];
  const reviews = [
    { 
      name: 'Nadia Rahman', 
      comment: 'Clean checkout, fast response, and the product comparison helped me decide quickly.', 
      image: 'review1.webp' 
    },
    { 
      name: 'Ayan Karim', 
      comment: 'The cart, invoice, and delivery flow feels simple and reliable for everyday shopping.', 
      image: 'review2.jpg' 
    },
    { 
      name: 'Sara Ahmed', 
      comment: 'Support replied fast and the catalog made it easy to browse across departments.', 
      image: 'review3.jpg' 
    },
    { 
      name: 'Mahim Hassan', 
      comment: 'Very smooth website experience. Fast delivery and accurate product descriptions.', 
      image: 'review4.jpg' 
    },
    { 
      name: 'Fatema Noor', 
      comment: 'The UI design is clean and modern. Loved the comparison feature.', 
      image: 'review5.jpg' 
    },
    { 
      name: 'Rafi Chowdhury', 
      comment: 'ProductBook download is very helpful. Everything works professionally.', 
      image: 'review6.jpg' 
    }
  ];
  async function submit(e) {
    e.preventDefault();
    if (!user) {
      openLogin();
      return;
    }
    const result = await api('/feedback', { method: 'POST', body: JSON.stringify(form) });
    setForm({ subject: 'Support request', message: '' });
    notify(result.message);
  }
  return (
    <main className="page support-page">
      <div className="page-heading compact-heading contact-hero">
        <div>
          <span className="eyebrow">Contact Zicture</span>
          <h1>Support Center</h1>
          <p>Reach the team, review service details, and send feedback from one polished support hub.</p>
        </div>
      </div>
      <section className="contact-card-grid">
        {contactCards.map(card => {
          const Icon = card.icon;
          return (
            <article className="contact-card" key={card.title}>
              <span className="contact-icon"><Icon size={23} /></span>
              <h3>{card.title}</h3>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          );
        })}
      </section>
      <section className="team-section">
        <div className="section-title-row"><div><h2>Developer Team</h2><p>People behind the shopping experience.</p></div></div>
        <div className="team-grid">
          {team.map(member => (
            <article className="team-card" key={member.name}>
              <img src={`/photo/${member.image}`} alt={member.name} />
              <div>
                <h3>{member.name}</h3>
                <p>{member.role}</p>
                {member.id && <span className="member-id">ID: {member.id}</span>}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="reviews-section">
        <div className="section-title-row"><div><h2>Customer Reviews</h2><p>Recent feedback from Zicture shoppers.</p></div></div>
        <div className="review-carousel" aria-label="Customer reviews">
          {reviews.map(review => (
            <article className="review-card" key={review.name}>
              <div className="review-head">
                <img src={`/photo/${review.image}`} alt={review.name} />
                <div>
                  <strong>{review.name}</strong>
                  <span className="review-stars" aria-label="5 out of 5 stars">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} fill="currentColor" />)}</span>
                </div>
              </div>
              <p>{review.comment}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="support-grid">
        <article>
          <Headphones size={24} />
          <h3>Phone</h3>
          <p>Main: +880 1798-070234<br />Support: +880 1853-079398<br />Hours: 9 AM - 9 PM</p>
        </article>
        <article>
          <PenLine size={24} />
          <h3>Email</h3>
          <p>bayazidh383@gmail.com<br />Replies usually arrive within 24 hours.</p>
        </article>
        <article>
          <MapPin size={24} />
          <h3>Location</h3>
          <p>Dhaka, Bangladesh<br />Available nationwide for delivery.</p>
        </article>
        <article>
          <MapPin size={24} />
          <h3>Head Offices</h3>
          <p>
            <strong>Bangladesh</strong>: Magura (Head Office — Free delivery), Dhaka (regional)<br />
            <strong>Pakistan</strong>: Karachi (Head Office — Free delivery), Peshawar (KPK regional)<br />
            <strong>Afghanistan</strong>: Kabul (Head Office — Free delivery), Herat (regional)<br />
            <strong>China</strong>: Guangzhou (Head Office — Free delivery), Shenzhen, Guizhou<br />
            <strong>United States</strong>: New York (Head Office — Free delivery), San Francisco (West Coast)
          </p>
        </article>
      </section>
      <section className="two-col support-form-row">
        <div className="faq-list">
          <h2>FAQ</h2>
          <details open>
            <summary>What are delivery charges?</summary>
            <p>Free delivery for orders above Tk 500 in Dhaka and selected areas.</p>
          </details>
          <details>
            <summary>How do I track my order?</summary>
            <p>The admin panel updates order status from confirmed to processing, shipped, completed, or cancelled.</p>
          </details>
          <details>
            <summary>What is the return policy?</summary>
            <p>This demo project models a seven-day return style support flow.</p>
          </details>
        </div>
        <form onSubmit={submit} className="summary">
          <h2>Send Message</h2>
          <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Subject" required />
          <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="How can we help?" required />
          <button className="primary-btn wide"><Headphones size={18} />Send feedback</button>
        </form>
      </section>
    </main>
  );
}

function Admin({ summary, categories, refresh, notify }) {
  const blankForm = { id: null, name: '', category: 'electronics', price: 0, stock: 10, rating: 4, image: 'Z_Energy_logo.png', description: '', is_daily: false, is_upcoming: false, is_featured: true };
  const [form, setForm] = useState(blankForm);
  const [inventory, setInventory] = useState([]);
  const [adminTab, setAdminTab] = useState('inventory');
  const catKeys = useMemo(() => Object.keys(categories).filter(c => c !== 'all'), [categories]);

  useEffect(() => { api('/products?category=all&sort=new').then(setInventory).catch(notify); }, []);

  async function reloadAdminData() {
    setInventory(await api('/products?category=all&sort=new'));
    refresh();
  }

  async function save(e) {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    await api('/admin/products', { method, body: JSON.stringify(form) });
    notify(form.id ? 'Product updated' : 'Product added');
    setForm(blankForm);
    reloadAdminData();
  }

  function edit(product) {
    setForm({ id: product.id, name: product.name, category: product.category, price: product.price, stock: product.stock, rating: product.rating, image: product.image || 'Z_Energy_logo.png', description: product.description || '', is_daily: Boolean(product.is_daily), is_upcoming: Boolean(product.is_upcoming), is_featured: Boolean(product.is_featured) });
    setAdminTab('editor');
  }

  async function remove(id) {
    const result = await api('/admin/products', { method: 'DELETE', body: JSON.stringify({ id }) });
    notify(result.message);
    reloadAdminData();
  }

  async function updateStatus(orderId, status) {
    await api(`/admin/orders/${orderId}`, { method: 'PUT', body: JSON.stringify({ status }) });
    notify('Order status updated');
    refresh();
  }

  return (
    <main className="page admin-page">
      <div className="page-heading"><div><h1>Admin Panel</h1><p>Control products, prices, stock, orders, customers, support messages, and category sales.</p></div><button className="primary-btn" onClick={() => setAdminTab('editor')}><PackagePlus size={18} />Add product</button></div>
      <section className="stat-grid admin-stat-grid"><b>{summary?.products || 0}<span>Products</span></b><b>{summary?.orders || 0}<span>Orders</span></b><b>{summary?.customers || 0}<span>Customers</span></b><b>{money(summary?.revenue || 0)}<span>Revenue</span></b><b>{summary?.lowStock || 0}<span>Low stock</span></b><b>{summary?.pending || 0}<span>Active orders</span></b></section>
      <section className="admin-tabs">{['inventory', 'editor', 'orders', 'customers', 'feedback', 'sales'].map(tab => <button key={tab} className={adminTab === tab ? 'active' : ''} onClick={() => setAdminTab(tab)}>{tab}</button>)}</section>
      {adminTab === 'inventory' && <div className="table-card"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Flags</th><th>Action</th></tr></thead><tbody>{inventory.map(p => <tr key={p.id}><td><div className="admin-product-cell"><img src={`/photo/${p.image || 'Z_Energy_logo.png'}`} alt="" /><span>{p.name}</span></div></td><td>{p.category}</td><td>{money(p.price)}</td><td><span className={p.stock <= 10 ? 'stock-badge danger-bg' : 'stock-badge'}>{p.stock}</span></td><td><span className="flag-list">{p.is_daily ? 'Daily ' : ''}{p.is_upcoming ? 'Upcoming ' : ''}{p.is_featured ? 'Featured' : ''}</span></td><td><div className="row-actions"><button className="icon-btn" onClick={() => edit(p)} aria-label="Edit product"><Edit3 size={18} /></button><button className="icon-btn danger" onClick={() => remove(p.id)} aria-label="Remove product"><Trash2 size={18} /></button></div></td></tr>)}</tbody></table></div>}
      {adminTab === 'editor' && <section className="editor-panel"><form onSubmit={save} className="admin-form"><h2>{form.id ? 'Edit Product' : 'Add Product'}</h2><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product name" required /><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{catKeys.map(c => <option key={c} value={c}>{categories[c].label}</option>)}</select><div className="form-grid"><input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Price" /><input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="Stock" /><input type="number" min="0" max="5" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} placeholder="Rating" /></div><input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="Image file in photo/" /><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" /><div className="check-grid"><label className="check"><input type="checkbox" checked={form.is_daily} onChange={e => setForm({ ...form, is_daily: e.target.checked })} /> Daily pick</label><label className="check"><input type="checkbox" checked={form.is_upcoming} onChange={e => setForm({ ...form, is_upcoming: e.target.checked })} /> Upcoming</label><label className="check"><input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} /> Featured</label></div><div className="form-actions"><button className="primary-btn"><PackagePlus size={18} />{form.id ? 'Update product' : 'Add product'}</button>{form.id && <button type="button" className="ghost-btn" onClick={() => setForm(blankForm)}>Cancel edit</button>}</div></form></section>}
      {adminTab === 'orders' && <div className="table-card"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Manage</th><th>PDF</th></tr></thead><tbody>{summary?.ordersList?.map(o => <tr key={o.id}><td>#{o.id}</td><td>{o.customer_name || 'Customer'}<br /><small>{o.customer_email}</small></td><td>{money(o.total_price)}</td><td>{o.payment_status}</td><td><span className={`status ${o.status}`}>{o.status}</span></td><td><select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></td><td><a className="download-link" href={`/api/invoice/${o.id}`}><Download size={16} />PDF</a></td></tr>)}</tbody></table></div>}
      {adminTab === 'customers' && <div className="table-card"><table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Provider</th><th>Joined</th></tr></thead><tbody>{summary?.customersList?.map(c => <tr key={c.id}><td>#{c.id}</td><td>{c.name}</td><td>{c.email}</td><td>{c.provider}</td><td>{c.created_at}</td></tr>)}</tbody></table></div>}
      {adminTab === 'feedback' && <div className="table-card"><table><thead><tr><th>From</th><th>Subject</th><th>Message</th><th>Date</th></tr></thead><tbody>{summary?.feedbackList?.map(f => <tr key={f.id}><td>{f.name}<br /><small>{f.email}</small></td><td>{f.subject}</td><td>{f.message}</td><td>{f.created_at}</td></tr>)}</tbody></table></div>}
      {adminTab === 'sales' && <section className="sales-grid">{summary?.categorySales?.length ? summary.categorySales.map(row => <article key={row.category}><BarChart3 size={22} /><h3>{row.category}</h3><strong>{money(row.total)}</strong><span>{row.items} sold items</span></article>) : <div className="empty">No category sales yet.</div>}</section>}
    </main>
  );
}
