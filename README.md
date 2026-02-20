# KRIYA - Premium Hair Oil E-Commerce Website

**🚀 Live Website**: [https://kriya-kwer.onrender.com](https://kriya-kwer.onrender.com)

## 🌿 Overview
A beautiful, nature-themed e-commerce website with secure admin panel for managing products and customer messages.

## ✨ Features

### Public Website
- **Dynamic Product Loading**: Products are loaded from MongoDB database.
- **User Authentication**: Secure signup, login, and personal dashboard for customers.
- **Shopping Cart**: Full cart functionality with localStorage persistence.
- **Direct UPI Payments**: Scan-to-pay QR codes and one-click app redirection for mobile.
- **Contact Form**: Messages are saved to database for admin review.
- **Nature-Themed Animations**: Smooth transitions, floating particles, and elegant effects.
- **PWA Ready**: Installable on mobile devices with a home-screen icon.

### Admin Panel (`/admin`)
- **Secure Dashboard**: Password-protected access for total control.
- **Order Management**: Track orders, view transaction IDs, and update status (Pending/Completed).
- **Real-time Notifications**: Instant popups for new orders when admins are active.
- **Product Management**: Add, update, and delete products with image uploads.
- **Customer Messages**: Read and respond to customer inquiries.
- **Beautiful UI**: Nature-themed with professional, dark-mode elements.

## 🚀 Setup Instructions

### Prerequisites
- Node.js installed
- MongoDB installed and running on `localhost:27017`

### Installation

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment**
   Edit `.env` file in the root directory:
   ```
   MONGODB_URI=mongodb://localhost:27017/kriya
   ADMIN_PASSWORD=admin123
   PORT=3000
   SESSION_SECRET=kriya_secret_key_change_this_in_production
   ```

3. **Start MongoDB**
   Make sure MongoDB is running on your system.

4. **Start the Server**
   ```bash
   cd backend
   npm start
   ```

5. **Access the Website**
   - Main Website: `http://localhost:3000`
   - Admin Panel: `http://localhost:3000/admin`

## 🔐 Default Admin Credentials
- **Password**: `admin123` (configured in `.env` file)

**⚠️ Important**: Change the admin password in the `.env` file before deploying to production!

## 📁 Project Structure
```
KRIYA/
├── backend/
│   ├── server.js          # Express server with MongoDB integration
│   ├── package.json       # Dependencies
│   └── node_modules/
├── frontend/
│   ├── index.html         # Main website
│   ├── admin.html         # Admin panel
│   ├── cart.html          # Shopping cart
│   ├── css/
│   │   ├── style.css      # Main website styles
│   │   └── admin.css      # Admin panel styles
│   └── js/
│       ├── main.js        # Main website logic
│       └── admin.js       # Admin panel logic
├── .env                   # Environment variables
└── README.md
```

## 🎨 Admin Features

### Adding Products
1. Login to admin panel at `/admin`
2. Click "Add New Product"
3. Fill in:
   - Product Title
   - Description
   - Price
   - Choose a gradient style
4. Click "Save Product"

### Managing Messages
- View all customer messages
- Mark messages as read
- Delete messages

## 🌟 Nature-Themed Animations
- Floating leaf particles on login screen
- Smooth fade-in animations for products
- Gradient text animations
- Hover glow effects
- Pulsing background effects
- Button ripple effects

## 🔧 API Endpoints

### Public Routes
- `GET /api/products` - Get all products
- `POST /api/contact` - Submit contact message

### Admin Routes (Authentication Required)
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/check` - Check authentication status
- `POST /api/admin/products` - Add new product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/messages` - Get all messages
- `PATCH /api/admin/messages/:id` - Mark message as read
- `DELETE /api/admin/messages/:id` - Delete message

## 💾 Database Schema

### Orders
```javascript
{
  userId: ObjectId,
  customerName: String,
  phone: String,
  address: { pincode, state, city, area, flat, landmark },
  items: [{ title, price, quantity }],
  totalAmount: Number,
  paymentMethod: String,
  transactionId: String,
  status: String, // 'Pending', 'Completed'
  createdAt: Date
}
```

### Users
```javascript
{
  name: String,
  email: String,
  password: String,
  isAdmin: Boolean,
  phone: String,
  address: Object,
  createdAt: Date
}
```

## 🎯 Technologies Used
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Session Management**: express-session
- **Environment Variables**: dotenv

## 🔒 Security Features
- Session-based authentication
- Password protection for admin panel
- Environment variable configuration
- Secure API endpoints

## 📝 Notes
- Products are dynamically loaded from the database
- No default products in HTML
- Admin can add products with custom gradient backgrounds
- All customer messages are stored in MongoDB
- Cart data is stored in localStorage

---

Made with 🌿 for KRIYA Premium Hair Oil
