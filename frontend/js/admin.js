// Admin Panel JavaScript
const loginScreen = document.getElementById('login-screen');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

// ========== AUTHENTICATION ==========
async function checkAuth() {
    try {
        const response = await fetch('/api/admin/check');
        const data = await response.json();
        if (data.authenticated) {
            showDashboard();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            showDashboard();
        } else {
            showError(data.message || 'Invalid email or password. Please try again.');
        }
    } catch (error) {
        showError('Connection error. Please try again.');
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await fetch('/api/admin/logout', { method: 'POST' });
        location.reload();
    } catch (error) {
        console.error('Logout failed:', error);
    }
});

function showDashboard() {
    loginScreen.style.display = 'none';
    adminDashboard.style.display = 'block';
    loadProducts();
    loadMessages();
    loadOrders();
}

function showError(message) {
    loginError.textContent = message;
    loginError.style.animation = 'shake 0.5s';
    setTimeout(() => {
        loginError.style.animation = '';
    }, 500);
}

// ========== NAVIGATION ==========
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.admin-section');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetSection = btn.dataset.section;

        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === `${targetSection}-section`) {
                section.classList.add('active');
            }
        });
    });
});

// ========== PRODUCTS MANAGEMENT ==========
const addProductBtn = document.getElementById('add-product-btn');
const productFormContainer = document.getElementById('product-form-container');
const productForm = document.getElementById('product-form');
const cancelProductBtn = document.getElementById('cancel-product-btn');
const productsList = document.getElementById('products-list');
const gradientPreview = document.getElementById('gradient-preview');
const imageStyleSelect = document.getElementById('product-image-style');
const productImageInput = document.getElementById('product-image');
const imagePreview = document.getElementById('image-preview');
const fileLabel = document.querySelector('.file-label');

// Show/Hide Product Form
addProductBtn.addEventListener('click', () => {
    productFormContainer.style.display = 'block';
    productFormContainer.scrollIntoView({ behavior: 'smooth' });
});

cancelProductBtn.addEventListener('click', () => {
    productFormContainer.style.display = 'none';
    productForm.reset();
    imagePreview.innerHTML = '';
    updateGradientPreview();
});

// Handle Image Upload with Preview and Drag & Drop
productImageInput.addEventListener('change', handleImageSelect);

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
        validateAndPreviewImage(file);
    }
}

// Drag and Drop
const imageUploadContainer = document.querySelector('.image-upload-container');
imageUploadContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUploadContainer.style.borderColor = '#d4af37';
    imageUploadContainer.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
});

imageUploadContainer.addEventListener('dragleave', () => {
    imageUploadContainer.style.borderColor = '#ddd';
    imageUploadContainer.style.backgroundColor = '';
});

imageUploadContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUploadContainer.style.borderColor = '#ddd';
    imageUploadContainer.style.backgroundColor = '';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        productImageInput.files = files;
        handleImageSelect({ target: { files } });
    }
});

function validateAndPreviewImage(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showNotification('Please upload a valid image file (JPG, PNG, GIF, WebP)', 'error');
        productImageInput.value = '';
        return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showNotification('Image size must be less than 5MB', 'error');
        productImageInput.value = '';
        return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.innerHTML = `
            <div class="preview-wrapper">
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="remove-image" onclick="removeImage()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    productImageInput.value = '';
    imagePreview.innerHTML = '';
}

// Update Gradient Preview
imageStyleSelect.addEventListener('change', updateGradientPreview);

function updateGradientPreview() {
    const style = imageStyleSelect.value;
    gradientPreview.style = style;
}

// Initialize gradient preview
updateGradientPreview();

// Add Product
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Create FormData to handle file upload
    const formData = new FormData();
    formData.append('title', document.getElementById('product-title').value);
    formData.append('description', document.getElementById('product-description').value);
    formData.append('price', parseFloat(document.getElementById('product-price').value));
    formData.append('imageStyle', document.getElementById('product-image-style').value);

    formData.append('isPremium', document.getElementById('product-premium').checked);

    // Add image file if selected
    if (productImageInput.files.length > 0) {
        formData.append('image', productImageInput.files[0]);
    }

    try {
        const response = await fetch('/api/admin/products', {
            method: 'POST',
            body: formData
            // Don't set Content-Type header - browser will set it automatically for multipart/form-data
        });

        const data = await response.json();

        if (data.success) {
            productForm.reset();
            imagePreview.innerHTML = '';
            productFormContainer.style.display = 'none';
            loadProducts();
            showNotification('Product added successfully!', 'success');
        } else {
            showNotification(data.message || 'Error adding product', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error adding product', 'error');
    }
});

// Load Products
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();

        if (data.success) {
            displayProducts(data.products);
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function displayProducts(products) {
    if (products.length === 0) {
        productsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>No products yet. Add your first product!</p>
            </div>
        `;
        return;
    }

    productsList.innerHTML = products.map(product => {
        // Use uploaded image if available, otherwise use gradient
        const imageStyle = product.image ? `background-image: url('${product.image}'); background-size: cover; background-position: center;` : product.imageStyle;

        return `
        <div class="product-item">
            <div class="product-item-image" style="${imageStyle}"></div>
            <div class="product-item-content">
                <h3 class="product-item-title">${product.title}</h3>
                <p class="product-item-description">${product.description}</p>
                <div class="product-item-price">₹${product.price.toFixed(2)}</div>
                ${product.isPremium ? '<div class="premium-badge"><i class="fas fa-star"></i> Premium Item</div>' : ''}
                <div class="product-item-actions">
                    <button class="btn btn-primary btn-sm" onclick="editProduct('${product._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product._id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}

// Delete Product
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const response = await fetch(`/api/admin/products/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            loadProducts();
            showNotification('Product deleted successfully!', 'success');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error deleting product', 'error');
    }
}

// ========== EDIT PRODUCT ==========
const editProductFormContainer = document.getElementById('edit-product-form-container');
const editProductForm = document.getElementById('edit-product-form');
const cancelEditProductBtn = document.getElementById('cancel-edit-product-btn');
const editProductImageInput = document.getElementById('edit-product-image');
const editImagePreview = document.getElementById('edit-image-preview');
const editGradientPreview = document.getElementById('edit-gradient-preview');
const editImageStyleSelect = document.getElementById('edit-product-image-style');
const editCurrentImageContainer = document.getElementById('edit-current-image');

// Edit Product - Load form with existing data
async function editProduct(id) {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();

        if (data.success) {
            const product = data.products.find(p => p._id === id);
            if (product) {
                // Populate form fields
                document.getElementById('edit-product-id').value = product._id;
                document.getElementById('edit-product-title').value = product.title;
                document.getElementById('edit-product-price').value = product.price;
                document.getElementById('edit-product-description').value = product.description;
                document.getElementById('edit-product-image-style').value = product.imageStyle;
                document.getElementById('edit-product-premium').checked = product.isPremium || false;

                // Show current image if exists
                if (product.image) {
                    editCurrentImageContainer.style.display = 'block';
                    document.getElementById('edit-current-image-preview').src = product.image;
                } else {
                    editCurrentImageContainer.style.display = 'none';
                }

                // Clear any new image selections
                editProductImageInput.value = '';
                editImagePreview.innerHTML = '';

                // Update gradient preview
                updateEditGradientPreview();

                // Show edit form
                editProductFormContainer.style.display = 'block';
                editProductFormContainer.scrollIntoView({ behavior: 'smooth' });
            }
        }
    } catch (error) {
        console.error('Error loading product:', error);
        showNotification('Error loading product details', 'error');
    }
}

// Cancel Edit
cancelEditProductBtn.addEventListener('click', () => {
    editProductFormContainer.style.display = 'none';
    editProductForm.reset();
    editImagePreview.innerHTML = '';
    updateEditGradientPreview();
});

// Handle Edit Image Upload
editProductImageInput.addEventListener('change', handleEditImageSelect);

function handleEditImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
        validateAndPreviewEditImage(file);
    }
}

// Edit Drag and Drop
const editImageUploadContainer = document.querySelector('#edit-product-form-container .image-upload-container');
editImageUploadContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    editImageUploadContainer.style.borderColor = '#d4af37';
    editImageUploadContainer.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
});

editImageUploadContainer.addEventListener('dragleave', () => {
    editImageUploadContainer.style.borderColor = '#ddd';
    editImageUploadContainer.style.backgroundColor = '';
});

editImageUploadContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    editImageUploadContainer.style.borderColor = '#ddd';
    editImageUploadContainer.style.backgroundColor = '';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        editProductImageInput.files = files;
        handleEditImageSelect({ target: { files } });
    }
});

function validateAndPreviewEditImage(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showNotification('Please upload a valid image file (JPG, PNG, GIF, WebP)', 'error');
        editProductImageInput.value = '';
        return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        showNotification('Image size must be less than 5MB', 'error');
        editProductImageInput.value = '';
        return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        editImagePreview.innerHTML = `
            <div class="preview-wrapper">
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="remove-image" onclick="removeEditImage()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    };
    reader.readAsDataURL(file);
}

function removeEditImage() {
    editProductImageInput.value = '';
    editImagePreview.innerHTML = '';
}

// Update Edit Gradient Preview
editImageStyleSelect.addEventListener('change', updateEditGradientPreview);

function updateEditGradientPreview() {
    const style = editImageStyleSelect.value;
    editGradientPreview.style = style;
}

// Submit Edit Form
editProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productId = document.getElementById('edit-product-id').value;
    console.log('Editing product with ID:', productId);

    const formData = new FormData();
    const title = document.getElementById('edit-product-title').value;
    const description = document.getElementById('edit-product-description').value;
    const price = document.getElementById('edit-product-price').value;
    const imageStyle = document.getElementById('edit-product-image-style').value;

    formData.append('title', title);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('imageStyle', imageStyle);

    console.log('Form data being sent:', { title, description, price, imageStyle, hasImage: editProductImageInput.files.length > 0 });

    // Add image file if a new one is selected
    if (editProductImageInput.files.length > 0) {
        formData.append('image', editProductImageInput.files[0]);
    }

    formData.append('isPremium', document.getElementById('edit-product-premium').checked);

    try {
        const response = await fetch(`/api/admin/products/${productId}`, {
            method: 'PATCH',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            editProductForm.reset();
            editImagePreview.innerHTML = '';
            editProductFormContainer.style.display = 'none';
            loadProducts();
            showNotification('Product updated successfully!', 'success');
        } else {
            console.error('Server error response:', data);
            showNotification(data.message || 'Error updating product', 'error');
        }
    } catch (error) {
        console.error('Network error:', error);
        showNotification('Network error: ' + error.message, 'error');
    }
});

// ========== MESSAGES MANAGEMENT ==========
const messagesList = document.getElementById('messages-list');
const unreadCountEl = document.getElementById('unread-count');

async function loadMessages() {
    try {
        const response = await fetch('/api/admin/messages');
        const data = await response.json();

        if (data.success) {
            displayMessages(data.messages);
            updateUnreadCount(data.messages);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function displayMessages(messages) {
    if (messages.length === 0) {
        messagesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-envelope-open"></i>
                <p>No messages yet.</p>
            </div>
        `;
        return;
    }

    messagesList.innerHTML = messages.map(msg => `
        <div class="message-item ${msg.read ? '' : 'unread'}">
            <div class="message-header">
                <div class="message-sender">
                    <div class="message-name">
                        ${msg.name}
                        ${!msg.read ? '<span style="color: var(--primary-gold); margin-left: 0.5rem;"><i class="fas fa-circle" style="font-size: 0.5rem;"></i> New</span>' : ''}
                    </div>
                    <div class="message-email">${msg.email}</div>
                </div>
                <div class="message-date">${formatDate(msg.createdAt)}</div>
            </div>
            <div class="message-body">${msg.message}</div>
            <div class="message-actions">
                ${!msg.read ? `<button class="btn btn-success btn-sm" onclick="markAsRead('${msg._id}')">
                    <i class="fas fa-check"></i> Mark as Read
                </button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="deleteMessage('${msg._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function updateUnreadCount(messages) {
    const unreadCount = messages.filter(msg => !msg.read).length;
    unreadCountEl.textContent = unreadCount;
    unreadCountEl.style.display = unreadCount > 0 ? 'block' : 'none';
}

async function markAsRead(id) {
    try {
        const response = await fetch(`/api/admin/messages/${id}`, {
            method: 'PATCH'
        });

        if (response.ok) {
            loadMessages();
            showNotification('Message marked as read', 'success');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteMessage(id) {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
        const response = await fetch(`/api/admin/messages/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            loadMessages();
            showNotification('Message deleted successfully!', 'success');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error deleting message', 'error');
    }
}

// ========== UTILITIES ==========
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ========== ORDERS MANAGEMENT ==========
async function loadOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    try {
        const response = await fetch('/api/admin/orders');
        const data = await response.json();

        if (data.success) {
            displayOrders(data.orders);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrders(orders) {
    const container = document.getElementById('orders-list');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<p class="empty-msg">No orders received yet.</p>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="message-card order-card ${order.status.toLowerCase()}">
            <div class="message-header">
                <div>
                    <h3>${order.customerName}</h3>
                    <p class="time"><i class="far fa-clock"></i> ${new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div class="order-total-badge">₹${order.totalAmount.toFixed(2)}</div>
            </div>
            <div class="message-body">
                <div class="order-details-grid">
                    <div class="detail-group">
                        <p><strong><i class="fas fa-phone"></i> Phone:</strong> <a href="tel:${order.phone}">${order.phone}</a></p>
                        <p><strong><i class="fas fa-credit-card"></i> Payment:</strong> ${order.paymentMethod}</p>
                        ${order.transactionId ? `<p><strong><i class="fas fa-hashtag"></i> Txn ID:</strong> <span class="txn-id">${order.transactionId}</span></p>` : ''}
                        <p><strong><i class="fas fa-info-circle"></i> Status:</strong> <span class="status-badge ${order.status.toLowerCase()}">${order.status}</span></p>
                    </div>
                    <div class="detail-group">
                        <p><strong><i class="fas fa-map-marker-alt"></i> Address:</strong></p>
                        <p class="address-text">${order.address.flat}, ${order.address.area}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}</p>
                        ${order.address.landmark ? `<p class="landmark-text"><strong>Landmark:</strong> ${order.address.landmark}</p>` : ''}
                    </div>
                </div>
                <div class="order-items-list">
                    <h4>Items:</h4>
                    ${order.items.map(item => `
                        <div class="order-item-row">
                            <span>${item.title} x ${item.quantity}</span>
                            <span>₹${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="message-actions">
                ${order.status === 'Pending' ? `
                    <button class="btn btn-success btn-sm" onclick="updateOrderStatus('${order._id}', 'Completed')">
                        <i class="fas fa-check-double"></i> Mark Completed
                    </button>
                ` : ''}
                <button class="btn-icon delete" title="Delete Order" onclick="deleteOrder('${order._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function deleteOrder(id) {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
        const response = await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
            showNotification('Order deleted successfully', 'success');
            loadOrders();
        }
    } catch (error) {
        showNotification('Error deleting order', 'error');
    }
}

async function updateOrderStatus(id, status) {
    try {
        const response = await fetch(`/api/admin/orders/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await response.json();

        if (data.success) {
            showNotification(`Order marked as ${status}`, 'success');
            loadOrders();
        } else {
            showNotification(data.message || 'Error updating status', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error updating order status', 'error');
    }
}
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 50px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);

// Initialize
checkAuth();
