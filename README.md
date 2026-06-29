# Zicture

Zicture is now a full-stack Flask shopping project. The active app uses Python Flask for the backend, MySQL/XAMPP for the database, and React + JavaScript + CSS through Vite for the frontend. The old PHP project was used only as a reference from `Zicture.zip`; PHP is not required for the active app.

## Stack

- Backend: Python, Flask
- Frontend: React, JavaScript, CSS
- Build tooling: Node.js, Vite
- Database: MySQL from XAMPP
- Product media: local `photo/` folder

## Included Features

- Login is required before using the website
- Customer register/login and seeded demo account
- Demo Google-style login
- Admin login and responsive admin dashboard
- Product search, category filter, and sorting
- Large seeded catalog based on the old zip project
- Responsive product cards with price, stock, rating, cart, wishlist, compare, and buy-now actions
- ProductBook catalog view
- Cart quantity controls
- Coupon code `ZICTURE20`
- Demo payment checkout with tax, discount, shipping, and stock reduction
- Delivery location page
- PDF invoice download
- Order history
- Support/contact page with FAQ and feedback form
- Admin product add/edit/delete or disable
- Admin order status updates
- Admin customer list
- Admin support feedback list
- Admin category sales summary

## Database

The app creates or upgrades the `zicture` database automatically when the first `/api/...` request runs.

Tables:

- `users`
- `products`
- `cart`
- `wishlist`
- `compare_items`
- `orders`
- `order_items`
- `feedback`
- `delivery_locations`

Seeded accounts:

```text
Customer: demo@zicture.com / demo123
Admin: admin@zicture.com / admin123
```

If your XAMPP MySQL settings are different, copy `.env.example` to `.env` and edit:

```text
DB_HOST=127.0.0.1
DB_NAME=zicture
DB_USER=root
DB_PASSWORD=
FLASK_SECRET_KEY=change-this-secret
FLASK_HOST=127.0.0.1
FLASK_PORT=5001
```

## Install

Start XAMPP MySQL first, then run:

```powershell
python -m pip install -r requirements.txt
npm.cmd install
```

## Build

```powershell
npm.cmd run build
```

## Run

```powershell
python app.py
```

Open:

```text
http://127.0.0.1:5001
```

## Development

Run Flask in one terminal:

```powershell
python app.py
```

Run Vite hot reload in another terminal:

```powershell
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Notes

- `Zicture.zip` is untouched and remains only as the old project backup/reference.
- Active source files are Flask, React, JavaScript, CSS, and Node/Vite files.
- No active `.php` files are required.
