document.addEventListener('DOMContentLoaded', () => {
    // Menu switching logic
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.content-section');

    menuItems.forEach((item, index) => {
        // Add staggered animation delay
        item.style.animationDelay = `${index * 0.1}s`;

        item.addEventListener('click', () => {
            const target = item.dataset.target;

            // Update menu
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');

            // Update sections with animation
            sections.forEach(sec => {
                sec.classList.remove('active');
            });

            const targetSec = document.getElementById(target);
            targetSec.classList.add('active');

            // Re-trigger animations if needed
            if (target === 'orders-section') loadUserOrders();
            if (target === 'cart-section') loadCartPreview();
        });
    });

    // Logout logic for sidebar
    const sidebarLogout = document.getElementById('sidebar-logout');
    if (sidebarLogout) {
        sidebarLogout.addEventListener('click', () => {
            if (typeof logoutUser === 'function') {
                logoutUser();
            } else {
                localStorage.removeItem('kriya_user');
                localStorage.removeItem('kriya_token');
                window.location.href = 'index.html';
            }
        });
    }

    // Initialize data
    initDashboard();
});

async function initDashboard() {
    try {
        // 1. Get user profile
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (data.authenticated) {
            const user = data.user;
            document.getElementById('welcome-name').textContent = user.name.split(' ')[0];

            // Sidebar info
            document.getElementById('sidebar-user-name').textContent = user.name;
            document.getElementById('sidebar-user-email').textContent = user.email;

            // Fill profile form
            if (user.phone) document.getElementById('profile-phone').value = user.phone;
            if (user.address) {
                const addr = user.address;
                document.getElementById('profile-pincode').value = addr.pincode || '';
                document.getElementById('profile-state').value = addr.state || '';
                document.getElementById('profile-city').value = addr.city || '';
                document.getElementById('profile-area').value = addr.area || '';
                document.getElementById('profile-flat').value = addr.flat || '';
                document.getElementById('profile-landmark').value = addr.landmark || '';
            }
        } else {
            window.location.href = 'login.html?redirect=dashboard.html';
            return;
        }

        // 2. Load Orders
        loadUserOrders();

        // 3. Load Cart Preview
        loadCartPreview();

    } catch (error) {
        console.error('Dashboard init error:', error);
    }
}

async function loadUserOrders() {
    const ordersList = document.getElementById('orders-list');
    try {
        const response = await fetch('/api/orders/my-orders');
        const data = await response.json();

        if (data.success && data.orders.length > 0) {
            ordersList.innerHTML = data.orders.map((order, idx) => `
                <div class="order-card-modern" style="animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.15}s forwards; opacity: 0;">
                    <div class="order-header-modern">
                        <div class="order-meta-info">
                            <div class="meta-item">
                                <span class="meta-label">Date</span>
                                <span class="meta-value">${new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Order ID</span>
                                <span class="meta-value">#${order._id.substring(18).toUpperCase()}</span>
                            </div>
                        </div>
                        <div class="order-status-badge status-${order.status.toLowerCase()}">
                            <i class="fas ${order.status === 'Delivered' ? 'fa-check-circle' : 'fa-clock'}"></i>
                            ${order.status}
                        </div>
                    </div>
                    <div class="order-items-modern">
                        ${order.items.map(item => `
                            <div class="order-item-row">
                                <span class="item-name">${item.title}  <small style="color: #999; margin-left:8px;">× ${item.quantity}</small></span>
                                <span class="item-price">₹${(item.price * item.quantity).toFixed(0)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="order-footer-modern">
                        <span class="payment-method"><i class="fas fa-credit-card" style="margin-right: 8px; opacity: 0.5;"></i> ${order.paymentMethod}</span>
                        <div class="order-total-modern">
                            <span style="font-size: 0.8rem; font-weight: 400; color: #999; margin-right: 10px;">Total</span>
                            ₹${order.totalAmount.toFixed(0)}
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            ordersList.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 4rem; color: #f0f0f0; margin-bottom: 20px;"><i class="fas fa-box-open"></i></div>
                    <h3 style="font-family: 'Playfair Display', serif; margin-bottom: 10px;">No Orders Yet</h3>
                    <p style="color: #999; margin-bottom: 30px;">Your wellness journey starts with your first order.</p>
                    <a href="index.html#products" class="btn-premium">Explore Products</a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersList.innerHTML = '<p class="error-msg">Error loading orders. Please try again.</p>';
    }
}

function loadCartPreview() {
    const cartContainer = document.getElementById('dashboard-cart-items');
    const cart = JSON.parse(localStorage.getItem('kriya_cart')) || [];

    if (cart.length > 0) {
        cartContainer.innerHTML = cart.map((item, idx) => {
            const imageStyle = item.image ? `background-image: url('${item.image}')` : (item.imageStyle || '');
            return `
                <div class="cart-item-mini-modern" style="animation: slideUpFade 0.5s ease ${idx * 0.1}s forwards; opacity: 0;">
                    <div class="cart-item-thumb" style="${imageStyle}"></div>
                    <div class="cart-item-info-modern">
                        <h4>${item.title}</h4>
                        <p>Qty: ${item.quantity} | ₹${(item.price * item.quantity).toFixed(0)}</p>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        cartContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <p style="color: #999;">Your cart is empty.</p>
            </div>
        `;
    }
}

// Handle Profile Update
const profileForm = document.getElementById('profile-form');
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = profileForm.querySelector('.btn-save-modern');
        const status = document.getElementById('profile-status');

        btn.disabled = true;
        btn.innerHTML = 'Updating... <i class="fas fa-spinner fa-spin"></i>';

        const formData = {
            phone: document.getElementById('profile-phone').value,
            address: {
                pincode: document.getElementById('profile-pincode').value,
                state: document.getElementById('profile-state').value,
                city: document.getElementById('profile-city').value,
                area: document.getElementById('profile-area').value,
                flat: document.getElementById('profile-flat').value,
                landmark: document.getElementById('profile-landmark').value
            }
        };

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                status.innerHTML = '<div style="background: #e6f7ef; color: #2e8b57; padding: 15px; border-radius: 12px; margin-top: 20px; text-align: center; border: 1px solid #c3e6cb;"><i class="fas fa-check-circle"></i> Profile updated successfully!</div>';
            } else {
                status.innerHTML = `<div style="background: #fff5f5; color: #ff4d4d; padding: 15px; border-radius: 12px; margin-top: 20px; text-align: center; border: 1px solid #ffd1d1;">${data.message}</div>`;
            }
        } catch (error) {
            console.error('Update profile error:', error);
            status.innerHTML = '<div style="background: #fff5f5; color: #ff4d4d; padding: 15px; border-radius: 12px; margin-top: 20px; text-align: center; border: 1px solid #ffd1d1;">Error saving address.</div>';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>Update Information</span> <div class="btn-icon"><i class="fas fa-save"></i></div>';
            setTimeout(() => status.innerHTML = '', 4000);
        }
    });
}
