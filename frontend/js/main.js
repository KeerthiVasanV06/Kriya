// Mobile Menu Toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const nav = document.querySelector('.nav');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        nav.classList.toggle('active');
    });
}

// Smooth Scrolling for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        // Only prevent default if it's a hash link on the same page
        const targetId = this.getAttribute('href');
        if (targetId.startsWith('#') && targetId !== '#') {
            e.preventDefault();
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
                if (nav.classList.contains('active')) {
                    nav.classList.remove('active');
                }
            }
        }
    });
});

// Navbar Scroll Effect
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (header) {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
});

// Scroll Animations
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('section').forEach(section => {
    section.classList.add('animate-on-scroll');
    observer.observe(section);
});

// AUTH LOGIC
let currentUser = null;

async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        const authLinks = document.getElementById('auth-links');
        const userProfile = document.getElementById('user-profile');
        const userNameEl = document.getElementById('user-name');
        const adminLink = document.getElementById('admin-menu-link');

        if (data.authenticated) {
            currentUser = data.user;
            if (authLinks) authLinks.style.display = 'none';
            if (userProfile) userProfile.style.display = 'block';
            if (userNameEl) userNameEl.textContent = data.user.name;
            if (adminLink && data.user.isAdmin) {
                adminLink.style.display = 'flex';
                showAdminNotification();
            }

            // Add click listener to user name to go to dashboard
            const userMenuTrigger = document.querySelector('.user-menu-trigger');
            if (userMenuTrigger) {
                userMenuTrigger.style.cursor = 'pointer';
                userMenuTrigger.addEventListener('click', (e) => {
                    if (e.target.closest('.user-dropdown')) return;
                    window.location.href = 'dashboard.html';
                });
            }
        } else {
            currentUser = null;
            if (authLinks) authLinks.style.display = 'flex';
            if (userProfile) userProfile.style.display = 'none';

            // Redirect if on cart page and not logged in
            if (window.location.pathname.includes('cart.html')) {
                window.location.href = `login.html?redirect=cart.html`;
            }
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

async function showAdminNotification() {
    try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();

        if (data.success && data.stats.pendingOrders > 0) {
            const count = data.stats.pendingOrders;
            const notification = document.createElement('div');
            notification.className = 'admin-order-notification';
            notification.innerHTML = `
                <div class="notif-icon">
                    <i class="fas fa-shopping-bag"></i>
                    <span class="pulse"></span>
                </div>
                <div class="notif-content">
                    <p class="notif-title">New Orders Received!</p>
                    <p class="notif-desc">Total ${count} pending order${count > 1 ? 's' : ''}</p>
                </div>
                <div class="notif-arrow">
                    <i class="fas fa-chevron-right"></i>
                </div>
            `;

            notification.onclick = () => {
                window.location.href = 'admin.html';
            };

            document.body.appendChild(notification);

            // Auto-remove after 10 seconds
            setTimeout(() => {
                notification.classList.add('hide');
                setTimeout(() => notification.remove(), 500);
            }, 10000);
        }
    } catch (error) {
        console.error('Error fetching admin stats:', error);
    }
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/auth/logout', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    });
}

function requireLogin(callback) {
    if (!currentUser) {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        window.location.href = `login.html?redirect=${currentPath}`;
        return false;
    }
    return true;
}

// Add event listeners to cart links
document.querySelectorAll('.cart-link').forEach(link => {
    link.addEventListener('click', (e) => {
        if (!currentUser) {
            e.preventDefault();
            window.location.href = `login.html?redirect=cart.html`;
        }
    });
});


// CART LOGIC

// Initialize Cart from LocalStorage
let cart = JSON.parse(localStorage.getItem('kriya_cart')) || [];

// Update Cart Count in Navbar
function updateCartCount() {
    const countElements = document.querySelectorAll('.cart-count');
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    countElements.forEach(el => el.textContent = totalItems);
}

// Save Cart to LocalStorage
function saveCart() {
    localStorage.setItem('kriya_cart', JSON.stringify(cart));
    updateCartCount();
}

// Add to Cart Function (Toggle: add on first click, remove on second)
function addToCart(product) {
    if (!requireLogin()) return;
    const existingIndex = cart.findIndex(item => item.id === product.id);
    const btn = document.querySelector(`button[data-id="${product.id}"]`);

    if (existingIndex !== -1) {
        // Already in cart → remove it
        cart.splice(existingIndex, 1);
        saveCart();
        if (btn) {
            btn.innerHTML = 'Add to Cart';
            btn.classList.remove('added');
        }
    } else {
        // Not in cart → add it
        cart.push({ ...product, quantity: 1 });
        saveCart();
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check"></i> Added';
            btn.classList.add('added');
        }
    }
}

// Remove from Cart
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    renderCart(); // Re-render if on cart page
}

// Update Quantity
function updateQuantity(id, change) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            saveCart();
            renderCart();
        }
    }
}

// Render Cart Items (Cart Page Only)
function renderCart() {
    const container = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');

    if (!container) return; // Not on cart page

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart-message">
                <i class="fas fa-shopping-basket"></i>
                <p>Your cart is empty.</p>
                <a href="index.html#products" class="btn btn-primary">Start Shopping</a>
            </div>
        `;
        subtotalEl.textContent = '₹0.00';
        totalEl.textContent = '₹0.00';
        return;
    }

    container.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        const totalItemPrice = item.price * item.quantity;
        subtotal += totalItemPrice;

        const imageStyle = item.image ? `background-image: url('${item.image}'); background-size: cover; background-position: center;` : item.imageStyle;
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <div class="cart-item-image">
                <div class="placeholder-image" style="${imageStyle}"></div>
            </div>
            <div class="cart-item-details">
                <div class="cart-item-title">${item.title}</div>
                <div class="cart-item-price">₹${item.price.toFixed(2)}</div>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart('${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(itemEl);
    });

    subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    totalEl.textContent = `₹${subtotal.toFixed(2)}`;
}

// ========== LOAD PRODUCTS FROM API ==========
async function loadProducts() {
    const container = document.getElementById('products-container');

    try {
        const response = await fetch('/api/products');
        const data = await response.json();

        if (data.success && data.products.length > 0) {
            displayProducts(data.products);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>No products available at the moment. Check back soon!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading products:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading products. Please refresh the page.</p>
            </div>
        `;
    }
}

function displayProducts(products) {
    const container = document.getElementById('products-container');

    container.innerHTML = products.map((product, index) => {
        const imageStyle = product.image ? `background-image: url('${product.image}'); background-size: cover; background-position: center;` : product.imageStyle;

        return `
        <div class="product-card ${product.isPremium ? 'is-premium' : ''}" style="animation-delay: ${index * 0.1}s">
            ${product.isPremium ? '<div class="best-seller-badge"><i class="fas fa-crown"></i> Best Seller</div>' : ''}
            <div class="product-image">
                <div class="placeholder-image" style="${imageStyle}"></div>
            </div>
            <div class="product-info">
                <h3>${product.title}</h3>
                <p>${product.description}</p>
                <span class="price">₹${product.price.toFixed(2)}</span>
                <div class="product-actions">
                    ${(() => {
                const isInCart = cart.some(item => item.id === product._id);
                return `
                        <button class="btn btn-secondary ${isInCart ? 'added' : ''}" data-id="${product._id}" onclick='addToCart(${JSON.stringify({
                    id: product._id,
                    title: product.title,
                    price: product.price,
                    image: product.image,
                    imageStyle: product.imageStyle
                }).replace(/'/g, "&apos;")})'>
                            ${isInCart ? '<i class="fas fa-check"></i> Added' : 'Add to Cart'}
                        </button>
                        `;
            })()}
                    <button class="btn btn-primary buy-now-btn" onclick='buyNow(${JSON.stringify({
                id: product._id,
                title: product.title,
                price: product.price,
                image: product.image,
                imageStyle: product.imageStyle
            }).replace(/'/g, "&apos;")})'>Buy Now</button>
                </div>
            </div>
        </div>
    `}).join('');
}

// ========== CONTACT FORM ==========
const contactForm = document.getElementById('contact-form');
const contactStatus = document.getElementById('contact-status');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('contact-name').value,
            email: document.getElementById('contact-email').value,
            message: document.getElementById('contact-message').value
        };

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                contactStatus.innerHTML = '<p style="color: var(--success);"><i class="fas fa-check-circle"></i> Message sent successfully! We\'ll get back to you soon.</p>';
                contactForm.reset();
            } else {
                contactStatus.innerHTML = '<p style="color: var(--danger);"><i class="fas fa-exclamation-circle"></i> Error sending message. Please try again.</p>';
            }
        } catch (error) {
            console.error('Error:', error);
            contactStatus.innerHTML = '<p style="color: var(--danger);"><i class="fas fa-exclamation-circle"></i> Error sending message. Please try again.</p>';
        }

        setTimeout(() => {
            contactStatus.innerHTML = '';
        }, 5000);
    });
}

// Initial Calls
async function init() {
    updateCartCount();
    await checkAuth();

    if (document.getElementById('cart-items-container')) {
        renderCart();
    }
    if (document.getElementById('products-container')) {
        loadProducts();
    }

    // Add CSS for admin notification
    const style = document.createElement('style');
    style.textContent = `
        .admin-order-notification {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: white;
            padding: 15px 25px;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 15px;
            cursor: pointer;
            z-index: 9999;
            border-left: 5px solid var(--primary-gold);
            animation: slideInUp 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            transition: all 0.3s ease;
        }

        .admin-order-notification:hover {
            transform: translateY(-5px) scale(1.02);
            box-shadow: 0 15px 50px rgba(0,0,0,0.2);
            background: var(--primary-gold-light);
        }

        .admin-order-notification.hide {
            transform: translateX(120%);
            opacity: 0;
        }

        .notif-icon {
            position: relative;
            font-size: 1.5rem;
            color: var(--primary-gold);
        }

        .pulse {
            position: absolute;
            top: -5px;
            right: -5px;
            width: 10px;
            height: 10px;
            background: #e74c3c;
            border-radius: 50%;
            animation: pulse-red 2s infinite;
        }

        @keyframes pulse-red {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
        }

        .notif-title {
            font-weight: 700;
            color: var(--secondary-green-dark);
            margin: 0;
            font-size: 0.95rem;
        }

        .notif-desc {
            margin: 0;
            color: #666;
            font-size: 0.85rem;
        }

        .notif-arrow {
            color: #ccc;
            margin-left: 5px;
        }

        @keyframes slideInUp {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

init();

// ========== REVIEWS LOGIC ==========
const reviewModal = document.getElementById('review-modal');
const writeReviewBtn = document.getElementById('write-review-btn');
const closeReviewModal = document.querySelector('.close-modal');
const reviewForm = document.getElementById('review-form');
const starInput = document.getElementById('star-input');
const selectedRatingInput = document.getElementById('selected-rating');
const reviewsContainer = document.getElementById('reviews-container');
const reviewStatus = document.getElementById('review-status');

function resetReviewForm() {
    if (reviewForm) reviewForm.reset();
    if (starInput) {
        const stars = starInput.querySelectorAll('i');
        stars.forEach(s => s.classList.remove('active'));
    }
    if (selectedRatingInput) selectedRatingInput.value = '';
    if (reviewStatus) reviewStatus.innerHTML = '';
}

// Open Modal
if (writeReviewBtn && reviewModal) {
    writeReviewBtn.addEventListener('click', () => {
        reviewModal.classList.add('active');
        reviewModal.style.display = 'block';
    });
}

// Universal Modal Close Logic
const allModals = document.querySelectorAll('.modal');
const allCloseBtns = document.querySelectorAll('.close-modal');

allCloseBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                if (!modal.classList.contains('active')) {
                    modal.style.display = 'none';
                }
            }, 300);
        }
    });
});

window.addEventListener('click', (e) => {
    allModals.forEach(modal => {
        if (e.target === modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                if (!modal.classList.contains('active')) {
                    modal.style.display = 'none';
                }
            }, 300);
        }
    });
});

// Star Rating Selection
if (starInput && selectedRatingInput) {
    const stars = starInput.querySelectorAll('i');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = star.dataset.rating;
            selectedRatingInput.value = rating;

            // Update visual state
            stars.forEach(s => {
                if (parseInt(s.dataset.rating) <= parseInt(rating)) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });

        star.addEventListener('mouseover', () => {
            const rating = star.dataset.rating;
            stars.forEach(s => {
                if (parseInt(s.dataset.rating) <= parseInt(rating)) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });

        star.addEventListener('mouseleave', () => {
            const currentRating = selectedRatingInput.value;
            stars.forEach(s => {
                if (currentRating && parseInt(s.dataset.rating) <= parseInt(currentRating)) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
    });
}

// Submit Review
if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('review-name').value;
        const rating = selectedRatingInput ? selectedRatingInput.value : null;
        const review = document.getElementById('review-text').value;

        if (!rating) {
            if (reviewStatus) reviewStatus.innerHTML = '<p style="color: var(--danger);">Please select a rating.</p>';
            return;
        }

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, rating: parseInt(rating), review })
            });

            const data = await response.json();

            if (data.success) {
                // Instantly hide modal as requested
                if (reviewModal) {
                    reviewModal.classList.remove('active');
                    reviewModal.style.display = 'none';
                }
                resetReviewForm();
                loadReviews();
            } else {
                if (reviewStatus) reviewStatus.innerHTML = `<p style="color: var(--danger);">${data.message}</p>`;
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            if (reviewStatus) reviewStatus.innerHTML = '<p style="color: var(--danger);">Error submitting review. Please try again.</p>';
        }
    });
}

// Load and Display Reviews
let allReviews = [];
const REVIEWS_LIMIT = 4;

async function loadReviews() {
    if (!reviewsContainer) return;

    try {
        const response = await fetch('/api/reviews');
        if (!response.ok) throw new Error('Failed to fetch reviews');
        const data = await response.json();

        if (data.success) {
            allReviews = data.reviews;
            const reviewsToShow = allReviews.slice(0, REVIEWS_LIMIT);
            displayReviews(reviewsToShow);
            updateOverallRating(allReviews);

            // Handle See More button
            const seeMoreContainer = document.getElementById('see-more-container');
            if (seeMoreContainer) {
                seeMoreContainer.style.display = allReviews.length > REVIEWS_LIMIT ? 'block' : 'none';
            }
        } else {
            throw new Error(data.message || 'Error loading reviews');
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        reviewsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Unable to load reviews at this time.</p>
            </div>
        `;
    }
}

// See More Button Click
const seeMoreBtn = document.getElementById('see-more-btn');
if (seeMoreBtn) {
    seeMoreBtn.addEventListener('click', () => {
        displayReviews(allReviews);
        document.getElementById('see-more-container').style.display = 'none';
    });
}

function displayReviews(reviews) {
    if (!reviewsContainer) return;

    if (!reviews || reviews.length === 0) {
        reviewsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-slash"></i>
                <p>No reviews yet. Be the first to share your experience!</p>
            </div>
        `;
        return;
    }

    reviewsContainer.innerHTML = reviews.map((rev, index) => {
        const starsHtml = Array.from({ length: 5 }, (_, i) =>
            `<i class="${i < rev.rating ? 'fas' : 'far'} fa-star"></i>`
        ).join('');

        const reviewText = rev.review ? `<p>${rev.review}</p>` : '';

        return `
            <div class="testimonial-card review-card" style="animation-delay: ${index * 0.05}s">
                <div class="review-stars">${starsHtml}</div>
                ${reviewText}
                <div class="author">- ${rev.name}</div>
            </div>
        `;
    }).join('');

    // Trigger animations after injection
    setTimeout(() => {
        const cards = document.querySelectorAll('.review-card');
        cards.forEach(card => card.classList.add('animate'));
    }, 100);
}

function updateOverallRating(reviews) {
    const ratingNumEl = document.querySelector('.rating-number');
    const ratingStarsEl = document.getElementById('overall-stars');
    const ratingCountEl = document.querySelector('.rating-count');

    if (!reviews || reviews.length === 0) {
        if (ratingNumEl) ratingNumEl.textContent = '0.0';
        if (ratingStarsEl) ratingStarsEl.innerHTML = Array.from({ length: 5 }, () => '<i class="far fa-star"></i>').join('');
        if (ratingCountEl) ratingCountEl.textContent = 'Based on 0 reviews';
        return;
    }

    const total = reviews.reduce((sum, rev) => sum + rev.rating, 0);
    const avg = (total / reviews.length).toFixed(1);

    if (ratingNumEl) ratingNumEl.textContent = avg;
    if (ratingCountEl) ratingCountEl.textContent = `Based on ${reviews.length} reviews`;

    if (ratingStarsEl) {
        const fullStars = Math.floor(avg);
        const hasHalf = avg % 1 >= 0.5;
        let starsHtml = '';

        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                starsHtml += '<i class="fas fa-star"></i>';
            } else if (i === fullStars + 1 && hasHalf) {
                starsHtml += '<i class="fas fa-star-half-alt"></i>';
            } else {
                starsHtml += '<i class="far fa-star"></i>';
            }
        }
        ratingStarsEl.innerHTML = starsHtml;
    }
}

// Initial Call for Reviews
if (document.getElementById('results')) {
    loadReviews();
}

// ========== CHECKOUT LOGIC ==========
const checkoutModal = document.getElementById('checkout-modal');
const checkoutForm = document.getElementById('checkout-form');
const checkoutStatus = document.getElementById('checkout-status');
const checkoutItemsList = document.getElementById('checkout-items-list');
const checkoutGrandTotal = document.getElementById('checkout-grand-total');

let currentCheckoutItems = [];

function openCheckout(items) {
    if (!checkoutModal) return;

    currentCheckoutItems = Array.isArray(items) ? items : [items];

    // Pre-fill name if user is logged in
    const nameInput = document.getElementById('checkout-name');
    if (nameInput && currentUser) {
        nameInput.value = currentUser.name;
    }

    // Pre-fill phone, email and address if available
    const phoneInput = document.getElementById('checkout-phone');
    if (phoneInput && currentUser.phone) {
        phoneInput.value = currentUser.phone;
        // Trigger validation UI
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const emailInput = document.getElementById('checkout-email');
    if (emailInput && currentUser.email) {
        emailInput.value = currentUser.email;
        // Trigger validation UI
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (currentUser.address) {
        const addr = currentUser.address;
        if (document.getElementById('checkout-pincode')) document.getElementById('checkout-pincode').value = addr.pincode || '';
        if (document.getElementById('checkout-state')) document.getElementById('checkout-state').value = addr.state || '';
        if (document.getElementById('checkout-city')) document.getElementById('checkout-city').value = addr.city || '';
        if (document.getElementById('checkout-area')) document.getElementById('checkout-area').value = addr.area || '';
        if (document.getElementById('checkout-flat')) document.getElementById('checkout-flat').value = addr.flat || '';
        if (document.getElementById('checkout-landmark')) document.getElementById('checkout-landmark').value = addr.landmark || '';
    }

    // Update Order Summary
    updateCheckoutSummary();

    // Reset payment selection UI
    const upiDetails = document.getElementById('upi-details');
    if (upiDetails) upiDetails.style.display = 'none';

    checkoutModal.classList.add('active');
    checkoutModal.style.display = 'flex';
}

function updateCheckoutSummary() {
    if (!checkoutItemsList || !checkoutGrandTotal) return;

    let total = 0;
    checkoutItemsList.innerHTML = currentCheckoutItems.map(item => {
        const itemTotal = item.price * (item.quantity || 1);
        total += itemTotal;
        return `
            <div class="mini-item">
                <div class="mini-item-info">
                    <span class="mini-item-name">${item.title}</span>
                    <span class="mini-item-qty">Qty: ${item.quantity || 1}</span>
                </div>
                <span class="mini-item-price">₹${itemTotal.toFixed(2)}</span>
            </div>
        `;
    }).join('');

    checkoutGrandTotal.textContent = `₹${total.toFixed(2)}`;

    // Generate QR code if needed
    generateUPIQR(total);
}

function generateUPIQR(amount) {
    const upiId = '7904776199@ptyes';
    const name = 'Kriya&CO';
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=Order%20Payment`;

    // Set mobile deep link
    const payLink = document.getElementById('upi-pay-link');
    if (payLink) {
        payLink.href = upiLink;
        // Fix: Add a check to prevent error on desktop
        payLink.onclick = (e) => {
            // Give it 500ms to open the app, if browser is still here, it might have failed
            const now = Date.now();
            setTimeout(() => {
                if (Date.now() - now < 1000) {
                    alert("If no UPI app opened, please use the QR Code below to scan and pay. This button works best on mobile devices!");
                }
            }, 500);
        };
    }

    // Using a public QR generator API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

    const qrImg = document.getElementById('upi-qr');
    if (qrImg) qrImg.src = qrUrl;
}

// Payment method toggle listeners
document.addEventListener('change', (e) => {
    if (e.target.name === 'payment-method') {
        const upiDetails = document.getElementById('upi-details');
        if (upiDetails) {
            upiDetails.style.display = e.target.value === 'UPI' ? 'block' : 'none';
        }

        const transIdInput = document.getElementById('checkout-transaction-id');
        if (transIdInput) {
            transIdInput.required = e.target.value === 'UPI';
            transIdInput.minLength = 12;
            transIdInput.maxLength = 12;
        }

        // Change submit button text
        const submitBtnText = document.querySelector('.checkout-submit-btn span');
        if (submitBtnText) {
            submitBtnText.textContent = e.target.value === 'UPI' ? 'Confirm Payment & Place Order' : 'Place Order';
        }
    }
});

// "Buy Now" on product cards
function buyNow(product) {
    if (!requireLogin()) return;
    openCheckout({
        ...product,
        quantity: 1
    });
}

// Real-time validation for Checkout
document.addEventListener('input', (e) => {
    if (e.target.id === 'checkout-phone') {
        const phone = e.target.value;
        const tick = document.getElementById('phone-tick');
        const group = e.target.closest('.validation-group');

        // India phone validation: 10 digits, starts with 6-9
        const isValid = /^[6-9]\d{9}$/.test(phone);

        if (isValid) {
            tick.classList.add('visible');
            if (group) {
                group.classList.add('valid');
                group.classList.remove('invalid');
            }
        } else {
            tick.classList.remove('visible');
            if (group && phone.length >= 10) {
                group.classList.add('invalid');
                group.classList.remove('valid');
            } else if (group) {
                group.classList.remove('valid', 'invalid');
            }
        }
    }

    if (e.target.id === 'checkout-email') {
        const email = e.target.value;
        const tick = document.getElementById('email-tick');
        const group = e.target.closest('.validation-group');

        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (isValid) {
            tick.classList.add('visible');
            if (group) {
                group.classList.add('valid');
                group.classList.remove('invalid');
            }
        } else {
            tick.classList.remove('visible');
            if (group && email.length > 5 && email.includes('@')) {
                group.classList.add('invalid');
                group.classList.remove('valid');
            } else if (group) {
                group.classList.remove('valid', 'invalid');
            }
        }
    }
});

// Proceed to Checkout from Cart
function proceedToCheckout() {
    if (!requireLogin()) return;
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    openCheckout(cart);
}

// Handle checkout form submission
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
        const transactionId = document.getElementById('checkout-transaction-id') ? document.getElementById('checkout-transaction-id').value : '';

        const formData = {
            customerName: document.getElementById('checkout-name').value,
            phone: document.getElementById('checkout-phone').value,
            email: document.getElementById('checkout-email') ? document.getElementById('checkout-email').value : '',
            address: {
                pincode: document.getElementById('checkout-pincode').value,
                state: document.getElementById('checkout-state').value,
                city: document.getElementById('checkout-city').value,
                area: document.getElementById('checkout-area').value,
                flat: document.getElementById('checkout-flat').value,
                landmark: document.getElementById('checkout-landmark').value
            },
            items: currentCheckoutItems.map(it => ({
                title: it.title,
                price: it.price,
                quantity: it.quantity || 1
            })),
            totalAmount: parseFloat(checkoutGrandTotal.textContent.replace('₹', '')),
            paymentMethod: paymentMethod,
            transactionId: transactionId
        };

        // Extra validation for UPI
        if (paymentMethod === 'UPI') {
            if (!transactionId || transactionId.length !== 12 || isNaN(transactionId)) {
                checkoutStatus.innerHTML = `<p style="color: var(--danger);"><i class="fas fa-exclamation-circle"></i> Please enter a valid 12-digit UPI Transaction ID</p>`;
                return;
            }
        }

        try {
            const btn = checkoutForm.querySelector('.checkout-submit-btn');
            btn.disabled = true;
            btn.innerHTML = '<span>Processing...</span> <i class="fas fa-spinner fa-spin"></i>';

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                checkoutStatus.innerHTML = `<p style="color: var(--secondary-green);"><i class="fas fa-check-circle"></i> Order placed successfully!</p>`;

                // Clear cart if the order was for the whole cart
                if (JSON.stringify(currentCheckoutItems) === JSON.stringify(cart)) {
                    cart = [];
                    saveCart();
                    renderCart();
                }

                if (formData.paymentMethod === 'UPI') {
                    showOrderSuccess(data.orderId, true);
                } else {
                    showOrderSuccess(data.orderId, false);
                }
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Checkout error:', error);
            checkoutStatus.innerHTML = `<p style="color: var(--danger);">Error placing order. Please try again.</p>`;
            const btn = checkoutForm.querySelector('.checkout-submit-btn');
            btn.disabled = false;
            btn.innerHTML = '<span>Place Order</span> <i class="fas fa-check-circle"></i>';
        }
    });
}

function showOrderSuccess(orderId, isUPI = false) {
    const checkoutBody = document.querySelector('.checkout-grid');
    const modalHeader = document.querySelector('.checkout-modal-content .modal-header-box');
    const modalContent = document.querySelector('.checkout-modal-content');

    if (!checkoutBody || !modalContent) return;

    // Create success view if it doesn't exist
    let successView = modalContent.querySelector('.order-success-view');
    if (!successView) {
        successView = document.createElement('div');
        successView.className = 'order-success-view';
        modalContent.appendChild(successView);
    }

    successView.innerHTML = `
        <div class="success-icon">
            <i class="fas fa-check-circle"></i>
        </div>
        <h3>${isUPI ? 'Payment Submitted!' : 'Thank You!'}</h3>
        <p>${isUPI
            ? 'Your order is currently <strong>Awaiting Verification</strong>. We will check the Transaction ID and update your status shortly.'
            : 'Your order has been placed successfully.'}</p>
        <div class="order-id-badge">Order ID: ${orderId}</div>
        <p class="next-steps">${isUPI
            ? 'You will receive a confirmation call once the payment is verified.'
            : 'We will contact you shortly on your phone number for confirmation.'}</p>
        <button class="btn btn-primary" onclick="closeCheckoutAndReload()">Continue Shopping</button>
    `;

    // Hide header and body, show success
    if (modalHeader) modalHeader.style.display = 'none';
    checkoutBody.style.display = 'none';
    successView.style.display = 'block';

    // Animate success icon
    setTimeout(() => {
        const icon = successView.querySelector('.success-icon i');
        if (icon) icon.style.transform = 'scale(1.2)';
    }, 100);
}

function closeCheckoutAndReload() {
    if (checkoutModal) {
        checkoutModal.classList.remove('active');
        setTimeout(() => {
            checkoutModal.style.display = 'none';

            // Reset modal for next time
            const checkoutBody = document.querySelector('.checkout-grid');
            const modalHeader = document.querySelector('.checkout-modal-content .modal-header-box');
            const successView = document.querySelector('.order-success-view');

            if (modalHeader) modalHeader.style.display = 'block';
            if (checkoutBody) checkoutBody.style.display = 'grid';
            if (successView) successView.style.display = 'none';

            if (checkoutForm) checkoutForm.reset();
            const btn = document.querySelector('.checkout-submit-btn');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>Place Order</span> <i class="fas fa-check-circle"></i>';
            }
            const status = document.getElementById('checkout-status');
            if (status) status.innerHTML = '';

            if (window.location.pathname.includes('cart.html')) {
                window.location.href = 'index.html';
            } else {
                window.location.reload();
            }
        }, 300);
    }
}
