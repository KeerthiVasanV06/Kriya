document.addEventListener('DOMContentLoaded', () => {
    // Menu switching logic
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.content-section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.target;

            // Update menu
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');

            // Update sections
            sections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(target).classList.add('active');
        });
    });

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
            document.getElementById('welcome-name').textContent = user.name;

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
            ordersList.innerHTML = data.orders.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-info">
                            <span>Order Placed: <strong>${new Date(order.createdAt).toLocaleDateString()}</strong></span>
                            <span>Order ID: <strong>#${order._id.substring(18).toUpperCase()}</strong></span>
                        </div>
                        <div class="order-status status-${order.status.toLowerCase()}">${order.status}</div>
                    </div>
                    <div class="order-body">
                        ${order.items.map(item => `
                            <div class="order-item">
                                <span class="item-name">${item.title}</span>
                                <span class="item-qty-price">x${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="order-footer">
                        <span>Payment: <strong>${order.paymentMethod}</strong></span>
                        <span class="order-total">Total: ₹${order.totalAmount.toFixed(2)}</span>
                    </div>
                </div>
            `).join('');
        } else {
            ordersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>You haven't placed any orders yet.</p>
                    <a href="index.html#products" class="btn btn-primary">Browse Products</a>
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
        cartContainer.innerHTML = cart.map(item => {
            const imageStyle = item.image ? `background-image: url('${item.image}'); background-size: cover;` : item.imageStyle;
            return `
                <div class="cart-item-mini">
                    <div class="placeholder-img" style="${imageStyle}"></div>
                    <div class="cart-item-mini-info">
                        <h4>${item.title}</h4>
                        <p>Qty: ${item.quantity} | ₹${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        cartContainer.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
    }
}

// Handle Profile Update
const profileForm = document.getElementById('profile-form');
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = profileForm.querySelector('.btn-save');
        const status = document.getElementById('profile-status');

        btn.disabled = true;
        btn.innerHTML = 'Saving... <i class="fas fa-spinner fa-spin"></i>';

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
                status.innerHTML = '<p style="color: #2e8b57; margin-top: 10px;"><i class="fas fa-check-circle"></i> Address saved successfully!</p>';
                // Update global currentUser in main.js if needed, but since we are on a new page, it will refresh next time
            } else {
                status.innerHTML = `<p style="color: #d9534f; margin-top: 10px;">${data.message}</p>`;
            }
        } catch (error) {
            console.error('Update profile error:', error);
            status.innerHTML = '<p style="color: #d9534f; margin-top: 10px;">Error saving address.</p>';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>Save Address</span> <i class="fas fa-save"></i>';
            setTimeout(() => status.innerHTML = '', 3000);
        }
    });
}
