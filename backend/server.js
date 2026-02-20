require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../frontend/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept only image files
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only image files are allowed.'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));
// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'kriya_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// MongoDB Connection
const mongooseOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Use IPv4 for stability on cloud providers
};

const connectWithRetry = () => {
    console.log('🔄 Attempting to connect to MongoDB...');
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kriya', mongooseOptions)
        .then(() => {
            console.log('✓ Connected to MongoDB');
        })
        .catch(err => {
            console.error('✗ MongoDB connection error:', err.message);
            console.log('🔄 Retrying in 5 seconds...');
            setTimeout(connectWithRetry, 5000);
        });
};

connectWithRetry();

// Log MongoDB connection state
mongoose.connection.on('connected', () => {
    console.log('✓ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('✗ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠ Mongoose disconnected from MongoDB');
});

// Product Schema
const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: null }, // Path to uploaded image
    imageStyle: { type: String, default: 'background: linear-gradient(135deg, #d4af37, #8b5a2b);' }, // Fallback gradient
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Review Schema
const reviewSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    address: {
        pincode: { type: String, default: '' },
        state: { type: String, default: '' },
        city: { type: String, default: '' },
        area: { type: String, default: '' },
        flat: { type: String, default: '' },
        landmark: { type: String, default: '' }
    },
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    address: {
        pincode: { type: String, required: true },
        state: { type: String, required: true },
        city: { type: String, required: true },
        area: { type: String, required: true },
        flat: { type: String, required: true },
        landmark: { type: String }
    },
    items: [
        {
            title: String,
            price: Number,
            quantity: Number
        }
    ],
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, default: 'COD' },
    transactionId: { type: String, default: '' },
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Auth Middleware
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Unauthorized: Admin access required' });
}

function requireAuth(req, res, next) {
    if (req.session && (req.session.userId || req.session.isAdmin)) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Please log in to continue' });
}

// ============= ROUTES =============

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, isAdmin: true });

        if (user && await bcrypt.compare(password, user.password)) {
            req.session.isAdmin = true;
            req.session.userId = user._id;
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

// Admin: Check Auth Status
app.get('/api/admin/check', (req, res) => {
    if (req.session && req.session.isAdmin) {
        res.json({ authenticated: true });
    } else {
        res.json({ authenticated: false });
    }
});

// ============= USER AUTH ROUTES =============

// User Signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });

        await newUser.save();

        // Auto login after signup
        req.session.userId = newUser._id;
        req.session.userName = newUser.name;

        res.json({ success: true, message: 'User registered successfully', user: { name: newUser.name, email: newUser.email } });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Error during registration' });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        req.session.userId = user._id;
        req.session.userName = user.name;
        if (user.isAdmin) req.session.isAdmin = true;

        res.json({ success: true, message: 'Login successful', user: { name: user.name, email: user.email, isAdmin: user.isAdmin } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Error during login' });
    }
});

// User Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ success: false, message: 'Logout failed' });
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Get Current User (Check login status)
app.get('/api/auth/me', async (req, res) => {
    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId).select('-password');
            res.json({
                authenticated: true,
                user: {
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    address: user.address,
                    isAdmin: user.isAdmin
                }
            });
        } catch (error) {
            res.json({ authenticated: false });
        }
    } else if (req.session && req.session.isAdmin) {
        res.json({ authenticated: true, user: { name: 'Admin', isAdmin: true } });
    } else {
        res.json({ authenticated: false });
    }
});

// Update User Profile/Address
app.patch('/api/user/profile', requireAuth, async (req, res) => {
    try {
        const { phone, address } = req.body;
        const userId = req.session.userId;

        if (!userId) return res.status(401).json({ success: false, message: 'Not logged in' });

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { phone, address },
            { new: true }
        ).select('-password');

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Error updating profile' });
    }
});

// Get User Orders
app.get('/api/orders/my-orders', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) return res.status(401).json({ success: false, message: 'Not logged in' });

        const orders = await Order.find({ userId }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching orders' });
    }
});

// Get All Products (Public)
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching products' });
    }
});

// Custom middleware to handle multer errors in POST route
const handlePostUpload = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({ success: false, message: 'File upload error: ' + err.message });
        } else if (err) {
            console.error('File validation error:', err.message);
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
};

// Add Product (Admin Only)
app.post('/api/admin/products', requireAdmin, handlePostUpload, async (req, res) => {
    try {
        const { title, description, price, imageStyle } = req.body;

        // Validate required fields
        if (!title || !description || !price) {
            // Delete uploaded file if validation fails
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Prepare image path if file was uploaded
        let imagePath = null;
        if (req.file) {
            // Store relative path for serving through /uploads
            imagePath = '/uploads/' + req.file.filename;
        }

        const product = new Product({
            title,
            description,
            price: parseFloat(price),
            image: imagePath,
            imageStyle
        });

        await product.save();
        res.json({ success: true, product });
    } catch (error) {
        // Delete uploaded file if saving fails
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        console.error('Error adding product:', error);
        res.status(500).json({ success: false, message: 'Error adding product' });
    }
});

// Delete Product (Admin Only)
app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        // Delete associated image file if it exists
        if (product && product.image) {
            const imagePath = path.join(__dirname, '../frontend', product.image);
            fs.unlink(imagePath, (err) => {
                if (err) console.error('Error deleting image file:', err);
            });
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting product' });
    }
});

// Custom middleware to handle multer errors in PATCH route
const handlePatchUpload = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({ success: false, message: 'File upload error: ' + err.message });
        } else if (err) {
            console.error('File validation error:', err.message);
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
};

// Update Product (Admin Only)
app.patch('/api/admin/products/:id', requireAdmin, handlePatchUpload, async (req, res) => {
    try {
        console.log('Update product request received for ID:', req.params.id);
        console.log('Request body:', req.body);
        console.log('File:', req.file);

        const { title, description, price, imageStyle } = req.body;

        // Validate required fields
        if (!title || !description || !price) {
            console.log('Missing required fields:', { title, description, price });
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Find existing product
        const product = await Product.findById(req.params.id);
        if (!product) {
            console.log('Product not found with ID:', req.params.id);
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Handle image update
        let imagePath = product.image; // Keep existing image by default

        if (req.file) {
            // Delete old image if it exists and a new one is being uploaded
            if (product.image) {
                const oldImagePath = path.join(__dirname, '../frontend', product.image);
                fs.unlink(oldImagePath, (err) => {
                    if (err) console.error('Error deleting old image file:', err);
                });
            }
            // Use new image path
            imagePath = '/uploads/' + req.file.filename;
        }

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            {
                title,
                description,
                price: parseFloat(price),
                image: imagePath,
                imageStyle
            },
            { new: true }
        );

        console.log('Product updated successfully:', updatedProduct._id);
        res.json({ success: true, product: updatedProduct });
    } catch (error) {
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: 'Error updating product' });
    }
});

// Submit Contact Message (Public)
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        const newMessage = new Message({ name, email, message });
        await newMessage.save();
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error sending message' });
    }
});

// Get All Reviews (Public)
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json({ success: true, reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching reviews' });
    }
});

// Submit Review (Public)
app.post('/api/reviews', async (req, res) => {
    try {
        const { name, rating, review } = req.body;

        if (!name || rating === undefined || rating === null) {
            return res.status(400).json({ success: false, message: 'Name and rating are required' });
        }

        const numericRating = parseInt(rating);
        if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be a number between 1 and 5' });
        }

        const newReview = new Review({
            name,
            rating: numericRating,
            review: review || ''
        });

        await newReview.save();
        res.json({ success: true, message: 'Review submitted successfully' });
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ success: false, message: 'Error submitting review' });
    }
});

// Get All Messages (Admin Only)
app.get('/api/admin/messages', requireAdmin, async (req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.json({ success: true, messages });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching messages' });
    }
});

// Mark Message as Read (Admin Only)
app.patch('/api/admin/messages/:id', requireAdmin, async (req, res) => {
    try {
        await Message.findByIdAndUpdate(req.params.id, { read: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating message' });
    }
});

// Delete Message (Admin Only)
app.delete('/api/admin/messages/:id', requireAdmin, async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting message' });
    }
});

// Orders API
app.post('/api/orders', requireAuth, async (req, res) => {
    try {
        const { customerName, phone, address, items, totalAmount, paymentMethod, transactionId } = req.body;

        if (!customerName || !phone || !address || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const newOrder = new Order({
            userId: req.session.userId || null,
            customerName,
            phone,
            address,
            items,
            totalAmount,
            paymentMethod: paymentMethod || 'COD',
            transactionId: transactionId || ''
        });

        await newOrder.save();

        // If logged in user, save address for future use if they don't have one
        if (req.session.userId) {
            const user = await User.findById(req.session.userId);
            if (user && (!user.address || !user.address.pincode)) {
                user.phone = phone;
                user.address = address;
                await user.save();
            }
        }

        res.json({ success: true, message: 'Order placed successfully!', orderId: newOrder._id });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'Error placing order' });
    }
});

// Admin: Get all orders
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching orders' });
    }
});

// Admin: Delete order
app.delete('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Order deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting order' });
    }
});

// Admin: Update order status
app.patch('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating order status' });
    }
});

// Admin: Get dashboard stats
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const pendingOrders = await Order.countDocuments({ status: 'Pending' });
        const unreadMessages = await Message.countDocuments({ read: false });
        res.json({
            success: true,
            stats: {
                pendingOrders,
                unreadMessages
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching stats' });
    }
});

// Serve Frontend Pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/signup.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Global error handler for multer and other errors
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        return res.status(400).json({ success: false, message: 'File upload error: ' + err.message });
    } else if (err) {
        console.error('Request error:', err.message);
        if (err.message && err.message.includes('Invalid file type')) {
            return res.status(400).json({ success: false, message: 'Invalid file type. Only image files are allowed.' });
        }
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
    next();
});

// Bootstrap Admin
async function bootstrapAdmin() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@kriya.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        const existingAdmin = await User.findOne({ isAdmin: true });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            const newAdmin = new User({
                name: 'System Admin',
                email: adminEmail,
                password: hashedPassword,
                isAdmin: true
            });
            await newAdmin.save();
            console.log('✅ Default admin created:', adminEmail);
        }
    } catch (error) {
        console.error('Error bootstrapping admin:', error);
    }
}

const os = require('os');
const getNetworkIP = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
};

app.listen(PORT, '0.0.0.0', () => {
    const networkIP = getNetworkIP();
    const isRender = process.env.RENDER === 'true';
    const displayURL = isRender ? 'https://kriya-kwer.onrender.com' : `http://${networkIP}:${PORT}`;

    console.log('\n🚀 KRIYA Server Setup Complete!');
    console.log('-------------------------------------------');
    console.log(`🏠 Local:   http://localhost:${PORT}`);
    console.log(`🌐 ${isRender ? 'Live' : 'Network'}: ${displayURL}`);
    console.log('-------------------------------------------');
    console.log(`📱 ${isRender ? 'Open on any phone' : 'Scan with your mobile on the same Wi-Fi'}\n`);
    bootstrapAdmin();
});
