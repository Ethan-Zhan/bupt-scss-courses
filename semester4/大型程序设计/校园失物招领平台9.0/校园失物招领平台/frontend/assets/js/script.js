/* =========================
   全局常量与状态管理
   ========================= */
const API_URL = `http://${window.location.hostname}:8000/api`;
const DEFAULT_IMAGE_PATH = 'uploads/background.jpg';

/**
 * 计算字符串的SHA-256哈希值
 * @param {string} str - 输入字符串
 * @returns {Promise<string>} 哈希值
 */
async function sha256(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.prototype.map.call(new Uint8Array(buf), x => (('00' + x.toString(16)).slice(-2))).join('');
}

// 全局状态对象
const state = {
    currentUser: null,
    allItems: new Map(), // 物品详情缓存
    currentChat: {
        lostItemID: null,
        foundItemID: null,
        lostItemOwnerID: null,
        interval: null,
    },
    itemCategories: ['电子产品', '证件', '书籍', '衣物', '钥匙', '其他'],
    mapFilterTarget: null // 地图筛选目标
};

/* =========================
   页面初始化与路由
   ========================= */
/**
 * DOMContentLoaded 页面加载入口，处理认证与页面初始化
 */
document.addEventListener('DOMContentLoaded', () => {
    state.currentUser = JSON.parse(localStorage.getItem('lostFoundUser'));
    const path = window.location.pathname;
    const nonAuthPages = ['/login.html', '/register.html'];
    if (!state.currentUser && !nonAuthPages.some(p => path.endsWith(p))) {
        window.location.href = 'login.html';
        return;
    }
    if (state.currentUser && nonAuthPages.some(p => path.endsWith(p))) {
        window.location.href = 'index.html';
        return;
    }
    const pageInitializers = {
        'login.html': initializeMainPage,
        'register.html': initializeRegisterPage,
        'index.html': initializeMainPage,
        'personal.html': initializePersonalPage,
        'admin.html': initializeAdminPage,
        'chat.html': initializeChatPage,
        'volunteer.html': initializeVolunteerPage,
    };
    const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    if (pageInitializers[currentPage]) {
        pageInitializers[currentPage]();
    }
    if (state.currentUser) {
        setupCommonUI();
    }
});

/* =========================
   地图相关功能
   ========================= */
/**
 * 初始化地图弹窗，绑定点击事件
 */
function initializeMapModal() {
    const modal = document.getElementById('map-modal');
    if (!modal) return;

    const closeBtn = document.getElementById('map-close-btn');
    const areas = document.querySelectorAll('#map-modal area');

    // 备份原始 coords
    areas.forEach(area => {
        area.dataset.originalCoords = area.getAttribute('coords');
    });
    
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    areas.forEach(area => {
        area.addEventListener('click', e => {
            e.preventDefault();
            const building = area.dataset.building;
            
            if (state.mapFilterTarget) {
                // 如果是筛选，则填充到对应的搜索框并触发搜索
                const searchInput = document.getElementById(`search-${state.mapFilterTarget.toLowerCase()}-keyword`);
                if (searchInput) {
                    searchInput.value = building;
                    fetchItems(state.mapFilterTarget);
                }
                state.mapFilterTarget = null; // 重置目标
            } else {
                // 如果是发布，则填充到发布表单的地点输入框
                const locationInput = document.getElementById('publish-location');
                if (locationInput) {
                    locationInput.value = building; 
                }
            }

            modal.classList.add('hidden');
        });
    });
}

/**
 * 为筛选功能打开地图弹窗
 * @param {('Lost'|'Found')} type - 筛选类型
 */
function openMapForFilter(type) {
    state.mapFilterTarget = type; // 设置当前地图的目标为筛选
    openMapAndScale();
}

/**
 * 打开地图并处理缩放
 */
function openMapAndScale() {
    const BASE_WIDTH = 1660;
    const modal = document.getElementById('map-modal');
    const content = document.querySelector('#map-modal .content');
    const img = document.getElementById('campusImg');
    const areas = document.querySelectorAll('#map-modal area');

    modal.classList.remove('hidden');

    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const dpr = window.devicePixelRatio || 1;

        img.style.width = BASE_WIDTH / dpr + 'px';
        content.style.transform = `scale(${1 / dpr})`;
        areas.forEach(area => {
            const raw = area.dataset.originalCoords.split(',').map(n => Math.round(n / dpr));
            area.setAttribute('coords', raw.join(','));
        });
}

/* =========================
   页面初始化函数
   ========================= */
/**
 * 初始化注册页面
 */
function initializeRegisterPage() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

/**
 * 初始化主页面（首页）
 */
function initializeMainPage() {
    fetchNotifications();
    renderFilters('lost');
    renderFilters('found');
    fetchItems('Lost');
    fetchItems('Found');
    
    initializeMapModal();

    document.querySelectorAll('.btn-search').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.closest('button').dataset.type;
            fetchItems(type);
        });
    });

    const publishBtn = document.getElementById('publish-btn');
    if (publishBtn) {
        if (['志愿者', '管理员'].includes(state.currentUser.userRole)) {
            publishBtn.remove();
        } else {
            publishBtn.addEventListener('click', () => openPublishModal());
        }
    }
    
    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'cancel-publish-btn') closeModal('publish-modal');
        if (e.target.id === 'cancel-claim-btn') closeModal('claim-modal');
        if (e.target.id === 'register-form') handleRegister(e);
    });
    document.body.addEventListener('submit', (e) => {
        if (e.target.id === 'publish-form') handlePublish(e);
        if (e.target.id === 'claim-form') handleClaimSubmit(e);
    });

    // 登录页特有逻辑：设置验证码
    if (window.location.pathname.endsWith('login.html')) {
        // 调用新添加的函数
        setupLoginCaptcha(); 
        
        // 确保登录表单的事件监听存在
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    }
}

/**
 * 初始化聊天页面
 */
function initializeChatPage() {
    // 先加载所有物品，保证 openChatModal 能获取到物品详情
    Promise.all([fetchItems('Lost'), fetchItems('Found')]).then(() => {
        fetchUserChats();
        // 检查 URL 参数，自动打开聊天弹窗
        const params = new URLSearchParams(window.location.search);
        const lost = params.get('lost');
        const found = params.get('found');
        if (lost && found) {
            openChatModal(lost, found);
        }
    });
}

/**
 * 初始化个人中心页面
 */
function initializePersonalPage() {
    fetchUserItems();
    if (state.currentUser) {
        document.getElementById('edit-username').value = state.currentUser.username;
        document.getElementById('edit-email').value = state.currentUser.email;
    }
    document.getElementById('edit-info-form').addEventListener('submit', handleEditInfo);
    document.getElementById('edit-item-form').addEventListener('submit', handleItemUpdate);
}

/**
 * 初始化管理员页面
 */
function initializeAdminPage() {
    if (!state.currentUser || state.currentUser.userRole !== '管理员') {
        window.location.href = 'index.html';
        return;
    }
    fetchAdminData('users');
    fetchAdminData('items');
    document.getElementById('edit-user-form').addEventListener('submit', handleUserUpdate);
    document.getElementById('admin-edit-item-form').addEventListener('submit', handleAdminItemUpdate);
}

/**
 * 初始化志愿者页面
 */
function initializeVolunteerPage() {
    if (!['志愿者', '管理员'].includes(state.currentUser.userRole)) {
        window.location.href = 'index.html';
        return;
    }
    fetchItems('Lost', 'volunteer');
    fetchItems('Found', 'volunteer');

    document.querySelectorAll('.btn-search-volunteer').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.closest('button').dataset.type;
            fetchItems(type, 'volunteer');
        });
    });
}

/* =========================
   通用UI与工具函数
   ========================= */
/**
 * 设置通用UI（导航栏、用户菜单、通知等）
 */
function setupCommonUI() {
    if (!state.currentUser) return;

    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) usernameDisplay.textContent = state.currentUser.username;

    const adminLink = document.getElementById('admin-link');
    if (adminLink && state.currentUser.userRole === '管理员') {
        adminLink.classList.remove('hidden');
    }
    const volunteerLink = document.getElementById('volunteer-link');
    if (volunteerLink && ['志愿者', '管理员'].includes(state.currentUser.userRole)) {
        volunteerLink.classList.remove('hidden');
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userMenuDropdown = document.getElementById('user-menu-dropdown');
    if (userMenuBtn && userMenuDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenuDropdown.classList.toggle('hidden');
        });
    }

    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationsPanel = document.getElementById('notifications-panel');
    if (notificationsBtn && notificationsPanel) {
        notificationsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationsPanel.classList.toggle('hidden');
        });
        setInterval(fetchNotifications, 60000); 
    }
    
    const changePasswordLink = document.getElementById('change-password-link');
    if (changePasswordLink) {
        changePasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('change-password-modal');
            if (modal) {
                modal.classList.remove('hidden');
                // 清空表单内容
                const form = document.getElementById('change-password-form');
                if (form) form.reset();
            }
        });
    }
     document.body.addEventListener('click', (e) => {
        if (e.target.id === 'cancel-change-password-btn') closeModal('change-password-modal');
    });
    document.body.addEventListener('submit', (e) => {
        if (e.target.id === 'change-password-form') handleChangePassword(e);
    });

    window.addEventListener('click', (e) => {
        if (userMenuDropdown && userMenuBtn && !userMenuBtn.contains(e.target)) userMenuDropdown.classList.add('hidden');
        if (notificationsPanel && notificationsBtn && !notificationsBtn.contains(e.target)) notificationsPanel.classList.add('hidden');
    });

    // #################### 这是本次修改的核心 ####################
    // 将发送消息的逻辑绑定到对应的事件

    // 1. 聊天表单提交事件（只发送文本）
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', handleSendTextMessage);
    }
    
    // 2. 聊天图片选择事件（选择后立即发送图片）
    const chatImageUpload = document.getElementById('chat-image-upload');
    if (chatImageUpload) {
        chatImageUpload.addEventListener('change', handleSendImageMessage);
    }
    // #########################################################
}

/**
 * 处理修改密码表单提交
 */
async function handleChangePassword(e) {
    e.preventDefault();
    const form = e.target;
    const oldPassword = form.oldPassword.value;
    const newPassword = form.newPassword.value;
    // 新增：获取确认密码的值
    const confirmPassword = form.confirmPassword.value;

    // 新增：在前端检查两次新密码是否一致
    if (newPassword !== confirmPassword) {
        showToast('两次输入的新密码不一致', false);
        return;
    }

    // 移除前端哈希过程，直接发送明文
    try {
        const response = await fetch(`${API_URL}/user/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userID: state.currentUser.userID,
                oldPassword: oldPassword,
                newPassword: newPassword,
                confirmPassword: confirmPassword
            })
        });
        const data = await response.json();
        showToast(data.message, response.ok);
        if (response.ok) {
            closeModal('change-password-modal');
        }
    } catch (err) {
        showToast('修改密码失败，请检查网络', false);
    }
}

/**
 * 登录页验证码生成与刷新
 */
function setupLoginCaptcha() {
    const captchaCanvas = document.getElementById('login-captcha-img');
    if (!captchaCanvas) return;
    captchaCanvas.width = 100;
    captchaCanvas.height = 38;
    const ctx = captchaCanvas.getContext('2d');

    function randomColor() {
        // 随机生成较深的颜色
        const r = Math.floor(Math.random() * 120);
        const g = Math.floor(Math.random() * 120);
        const b = Math.floor(Math.random() * 120);
        return `rgb(${r},${g},${b})`;
    }
    function randomLightColor() {
        // 随机生成较浅的颜色
        const r = 180 + Math.floor(Math.random() * 75);
        const g = 180 + Math.floor(Math.random() * 75);
        const b = 180 + Math.floor(Math.random() * 75);
        return `rgb(${r},${g},${b})`;
    }

    const generateCaptcha = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let captcha = '';
        for (let i = 0; i < 4; i++) {
            captcha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // 清空画布
        ctx.clearRect(0, 0, captchaCanvas.width, captchaCanvas.height);
        // 填充背景
        ctx.fillStyle = randomLightColor();
        ctx.fillRect(0, 0, captchaCanvas.width, captchaCanvas.height);
        // 绘制干扰线
        for (let i = 0; i < 4; i++) {
            ctx.strokeStyle = randomColor();
            ctx.beginPath();
            ctx.moveTo(Math.random() * captchaCanvas.width, Math.random() * captchaCanvas.height);
            ctx.lineTo(Math.random() * captchaCanvas.width, Math.random() * captchaCanvas.height);
            ctx.stroke();
        }
        // 绘制验证码字符
        for (let i = 0; i < captcha.length; i++) {
            ctx.save();
            const fontSize = 22 + Math.floor(Math.random() * 6);
            ctx.font = `${fontSize}px Arial`;
            ctx.fillStyle = randomColor();
            // 随机旋转 -0.25~0.25 弧度
            const angle = (Math.random() - 0.5) * 0.5;
            ctx.translate(18 + i * 20, 28);
            ctx.rotate(angle);
            ctx.fillText(captcha[i], 0, 0);
            ctx.restore();
        }
        // 存储答案
        captchaCanvas.dataset.answer = captcha;
    };
    generateCaptcha();
    captchaCanvas.addEventListener('click', generateCaptcha);
}

/**
 * 显示全局提示消息
 */
function showToast(message, isSuccess = true) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${isSuccess ? 'bg-green-500' : 'bg-red-500'} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

/**
 * 格式化日期为北京时间字符串
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    // 统一转为北京时间（东八区）
    const date = new Date(dateString);
    // 转为北京时间（中国标准时间，UTC+8）
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const beijing = new Date(utc + 8 * 60 * 60000);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
    return beijing.toLocaleDateString('zh-CN', options).replace(/\//g, '-');
}

/**
 * 格式化日期为input控件可用的字符串
 */
function formatDateTimeForInput(dateString) {
    if (!dateString) return '';
    // 统一转为北京时间（东八区）
    const date = new Date(dateString);
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const beijing = new Date(utc + 8 * 60 * 60000);
    return beijing.toISOString().slice(0, 16);
}

/**
 * 关闭指定modal弹窗
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
    if (modalId === 'chat-modal') {
        closeChatModal();
    }
}

/* =========================
   认证与用户相关
   ========================= */
/**
 * 登录表单提交处理
 */
async function handleLogin(e) {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    // 验证码校验（修正id）
    const captchaInput = document.getElementById('login-captcha-input');
    const captchaDisplay = document.getElementById('login-captcha-img');
    if (captchaInput && captchaDisplay) {
        if (captchaInput.value.trim().toLowerCase() !== (captchaDisplay.dataset.answer || '').toLowerCase()) {
            showToast('验证码错误', false);
            captchaDisplay.click && captchaDisplay.click(); // 刷新验证码
            return;
        }
    }
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }) // 只传明文
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('lostFoundUser', JSON.stringify(data.user));
            window.location.href = 'index.html';
        } else {
            showToast(data.message, false);
        }
    } catch (err) {
        showToast('网络错误，登录失败', false);
    }
}

/**
 * 注册表单提交处理
 */
async function handleRegister(e) {
    e.preventDefault();
    const { username, password, confirmPassword, email } = e.target.elements;
    if (password.value !== confirmPassword.value) {
        showRegisterMessage('两次输入的密码不一致', false);
        return;
    }
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: username.value, 
                password: password.value, // 只传明文
                email: email.value 
            })
        });
        const data = await response.json();
        showRegisterMessage(data.message, response.ok);
        if (response.ok) {
            setTimeout(() => window.location.href = 'login.html', 2000);
        }
    } catch (err) {
        showRegisterMessage('网络错误，注册失败', false);
    }
}

/**
 * 注册页面专用消息显示
 */
function showRegisterMessage(message, isSuccess = true) {
    let msgDiv = document.getElementById('register-success-msg');
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'register-success-msg';
        msgDiv.style.marginTop = '16px';
        msgDiv.style.textAlign = 'center';
        const form = document.getElementById('register-form');
        if (form && form.parentNode) {
            form.parentNode.insertBefore(msgDiv, form.nextSibling);
        }
    }
    msgDiv.textContent = message;
    msgDiv.style.background = isSuccess ? '#22c55e' : '#ef4444';
    msgDiv.style.color = '#fff';
    msgDiv.style.padding = '10px 0';
    msgDiv.style.borderRadius = '6px';
    msgDiv.style.fontWeight = 'bold';
    msgDiv.style.fontSize = '1rem';
    msgDiv.style.display = 'block';
}

/**
 * 退出登录
 */
function handleLogout() {
    localStorage.removeItem('lostFoundUser');
    window.location.href = 'login.html';
}

/**
 * 个人信息编辑表单提交
 */
async function handleEditInfo(e) {
    e.preventDefault(); // 阻止表单默认的页面刷新行为
    
    // 从表单获取新的用户名和邮箱
    const newUsername = document.getElementById('edit-username').value;
    const newEmail = document.getElementById('edit-email').value;

    // 检查输入是否为空
    if (!newUsername || !newEmail) {
        showToast('用户名和邮箱不能为空', false);
        return;
    }

    // 构建发送到后端的数据包
    const body = {
        userID: state.currentUser.userID,
        username: newUsername,
        email: newEmail
    };

    try {
        const response = await fetch(`${API_URL}/user/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        showToast(data.message, response.ok); // 显示成功或失败的提示

        if (response.ok) {
            // 如果后端确认修改成功
            // 1. 更新当前页面的状态
            state.currentUser.username = newUsername;
            state.currentUser.email = newEmail;

            // 2. 更新存储在浏览器中的用户信息，以便下次登录时保持最新
            localStorage.setItem('lostFoundUser', JSON.stringify(state.currentUser));

            // 3. 更新右上角导航栏的用户名显示
            if (document.getElementById('username-display')) {
                document.getElementById('username-display').textContent = newUsername;
            }

            // 4. 主动获取一次最新通知，以立即显示“修改成功”的通知
            fetchNotifications();
        }
    } catch (err) {
        showToast('请求失败，请检查网络连接', false);
        console.error('Error updating user info:', err);
    }
}

/* =========================
   数据获取与管理
   ========================= */
/**
 * 获取物品列表
 */
async function fetchItems(type, page = 'main') {
    const keywordInputId = page === 'volunteer' ? `search-${type.toLowerCase()}-keyword` : `search-${type.toLowerCase()}-keyword`;
    const keywordInput = document.getElementById(keywordInputId);
    const keyword = keywordInput ? keywordInput.value : '';
    
    const categoryCheckboxes = document.querySelectorAll(`#${type.toLowerCase()}-category-filters input:checked`);
    const categories = Array.from(categoryCheckboxes).map(cb => `category=${encodeURIComponent(cb.value)}`);
    
    let queryParams = [`type=${type}`, `search=${encodeURIComponent(keyword)}`, ...categories];

    if (page === 'volunteer') {
        queryParams.push(`status=${encodeURIComponent('未找到')}`);
    } else {
        const statusFilter = document.getElementById(`${type.toLowerCase()}-status-filter`);
        if(statusFilter && statusFilter.value) {
            queryParams.push(`status=${encodeURIComponent(statusFilter.value)}`);
        }
    }

    const queryStr = queryParams.join('&');

    try {
        const response = await fetch(`${API_URL}/items?${queryStr}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const items = await response.json();
        items.forEach(item => state.allItems.set(item.ItemID, item));
        
        if (page === 'volunteer') {
            renderVolunteerItems(type, items);
        } else {
            renderItems(type, items);
        }
    } catch (error) {
        console.error(`Error fetching ${type} items:`, error);
        const listElement = document.getElementById(`${type.toLowerCase()}-items-list`);
        if(listElement) listElement.innerHTML = '<p class="text-red-500 p-4 col-span-full text-center">加载物品失败，请检查网络连接。</p>';
    }
}

/**
 * 获取单个物品详情
 */
async function fetchItemDetails(itemID) {
    if (state.allItems.has(itemID)) {
        return state.allItems.get(itemID);
    }
    try {
        await Promise.all([fetchItems('Lost'), fetchItems('Found')]);
        return state.allItems.get(itemID) || null;
    } catch (error) {
        console.error('Failed to fetch item details:', error);
        return null;
    }
}

/**
 * 获取通知列表
 */
async function fetchNotifications() {
    if (!state.currentUser) return;
    try {
        const response = await fetch(`${API_URL}/notifications/${state.currentUser.userID}`);
        const notifications = await response.json();
        renderNotifications(notifications);
    } catch (err) {
        console.error("Failed to fetch notifications:", err);
    }
}

/**
 * 获取用户聊天列表
 */
async function fetchUserChats() {
    if (!state.currentUser) return;
    try {
        const response = await fetch(`${API_URL}/chats?userID=${state.currentUser.userID}`);
        const chats = await response.json();
        renderChatList(chats);
    } catch (error) {
        console.error("Error fetching user chats:", error);
    }
}

/**
 * 获取用户物品列表
 */
async function fetchUserItems(type = null, status = null) {
    if (!state.currentUser) return;
    let url = `${API_URL}/items/user/${state.currentUser.userID}`;
    const params = [];
    if (type) params.push(`type=${type}`);
    if (status) params.push(`status=${status}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        data.forEach(item => state.allItems.set(item.ItemID, item));
        if (window.location.pathname.endsWith('personal.html')) {
             renderUserItems(data);
        }
        return data;
    } catch (error) {
        console.error("Error fetching user items:", error);
        if (window.location.pathname.endsWith('personal.html')) {
            document.getElementById('my-items-list').innerHTML = `<p class="text-red-500">加载失败</p>`;
        }
        return [];
    }
}

/**
 * 获取管理员数据
 */
async function fetchAdminData(type) {
    if (!state.currentUser || state.currentUser.userRole !== '管理员') return;
    try {
        const response = await fetch(`${API_URL}/admin/${type}`);
        const data = await response.json();
        if (type === 'users') {
            renderAdminUsers(data);
        } else if (type === 'items') {
            renderAdminItems(data);
        }
    } catch (error) {
        console.error(`Error fetching admin ${type}:`, error);
    }
}

/* =========================
   管理员相关渲染与操作
   ========================= */
/**
 * 渲染管理员用户表
 */
function renderAdminUsers(users) {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = users.map(user => `
        <tr class="hover:bg-gray-50">
            <td class="p-3 text-sm text-gray-700">${user.UserID}</td>
            <td class="p-3 text-sm text-gray-700">${user.Username}</td>
            <td class="p-3 text-sm text-gray-700">${user.UserRole}</td>
            <td class="p-3 text-sm text-gray-700">${user.Email}</td>
            <td class="p-3 text-sm text-gray-700">${formatDate(user.RegistrationDate)}</td>
            <td class="p-3 text-sm text-gray-700 space-x-2">
                <button class="btn btn-sm btn-secondary" onclick='openEditUserModal(${JSON.stringify(user)})'>编辑</button>
                <button class="btn btn-sm btn-danger" onclick="adminDeleteItem('user', '${user.UserID}')">删除</button>
            </td>
        </tr>
    `).join('');
}

/**
 * 渲染管理员物品表
 */
function renderAdminItems(items) {
    const tableBody = document.getElementById('items-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = items.map(item => `
         <tr class="hover:bg-gray-50">
            <td class="p-3 text-sm text-gray-700">${item.ItemID}</td>
            <td class="p-3 text-sm text-gray-700">${item.ItemName}</td>
            <td class="p-3 text-sm text-gray-700">${item.ItemType}</td>
            <td class="p-3 text-sm text-gray-700">
                <span class="item-status status-${item.ItemStatus.replace(/\s/g, '')}">${item.ItemStatus}</span>
            </td>
            <td class="p-3 text-sm text-gray-700">${item.UserID || 'N/A'}</td>
            <td class="p-3 text-sm text-gray-700 space-x-2">
                <button class="btn btn-sm btn-secondary" onclick='openAdminEditItemModal(${JSON.stringify(item)})'>编辑</button>
                <button class="btn btn-sm btn-danger" onclick="adminDeleteItem('item', '${item.ItemID}')">删除</button>
            </td>
        </tr>
    `).join('');
}

/**
 * 打开管理员物品编辑弹窗
 */
function openAdminEditItemModal(item) {
    document.getElementById('admin-edit-item-id').value = item.ItemID;
    document.getElementById('admin-edit-item-name').value = item.ItemName;
    document.getElementById('admin-edit-item-status').value = item.ItemStatus;
    document.getElementById('admin-edit-item-desc').value = item.Description || '';
    document.getElementById('admin-edit-item-modal').classList.remove('hidden');
}

/**
 * 管理员物品编辑表单提交
 */
async function handleAdminItemUpdate(e) {
    e.preventDefault();
    const form = e.target;
    const itemID = form['admin-edit-item-id'].value;
    
    const body = {
        adminID: state.currentUser.userID,
        itemID: itemID,
        itemName: form['admin-edit-item-name'].value,
        itemStatus: form['admin-edit-item-status'].value,
        description: form['admin-edit-item-desc'].value
    };

    try {
        const response = await fetch(`${API_URL}/admin/item/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        showToast(data.message, response.ok);
        if (response.ok) {
            closeModal('admin-edit-item-modal');
            fetchAdminData('items');
        }
    } catch (err) {
        showToast('更新物品失败', false);
    }
}

/**
 * 管理员删除用户或物品
 */
async function adminDeleteItem(type, id) {
    const typeName = type === 'user' ? '用户' : '物品';
    const confirmMessage = `确定要永久删除这个${typeName}吗？\n\n注意：删除用户将会移除其所有关联数据，此操作不可恢复。`;
    if (!confirm(confirmMessage)) return;

    try {
        const response = await fetch(`${API_URL}/admin/${type}/delete/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminID: state.currentUser.userID })
        });
        const data = await response.json();
        showToast(data.message, response.ok);
        if (response.ok) {
            fetchAdminData(type + 's');
        }
    } catch (err) {
        showToast('删除失败，请检查网络', false);
    }
}

/**
 * 打开管理员用户编辑弹窗
 */
function openEditUserModal(user) {
    document.getElementById('edit-user-id').value = user.UserID;
    document.getElementById('edit-user-username').value = user.Username;
    document.getElementById('edit-user-email').value = user.Email;
    document.getElementById('edit-user-role').value = user.UserRole;
    document.getElementById('edit-user-modal').classList.remove('hidden');
}

/**
 * 管理员用户编辑表单提交
 */
async function handleUserUpdate(e) {
    e.preventDefault();
    const form = e.target;
    const userID = form['edit-user-id'].value;
    const username = form['edit-user-username'].value;
    const email = form['edit-user-email'].value;
    const userRole = form['edit-user-role'].value;

    try {
        const response = await fetch(`${API_URL}/admin/user/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminID: state.currentUser.userID,
                userID: userID,
                username: username,
                email: email,
                userRole: userRole
            })
        });
        const data = await response.json();
        showToast(data.message, response.ok);
        if (response.ok) {
            closeModal('edit-user-modal');
            fetchAdminData('users'); 
        }
    } catch (err) {
        showToast('更新失败', false);
    }
}

/* =========================
   物品与通知渲染
   ========================= */
/**
 * 渲染物品列表
 */
function renderItems(type, items) {
    const listElement = document.getElementById(`${type.toLowerCase()}-items-list`);
    if (!listElement) return;

    if (!items || items.length === 0) {
        listElement.innerHTML = '<p class="text-gray-500 p-4 col-span-full text-center">未找到相关物品。</p>';
        return;
    }
    
    listElement.innerHTML = items.map(item => {
        const isFinder = type === 'Found';
        const canClaim = isFinder && 
                         item.UserID !== state.currentUser.userID && 
                         state.currentUser.userRole === '普通用户' &&
                         item.ItemStatus === '未找到';
        const isMyItem = item.UserID === state.currentUser.userID;
        const imageUrl = item.ImagePath ? `${API_URL.replace('/api', '')}/${item.ImagePath}` : DEFAULT_IMAGE_PATH;

        return `
        <div class="item-card">
            ${isMyItem ? '<div class="my-item-badge">我发布的</div>' : ''}
            <img src="${imageUrl}" alt="${item.ItemName}" class="item-card-image">
            <div class="item-card-content">
                <h3 class="item-card-title">${item.ItemName}</h3>
                <p class="item-card-desc text-sm text-gray-500">${item.Description || '暂无详细描述'}</p>
                <div class="item-card-footer">
                    <span>@${item.posterUsername || '匿名'}</span>
                    <span class="item-status status-${item.ItemStatus.replace(/\s/g, '')}">${item.ItemStatus}</span>
                </div>
            </div>
            <div class="mt-2 flex gap-2">
                <button class="btn btn-sm btn-secondary w-full" onclick="openItemDetailsModal('${item.ItemID}')">
                    <i class="fas fa-eye mr-1"></i>查看详情
                </button>
                ${canClaim ? `<button class="btn btn-accent w-full" onclick="openClaimModal('${item.ItemID}')">认领</button>` : ''}
            </div>
        </div>`}).join('');
}

/**
 * 渲染筛选器
 */
function renderFilters(type) {
    const categoryContainer = document.getElementById(`${type.toLowerCase()}-category-filters`);
    if (!categoryContainer) return;
    // 单选但可取消的radio实现
    categoryContainer.innerHTML = state.itemCategories.map(cat => `
        <div class="filter-options-item">
            <input type="radio" name="filter-${type}-category" id="filter-${type}-${cat}" value="${cat}" onclick="handleCategoryRadioClick(this, '${type}')">
            <label for="filter-${type}-${cat}" style="color: #374151; background-color: #fff;">${cat}</label>
        </div>
    `).join('');
}

// 新增：单选但可取消的radio逻辑
function handleCategoryRadioClick(radio, type) {
    // 如果已选中，再次点击则取消选中
    if (radio.wasChecked) {
        radio.checked = false;
        radio.wasChecked = false;
    } else {
        // 取消同组其它radio的wasChecked
        document.querySelectorAll(`input[name='filter-${type}-category']`).forEach(r => r.wasChecked = false);
        radio.wasChecked = true;
    }
    fetchItems(type === 'lost' ? 'Lost' : 'Found');
}

/**
 * 渲染通知面板
 */
function renderNotifications(notifications) {
    const panel = document.getElementById('notifications-panel');
    const badge = document.getElementById('notification-badge');
    if (!panel || !badge) return;

    const unreadCount = notifications.filter(n => !n.IsRead).length;
    badge.textContent = unreadCount;
    badge.classList.toggle('hidden', unreadCount === 0);

    if (notifications.length === 0) {
        panel.innerHTML = '<p class="p-4 text-center text-gray-500">没有新通知</p>';
        return;
    }

    panel.innerHTML = notifications.map(n => {
        // 判断通知是否是可操作类型（已有按钮）
        const isActionable = ['NewMessage', 'Match'].includes(n.NotificationType);
        // 判断是否是通用通知类型（需要我们添加“标记已读”按钮）
        const isGeneral = !isActionable;

        return `
        <div class="notification-item ${n.IsRead ? '' : 'unread'}" id="notification-${n.NotificationID}">
            <p>${n.Message}</p>
            <small>${formatDate(n.CreationTime)}</small>
            <div class="notification-actions">
                ${isActionable && n.RelatedItemID_1 && n.RelatedItemID_2 ? `
                    <button class="btn btn-sm btn-primary" onclick="handleNotificationClick(event, 'chat', '${n.RelatedItemID_1}', '${n.RelatedItemID_2}', ${n.NotificationID})">进入私聊</button>
                ` : ''}
                ${isGeneral && !n.IsRead ? `
                    <button class="btn btn-sm btn-secondary" onclick="markAsRead(event, ${n.NotificationID})">标记已读</button>
                ` : ''}
            </div>
        </div>
    `}).join('');
}

/**
 * 渲染聊天列表
 */
function renderChatList(chats) {
    const listEl = document.getElementById('chat-list');
    const noChatsMsg = document.getElementById('no-chats-msg');
    if (!listEl || !noChatsMsg) return;

    if (!chats || chats.length === 0) {
        noChatsMsg.classList.remove('hidden');
        listEl.innerHTML = '';
        return;
    }
    
    noChatsMsg.classList.add('hidden');
    listEl.innerHTML = chats.map(chat => `
        <div class="chat-list-item" onclick="openChatModal('${chat.LostItemID}', '${chat.FoundItemID}')">
            <div class="chat-list-avatar">${chat.OtherUsername.charAt(0)}</div>
            <div class="chat-list-info">
                <div class="chat-list-header">
                    <span class="font-bold">${chat.OtherUsername}</span>
                    <span class="text-xs text-gray-500">${formatDate(chat.LastMessageTime)}</span>
                </div>
                <p class="chat-list-preview">${chat.LastMessage.startsWith('uploads/') ? '[图片]' : chat.LastMessage}</p>
                 <small class="text-gray-400">涉及物品: ${chat.LostItemName}</small>
            </div>
        </div>
    `).join('');
}

/**
 * 渲染用户物品列表
 */
function renderUserItems(items) {
    const listElement = document.getElementById('my-items-list');
    const noItemsMsg = document.getElementById('no-items-msg');
    if (!listElement || !noItemsMsg) return;

    if (!items || items.length === 0) {
        noItemsMsg.classList.remove('hidden');
        listElement.innerHTML = '';
        return;
    }

    noItemsMsg.classList.add('hidden');
    listElement.innerHTML = items.map(item => {
        const isEditable = item.ItemStatus !== '已找回';
        const showAiMatchButton = item.ItemStatus === '未找到';

        return `
        <div class="bg-white p-4 rounded-lg shadow-sm border">
            <div class="flex justify-between items-start">
                <h3 class="font-bold text-lg">${item.ItemName} <span class="text-sm font-normal text-gray-500">(${item.ItemType})</span></h3>
                <span class="item-status status-${item.ItemStatus.replace(/\s/g, '')}">${item.ItemStatus}</span>
            </div>
            <p class="text-sm text-gray-600 mt-2"><strong>地点:</strong> ${item.Location || '未提供'}</p>
            <p class="text-sm text-gray-600"><strong>时间:</strong> ${formatDate(item.EventTime)}</p>
            ${item.Description ? `<p class="text-sm text-gray-600 mt-1"><strong>描述:</strong> ${item.Description}</p>` : ''}
            <div class="border-t mt-4 pt-3 flex items-center flex-wrap gap-2">
                <button class="btn btn-sm btn-secondary" ${isEditable ? '' : 'disabled'} onclick='openUserEditItemModal(${JSON.stringify(item)})'>
                    <i class="fas fa-edit mr-1"></i>编辑
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteItem('${item.ItemID}')">
                    <i class="fas fa-trash-alt mr-1"></i>删除
                </button>
                ${showAiMatchButton ? `
                <button class="btn btn-sm btn-accent" onclick="handleAIMatch('${item.ItemID}')">
                    <i class="fas fa-robot mr-1"></i>大模型智能匹配
                </button>
                ` : ''}
                ${item.ItemStatus === '正在联系中' && item.MatchItemID ? `<button class="btn btn-sm btn-primary ml-auto" onclick="openChatModal('${item.ItemType === 'Lost' ? item.ItemID : item.MatchItemID}', '${item.ItemType === 'Found' ? item.ItemID : item.MatchItemID}')">进入私信</button>` : ''}
            </div>
        </div>
    `}).join('');
}

/**
 * 打开用户物品编辑弹窗
 */
function openUserEditItemModal(item) {
    document.getElementById('edit-item-id').value = item.ItemID;
    document.getElementById('edit-item-name').value = item.ItemName;
    document.getElementById('edit-item-status').value = item.ItemStatus;
    document.getElementById('edit-item-color').value = item.Color || '';
    document.getElementById('edit-item-location').value = item.Location || '';
    document.getElementById('edit-item-event-time').value = formatDateTimeForInput(item.EventTime);
    document.getElementById('edit-item-description').value = item.Description || '';
    
    const categorySelect = document.getElementById('edit-item-category');
    categorySelect.innerHTML = state.itemCategories.map(c => `<option value="${c}">${c}</option>`).join('');
    categorySelect.value = item.Category;

    document.getElementById('edit-item-modal').classList.remove('hidden');
}

/* =========================
   个人中心地图选点
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
    // 个人中心地图选点
    const editMapBtn = document.getElementById('edit-map-btn');
    const editMapModal = document.getElementById('edit-map-modal');
    const editMapCloseBtn = document.getElementById('edit-map-close-btn');
    if (editMapBtn && editMapModal && editMapCloseBtn) {
        editMapBtn.addEventListener('click', () => {
            editMapModal.classList.remove('hidden');
        });
        editMapCloseBtn.addEventListener('click', () => {
            editMapModal.classList.add('hidden');
        });
        // 地图区域点击填充地点
        document.querySelectorAll('#edit-map-modal area').forEach(area => {
            area.addEventListener('click', e => {
                e.preventDefault();
                const building = area.dataset.building;
                const locationInput = document.getElementById('edit-item-location');
                if (locationInput) {
                    locationInput.value = building;
                }
                editMapModal.classList.add('hidden');
            });
        });
    }
});

/**
 * 个人中心物品编辑表单提交
 */
async function handleItemUpdate(e) {
    e.preventDefault();
    const form = e.target;
    const itemID = form['edit-item-id'].value;

    const body = {
        userID: state.currentUser.userID,
        itemID: itemID,
        itemName: form.itemName.value,
        itemStatus: form.itemStatus.value,
        category: form.category.value,
        color: form.color.value,
        location: form.location.value,
        eventTime: form.eventTime.value,
        description: form.description.value,
    };

    try {
        const response = await fetch(`${API_URL}/item/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        showToast(data.message, response.ok);
        if (response.ok) {
            closeModal('edit-item-modal');
            fetchUserItems(); 
        }
    } catch (err) {
        showToast('请求失败，请检查网络', false);
    }
}

/* =========================
   聊天功能
   ========================= */
/**
 * 打开聊天弹窗并初始化会话
 */
async function openChatModal(lostItemID, foundItemID) {
    const lostItem = await fetchItemDetails(lostItemID);
    const foundItem = await fetchItemDetails(foundItemID);
    
    if (!lostItem || !foundItem) {
        showToast('无法加载聊天物品信息', false);
        return;
    }
    
    state.currentChat = {
        lostItemID,
        foundItemID,
        lostItemOwnerID: lostItem.UserID,
        interval: state.currentChat.interval,
    };
    
    const modal = document.getElementById('chat-modal');
    modal.classList.remove('hidden');

    if (state.currentChat.interval) clearInterval(state.currentChat.interval);

    const otherUser = lostItem.UserID === state.currentUser.userID ? foundItem.posterUsername : lostItem.posterUsername;
    document.getElementById('chat-title').textContent = `与 ${otherUser || '对方'} 的对话`;
    document.getElementById('chat-item-desc').innerHTML = `关于失物: <strong>${lostItem.ItemName} (ID: ${lostItemID})</strong>`;
    
    const actionsContainer = document.getElementById('chat-actions');
    actionsContainer.innerHTML = ''; 

    if (state.currentUser.userID === state.currentChat.lostItemOwnerID && lostItem.ItemStatus !== '已找回') {
        actionsContainer.innerHTML = `
            <button class="btn btn-accent" onclick="handleResolveChat('found')">确认是我的</button>
            <button class="btn btn-danger" onclick="handleResolveChat('not_found')">这不是我的</button>
        `;
    }

    await fetchAndRenderMessages();
    state.currentChat.interval = setInterval(fetchAndRenderMessages, 8000); 
}

/**
 * 关闭聊天弹窗
 */
function closeChatModal() {
    if (state.currentChat.interval) {
        clearInterval(state.currentChat.interval);
    }
    state.currentChat = { interval: null }; 
    const modal = document.getElementById('chat-modal');
    if (modal) modal.classList.add('hidden');
}

/**
 * 插入图片上传中的占位消息
 */
function insertImageUploadingPlaceholder(isSelf = true) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return null;
    // 生成唯一 id
    const loadingId = 'img-loading-' + Date.now() + '-' + Math.floor(Math.random()*10000);
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isSelf ? 'chat-bubble-sent' : 'chat-bubble-received'}`;
    bubble.id = loadingId;
    bubble.innerHTML = `<span class="chat-image-loading">图片上传中...</span>`;
    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return loadingId;
}

/**
 * 替换图片上传占位为图片或失败
 */
function replaceImageUploadingPlaceholder(loadingId, imgUrl, isSuccess = true) {
    const bubble = document.getElementById(loadingId);
    if (!bubble) return;
    if (isSuccess && imgUrl) {
        bubble.innerHTML = `<img src="${imgUrl}" alt="聊天的图片" class="chat-image" onclick="window.open(this.src)">`;
    } else {
        bubble.innerHTML = `<span class='chat-image-fail'>图片上传失败</span>`;
    }
}

/**
 * 拉取并渲染消息列表
 */
async function fetchAndRenderMessages() {
    const { lostItemID, foundItemID } = state.currentChat;
    if (!lostItemID || !foundItemID) return;

    try {
        const response = await fetch(`${API_URL}/messages/${lostItemID}/${foundItemID}`);
        const messages = await response.json();
        renderMessages(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        showToast('消息加载失败', false);
        closeChatModal();
    }
}

/**
 * 渲染消息气泡
 */
function renderMessages(messages) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = messages.map(msg => {
        const isImage = msg.Content.startsWith('uploads/');
        const bubbleContent = isImage 
            ? `<img src="${API_URL.replace('/api', '')}/${msg.Content}" alt="聊天的图片" class="chat-image" onclick="window.open(this.src)">`
            : `<p>${msg.Content}</p>`;

        return `
            <div class="chat-bubble ${msg.SenderID === state.currentUser.userID ? 'chat-bubble-sent' : 'chat-bubble-received'}">
                ${bubbleContent}
            </div>
        `;
    }).join('');
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * 通用的发送消息函数，支持文本和图片
 */
async function sendChatMessage(content = null, imageFile = null) {
    // 必须有文本或图片之一
    if (!content && !imageFile) {
        return;
    }

    const { lostItemID, foundItemID } = state.currentChat;
    if (!lostItemID || !foundItemID) {
        showToast('无法发送消息：不在聊天会话中', false);
        return;
    }

    const formData = new FormData();
    formData.append('senderID', state.currentUser.userID);
    formData.append('lostItemID', lostItemID);
    formData.append('foundItemID', foundItemID);
    formData.append('content', content || ''); // 后端需要 content 字段
    if (imageFile) {
        formData.append('image', imageFile);
    }

    let loadingId = null;
    if (imageFile) {
        loadingId = insertImageUploadingPlaceholder(true);
    }

    try {
        const response = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (response.ok) {
            // 如果发送的是图片，则用返回的图片 URL 替换 loading 占位
            if (loadingId && data.content && data.content.startsWith('uploads/')) {
                const imgUrl = `${API_URL.replace('/api', '')}/${data.content}`;
                replaceImageUploadingPlaceholder(loadingId, imgUrl, true);
            } else if (loadingId) {
                // 如果是其他情况（例如，后端逻辑改变），但有 loadingId，则移除它
                document.getElementById(loadingId)?.remove();
            }
            // 重新拉取所有消息以保持同步
            await fetchAndRenderMessages();
        } else {
            // 发送失败，将 loading 占位替换为失败提示
            if (loadingId) replaceImageUploadingPlaceholder(loadingId, null, false);
            showToast(data.message || '消息发送失败', false);
        }
    } catch (error) {
        // 网络或其他错误，同样替换 loading 占位
        if (loadingId) replaceImageUploadingPlaceholder(loadingId, null, false);
        showToast('网络错误，消息发送失败', false);
    }
}

/**
 * 处理文本消息的发送
 */
async function handleSendTextMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    if (!content) return; // 不发送空消息

    await sendChatMessage(content, null);
    input.value = ''; // 发送后清空输入框
}

/**
 * 压缩图片文件
 */
function compressImage(file, options = { quality: 0.99, maxWidth: 1920 }) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const { width, height } = img;
                let newWidth = width;
                let newHeight = height;

                // 如果图片宽度超过最大值，则等比缩放
                if (width > options.maxWidth) {
                    newWidth = options.maxWidth;
                    newHeight = (height * options.maxWidth) / width;
                }

                canvas.width = newWidth;
                canvas.height = newHeight;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                // 将 canvas 内容转换为 blob 对象
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            // 创建一个新的 File 对象
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            reject(new Error('Canvas to Blob conversion failed.'));
                        }
                    },
                    'image/jpeg',
                    options.quality
                );
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

/**
 * 处理图片消息的发送
 */
async function handleSendImageMessage(event) {
    const imageFile = event.target.files[0];
    if (!imageFile) return;

    // -- 新增的压缩步骤 --
    try {
        console.log(`Original image size: ${(imageFile.size / 1024).toFixed(2)} KB`);
        
        // 调用压缩函数，可以调整这里的参数来控制压缩质量和尺寸
        const compressedFile = await compressImage(imageFile, { quality: 1, maxWidth: 1920 });
        
        console.log(`Compressed image size: ${(compressedFile.size / 1024).toFixed(2)} KB`);

        // 使用压缩后的文件发送消息
        await sendChatMessage(null, compressedFile);

    } catch (error) {
        console.error('Image compression failed:', error);
        showToast('图片压缩失败，将尝试发送原图', false);
        // 如果压缩失败，作为备选方案，仍然发送原图
        await sendChatMessage(null, imageFile);
    }
    
    // 清空 file input 的值，以便用户可以连续上传同一张图片
    event.target.value = '';
}

/**
 * 聊天认领结果处理
 */
async function handleResolveChat(action) {
    const confirmMsg = action === 'found' 
        ? '确认这是您丢失的物品吗？此操作将完结对话并标记物品为“已找回”。'
        : '确认这不是您丢失的物品吗？此操作将关闭对话，物品将恢复为可匹配状态。';
    
    if (!confirm(confirmMsg)) return;

    const { lostItemID, foundItemID } = state.currentChat;
    try {
        const response = await fetch(`${API_URL}/chat/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userID: state.currentUser.userID, lostItemID, foundItemID, action })
        });
        const data = await response.json();
        showToast(data.message, data.success);
        if (data.success) {
            closeChatModal();
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                fetchItems('Lost');
                fetchItems('Found');
            } else if (window.location.pathname.includes('chat.html')) {
                fetchUserChats();
            } else if (window.location.pathname.includes('personal.html')) {
                fetchUserItems();
            }
        }
    } catch (error) {
        showToast('操作失败', false);
    }
}

/* =========================
   认领流程
   ========================= */
/**
 * 打开认领弹窗
 */
async function openClaimModal(foundItemID) {
    const foundItem = state.allItems.get(foundItemID);
    const userLostItems = await fetchUserItems('Lost', '未找到');

    const modalContainer = document.getElementById('claim-modal');
    let lostItemsHTML = '';

    if (userLostItems.length > 0) {
        lostItemsHTML = `
            <h4 class="font-semibold text-gray-700 mt-4 mb-2">或者，匹配我发布的失物：</h4>
            <div class="claim-item-list">
                ${userLostItems.map(item => `
                    <label for="lost-item-${item.ItemID}" class="claim-item-label flex items-center cursor-pointer mb-2">
                        <input type="radio" name="matchLostItemID" value="${item.ItemID}" id="lost-item-${item.ItemID}" class="mr-2 w-4 h-4">
                        <div class="claim-item-info">
                            <strong>${item.ItemName}</strong>
                            <small>地点: ${item.Location}</small>
                        </div>
                    </label>
                `).join('')}
            </div>
        `;
    }

    const modalHTML = `
        <div class="modal-content">
            <h3 class="modal-title">认领物品: ${foundItem.ItemName}</h3>
            <p>请选择如何认领此物品。您可以直接与拾主开始私信，或关联一个您已发布的失物信息。</p>
            <form id="claim-form" data-found-item-id="${foundItemID}">
                <input type="hidden" name="foundItemID" value="${foundItemID}">
                 <div class="bg-blue-50 p-3 rounded-md my-4">
                    <label for="direct-claim" class="flex items-center cursor-pointer">
                        <input type="radio" name="matchLostItemID" value="" id="direct-claim" class="mr-3 w-4 h-4" checked>
                        <strong class="text-blue-800">直接认领（不关联我发布的失物）</strong>
                    </label>
                </div>
                ${lostItemsHTML}
                <div class="modal-actions">
                    <button type="button" id="cancel-claim-btn" class="btn btn-secondary">取消</button>
                    <button type="submit" class="btn btn-primary">确认并发起私信</button>
                </div>
            </form>
        </div>
    `;
    modalContainer.innerHTML = modalHTML;
    modalContainer.classList.remove('hidden');
}

/**
 * 认领表单提交处理
 */
async function handleClaimSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const foundItemID = form.dataset.foundItemId;
    const formData = new FormData(form);
    const matchLostItemID = formData.get('matchLostItemID');
    
    try {
        const response = await fetch(`${API_URL}/claim/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userID: state.currentUser.userID,
                foundItemID: foundItemID,
                matchLostItemID: matchLostItemID || null
            })
        });
        const data = await response.json();
        showToast(data.message, data.success);
        if (data.success) {
            closeModal('claim-modal');
            fetchItems('Lost');
            fetchItems('Found');
            openChatModal(data.lostItemID, data.foundItemID);
        }
    } catch(err) {
        showToast('认领请求失败', false);
    }
}

/* =========================
   发布与修改
   ========================= */
/**
 * 打开物品发布弹窗
 */
function openPublishModal() {
    // ============== 新增逻辑：在打开地图前，重置地图筛选目标 ==============
    state.mapFilterTarget = null;
    // ==============================================================
    
    const modalHTML = `
    <div class="modal-content">
        <h3 class="modal-title">发布信息</h3>
        <form id="publish-form">
            <div class="input-group">
                <label>信息类型</label>
                <select name="itemType" class="input-group-input" id="publish-type-select">
                    <option value="Lost">我丢了东西 (Lost)</option>
                    <option value="Found">我捡了东西 (Found)</option>
                </select>
            </div>
            <div class="input-group"><label for="publish-item-name">物品名称</label><input type="text" id="publish-item-name" name="itemName" class="input-group-input" required></div>
            <div class="grid grid-cols-2 gap-4">
                <div class="input-group"><label>分类</label><select name="category" class="input-group-input">${state.itemCategories.map(c => `<option>${c}</option>`).join('')}</select></div>
                <div class="input-group"><label>颜色</label><input type="text" name="color" class="input-group-input"></div>
            </div>
            <div class="input-group">
                <label for="publish-location">地点</label>
                <div class="relative flex items-center">
                    <input type="text" id="publish-location" name="location" class="input-group-input !pr-28" placeholder="可手动输入或从地图选择">
                    <button type="button" id="open-map-btn" class="btn btn-secondary btn-sm absolute right-1.5">
                        <i class="fas fa-map-marked-alt mr-1"></i> 选择
                    </button>
                </div>
            </div>
            <div class="input-group"><label>时间</label><input type="datetime-local" name="eventTime" class="input-group-input" required></div>
            <div class="input-group"><label>特征描述</label><textarea name="description" rows="3" class="input-group-input"></textarea></div>
            <div class="input-group"><label id="image-label">上传图片 (捡到物品必传)</label><input type="file" name="image" class="input-group-input" accept="image/*"></div>
            <div class="modal-actions">
                <button type="button" id="cancel-publish-btn" class="btn btn-secondary">取消</button>
                <button type="submit" class="btn btn-primary">确认发布</button>
            </div>
        </form>
    </div>
    `;
    const modalContainer = document.getElementById('publish-modal');
    modalContainer.innerHTML = modalHTML;
    modalContainer.classList.remove('hidden');
    
    document.getElementById('open-map-btn').addEventListener('click', openMapAndScale);

    document.getElementById('publish-type-select').addEventListener('change', (e) => {
        const label = document.getElementById('image-label');
        if (e.target.value === 'Found') {
            label.textContent = '上传图片 (捡到物品必传)';
        } else {
            label.textContent = '上传图片 (可选)';
        }
    });
}

/**
 * 发布表单提交处理
 */
async function handlePublish(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append('userID', state.currentUser.userID);

    if (formData.get('itemType') === 'Found' && (!formData.get('image') || !formData.get('image').name)) {
        return showToast('捡到物品必须上传图片', false);
    }

    try {
        const response = await fetch(`${API_URL}/items`, { method: 'POST', body: formData });
        const data = await response.json();
        showToast(data.message, response.ok);
        if (response.ok) {
            closeModal('publish-modal');
            fetchItems(formData.get('itemType'));
        }
    } catch(err) {
        showToast('发布失败，请检查网络', false);
    }
}

/* =========================
   志愿者功能
   ========================= */
/**
 * 渲染志愿者物品列表
 */
function renderVolunteerItems(type, items) {
    const listElement = document.getElementById(`${type.toLowerCase()}-items-list`);
    if (!listElement) return;

    if (!items || items.length === 0) {
        listElement.innerHTML = `<p class="text-gray-500 p-4 col-span-full text-center">暂无待处理的${type === 'Lost' ? '失物' : '拾物'}信息。</p>`;
        return;
    }

    listElement.innerHTML = items.map(item => {
        const isMyItem = item.UserID === state.currentUser.userID;
        const imageUrl = item.ImagePath ? `${API_URL.replace('/api', '')}/${item.ImagePath}` : DEFAULT_IMAGE_PATH;
        // 新增：右上角状态角标
        const statusBadge = `<span class="item-status status-${item.ItemStatus.replace(/\s/g, '')} absolute top-2 right-2 text-xs px-2 py-0.5 rounded bg-gray-200">${item.ItemStatus}</span>`;
        return `
        <div class="item-card !shadow-md relative">
            ${statusBadge}
            ${isMyItem ? '<div class="my-item-badge">我发布的</div>' : ''}
            <img src="${imageUrl}" alt="${item.ItemName}" class="item-card-image">
            <div class="item-card-content">
                <h3 class="item-card-title">${item.ItemName}</h3>
                <p class="item-id-prominent">编号: ${item.ItemID}</p>
                <p class="item-card-desc text-sm"><strong>地点:</strong> ${item.Location}</p>
                <div class="item-card-footer">
                    <span>@${item.posterUsername || '匿名'}</span>
                    <span class="text-sm">${formatDate(item.EventTime)}</span>
                </div>
            </div>
            <div class="p-3 bg-gray-50 border-t grid grid-cols-2 gap-2">
                <button class="btn btn-sm btn-secondary" onclick="openItemDetailsModal('${item.ItemID}')">
                    <i class="fas fa-eye mr-2"></i>查看详情
                </button>
                <button class="btn btn-sm btn-accent" onclick="handleAIMatch('${item.ItemID}')">
                    <i class="fas fa-magic mr-2"></i>AI 匹配
                </button>
            </div>
        </div>`;
    }).join('');
}

/**
 * 打开物品详情弹窗
 */
async function openItemDetailsModal(itemID) {
    const item = await fetchItemDetails(itemID);
    if (!item) {
        showToast('无法加载物品详情', false);
        return;
    }

    const modalContainer = document.getElementById('item-details-modal');
    const imageUrl = item.ImagePath ? `${API_URL.replace('/api', '')}/${item.ImagePath}` : DEFAULT_IMAGE_PATH;
    const modalHTML = `
        <div class="modal-content !max-w-2xl">
            <div class="flex justify-between items-start mb-4">
                 <h3 class="modal-title">${item.ItemName}</h3>
                 <span class="item-status status-${item.ItemStatus.replace(/\s/g, '')}">${item.ItemStatus}</span>
            </div>
            <div class="grid md:grid-cols-2 gap-6 mt-4">
                <div class="w-full">
                    <img src="${imageUrl}" alt="${item.ItemName}" class="w-full h-auto max-h-96 object-contain rounded-md bg-gray-100">
                </div>
                <div>
                    <dl>
                        <div class="mb-4">
                            <dt class="font-semibold text-gray-700">物品描述</dt>
                            <dd class="text-gray-600 break-words">${item.Description || '暂无详细描述'}</dd>
                        </div>
                        <div class="mb-4">
                            <dt class="font-semibold text-gray-700">分类</dt>
                            <dd class="text-gray-600">${item.Category || '未分类'}</dd>
                        </div>
                        <div class="mb-4">
                            <dt class="font-semibold text-gray-700">颜色</dt>
                            <dd class="text-gray-600">${item.Color || '未知'}</dd>
                        </div>
                        <div class="mb-4">
                            <dt class="font-semibold text-gray-700">丢失/拾获地点</dt>
                            <dd class="text-gray-600 break-words">${item.Location || '未提供'}</dd>
                        </div>
                        <div class="mb-4">
                            <dt class="font-semibold text-gray-700">丢失/拾获时间</dt>
                            <dd class="text-gray-600">${formatDate(item.EventTime)}</dd>
                        </div>
                        <div class="mb-4">
                            <dt class="font-semibold text-gray-700">发布者</dt>
                            <dd class="text-gray-600">@${item.posterUsername || '匿名'}</dd>
                        </div>
                        <div class="mb-4">
                            <dt class="font-semibold text-gray-700">发布时间</dt>
                            <dd class="text-gray-600">${formatDate(item.PostTime)}</dd>
                        </div>
                    </dl>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary w-full" onclick="closeModal('item-details-modal')">关闭</button>
            </div>
        </div>
    `;
    modalContainer.innerHTML = modalHTML;
    modalContainer.classList.remove('hidden');
}

/**
 * AI 匹配处理
 */
async function handleAIMatch(itemID) { 
    const modal = document.getElementById('ai-match-modal');
    if (!modal) return;
    const listElement = modal.querySelector('#ai-match-list');
    const noMatchMsg = modal.querySelector('#no-ai-match-msg');
    
    listElement.innerHTML = '<div class="text-center p-4">🤖 正在调用大模型进行匹配，请稍候...</div>';
    noMatchMsg.classList.add('hidden');
    modal.classList.remove('hidden');

    // 2. 将原来的 lostItem 改为 sourceItem，代表源物品
    const sourceItem = await fetchItemDetails(itemID);
    if (!sourceItem) {
        showToast('无法加载原始物品信息', false);
        closeModal('ai-match-modal');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/volunteer/match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 3. 修改发送到后端的 body，使用通用的 itemID
            body: JSON.stringify({ itemID: itemID }) 
        });
        const data = await response.json();

        if (data.success) {
            // 4. 将源物品和匹配结果传递给渲染函数
            renderAIMatches(sourceItem, data.matches);
        } else {
            showToast(data.message, false);
            listElement.innerHTML = `<p class="text-red-500 text-center">${data.message}</p>`;
        }
    } catch (err) {
        showToast('AI匹配请求失败', false);
        listElement.innerHTML = `<p class="text-red-500 text-center">请求失败，请检查网络。</p>`;
    }
}

/**
 * 渲染AI匹配结果
 */
function renderAIMatches(sourceItem, matchedItems) {
    const listElement = document.getElementById('ai-match-list');
    const noMatchMsg = document.getElementById('no-ai-match-msg');

    if (!matchedItems || matchedItems.length === 0) {
        listElement.innerHTML = '';
        noMatchMsg.classList.remove('hidden');
        return;
    }
    
    noMatchMsg.classList.add('hidden');
    
    // 2. 根据源物品类型，决定左侧和右侧的标题
    const isSourceLost = sourceItem.ItemType === 'Lost';
    const sourceTitle = isSourceLost ? '失物信息 (源)' : '拾物信息 (源)';
    const matchTitle = isSourceLost ? '匹配到的拾物' : '匹配到的失物';
    const matchTitleColor = isSourceLost ? 'text-green-600' : 'text-blue-600';

    listElement.innerHTML = matchedItems.map(matchedItem => {
        // 3. 确定哪个是失物ID，哪个是拾物ID，以便正确调用 handleVolunteerLink
        const lostItemID = isSourceLost ? sourceItem.ItemID : matchedItem.ItemID;
        const foundItemID = isSourceLost ? matchedItem.ItemID : sourceItem.ItemID;
        const sourceImageUrl = sourceItem.ImagePath ? `${API_URL.replace('/api', '')}/${sourceItem.ImagePath}` : DEFAULT_IMAGE_PATH;
        const matchedImageUrl = matchedItem.ImagePath ? `${API_URL.replace('/api', '')}/${matchedItem.ImagePath}` : DEFAULT_IMAGE_PATH;

        return `
        <div class="border rounded-lg p-4 bg-gray-50">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="border-r pr-4">
                    <h4 class="font-bold text-lg mb-2">${sourceTitle}</h4>
                    <img src="${sourceImageUrl}" class="w-full h-32 object-cover rounded-md mb-2">
                    <p><strong>名称:</strong> ${sourceItem.ItemName}</p>
                    <p><strong>地点:</strong> ${sourceItem.Location || '未提供'}</p>
                    <p><strong>描述:</strong> ${sourceItem.Description || '无'}</p>
                </div>
                <div>
                    <h4 class="font-bold text-lg mb-2 ${matchTitleColor}">${matchTitle}</h4>
                    <img src="${matchedImageUrl}" class="w-full h-32 object-cover rounded-md mb-2">
                    <p><strong>名称:</strong> ${matchedItem.ItemName}</p>
                    <p><strong>地点:</strong> ${matchedItem.Location || '未提供'}</p>
                    <p><strong>描述:</strong> ${matchedItem.Description || '无'}</p>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t flex justify-end items-center gap-3">
                 <button class="btn btn-sm btn-secondary" onclick="openItemDetailsModal('${sourceItem.ItemID}')">
                    <i class="fas fa-eye mr-1"></i> 查看源物品详情
                </button>
                <button class="btn btn-sm btn-secondary" onclick="openItemDetailsModal('${matchedItem.ItemID}')">
                    <i class="fas fa-eye mr-1"></i> 查看匹配物详情
                </button>
                <button class="btn btn-sm btn-primary" onclick="handleVolunteerLink('${lostItemID}', '${foundItemID}')">
                    <i class="fas fa-link mr-1"></i> 确认匹配
                </button>
            </div>
        </div>
    `}).join('');
}

/**
 * 处理志愿者匹配确认
 */
async function handleVolunteerLink(lostItemID, foundItemID) {
    if (!confirm(`您确定要将失物 #${lostItemID} 与拾物 #${foundItemID} 进行匹配吗？系统将通知双方用户。`)) return;

    try {
        const response = await fetch(`${API_URL}/volunteer/link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // 修改：操作者ID现在可以是志愿者或普通用户
                operatorID: state.currentUser.userID,
                lostItemID,
                foundItemID
            })
        });
        const data = await response.json();
        showToast(data.message, data.success);

        if (data.success) {
            closeModal('ai-match-modal');

            // 新增：无论谁操作，成功后都直接打开聊天窗口
            openChatModal(lostItemID, foundItemID);

            // 新增：根据当前页面路径，刷新正确的列表
            if (window.location.pathname.includes('personal.html')) {
                // 如果在个人中心页面，刷新“我发布的物品”列表
                fetchUserItems();
            } else {
                // 如果在其他页面（如志愿者中心），刷新两个主列表
                fetchItems('Lost', 'volunteer');
                fetchItems('Found', 'volunteer');
            }
        }
    } catch (err) {
        showToast('匹配操作失败', false);
        // 打印更详细的错误信息到控制台，方便调试
        console.error("--- Link Error ---", err);
    }
}

/**
 * 手动输入匹配失物ID
 */
function handleManualMatch(foundItemID) {
    const lostItemID = prompt(`请输入您要关联的失物ItemID (L开头的10位编号):`);
    if (lostItemID && lostItemID.toUpperCase().startsWith('L') && lostItemID.length === 10) {
        handleVolunteerLink(lostItemID, foundItemID);
    } else if(lostItemID) {
        alert('无效的失物ID格式。请输入L开头的10位编号。');
    }
}

/**
 * 通用的通知点击处理
 */
function handleNotificationClick(event, type, id1, id2, notificationId) {
    event.preventDefault();
    event.stopPropagation();

    // 关键改动：在执行任何操作前，先调用函数将通知标记为已读
    markAsRead(event, notificationId);

    // 原有的操作：跳转到聊天页面
    if (type === 'chat') {
        window.location.href = `chat.html?lost=${id1}&found=${id2}`;
    }
}

/* =========================
   忘记密码功能
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
    // 为“忘记密码？”链接添加点击事件，用于打开弹窗
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('forgot-password-modal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        });
    }

    // 为“忘记密码”表单添加提交事件
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('fp-username').value;
            const code = document.getElementById('fp-code').value;
            const newPassword = document.getElementById('fp-new-password').value;
            const confirmPassword = document.getElementById('fp-confirm-password').value;
            if (newPassword !== confirmPassword) {
                return showToast('新密码两次输入不一致', false);
            }
            if (newPassword.length < 6) {
                return showToast('新密码长度至少为6个字符', false);
            }
            try {
                const response = await fetch(`${API_URL}/reset-password-with-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        code,
                        newPassword // 只传明文
                    })
                });
                const data = await response.json();
                showToast(data.message, response.ok);
                if (response.ok) {
                    closeModal('forgot-password-modal');
                }
            } catch (err) {
                showToast('重置密码时发生错误', false);
            }
        });
    }

    // --- 弹窗内部按钮的逻辑 ---

    // “获取邮箱”按钮
    const getEmailBtn = document.getElementById('fp-get-email-btn');
    if (getEmailBtn) {
        getEmailBtn.addEventListener('click', async () => {
            const username = document.getElementById('fp-username').value;
            if (!username) return showToast('请输入用户名', false);
            try {
                const response = await fetch(`${API_URL}/get-email-by-username`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                });
                const data = await response.json();
                if (data.success) {
                    document.getElementById('fp-email').value = data.email;
                    document.getElementById('fp-send-code-btn').disabled = false;
                    showToast('已成功获取邮箱的脱敏信息', true);
                } else {
                    showToast(data.message, false);
                }
            } catch (err) {
                showToast('获取邮箱失败', false);
            }
        });
    }

    // “发送验证码”按钮
    const sendCodeBtn = document.getElementById('fp-send-code-btn');
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', async () => {
            const username = document.getElementById('fp-username').value;
            sendCodeBtn.disabled = true;
            sendCodeBtn.textContent = '发送中...';
            try {
                const response = await fetch(`${API_URL}/send-reset-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                });
                const data = await response.json();
                showToast(data.message, data.success);
                let countdown = 60;
                const interval = setInterval(() => {
                    if (countdown <= 0) {
                        clearInterval(interval);
                        sendCodeBtn.disabled = false;
                        sendCodeBtn.textContent = '发送验证码';
                    } else {
                        sendCodeBtn.textContent = `${countdown}s`;
                        countdown--;
                    }
                }, 1000);
            } catch (err) {
                showToast('发送验证码失败', false);
                sendCodeBtn.disabled = false;
                sendCodeBtn.textContent = '发送验证码';
            }
        });
    }
});

/**
 * 标记通知为已读
 */
async function markAsRead(event, notificationId) {
    // 阻止事件冒泡，防止点击后通知面板意外关闭
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const notificationElement = document.getElementById(`notification-${notificationId}`);
    // 如果界面上该通知已经没有 'unread' 标志，说明正在处理或已处理，直接返回避免重复操作
    if (notificationElement && !notificationElement.classList.contains('unread')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/notifications/mark-read/${notificationId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userID: state.currentUser.userID })
        });

        const data = await response.json();

        if (response.ok) {
            // 后端成功返回后，更新前端UI
            if (notificationElement) {
                // 1. 移除未读样式
                notificationElement.classList.remove('unread');
                // 2. 移除“标记已读”按钮（如果存在）
                const button = notificationElement.querySelector('.btn-secondary');
                if (button) {
                    button.remove();
                }
            }

            // 3. 更新通知数量角标
            const badge = document.getElementById('notification-badge');
            let currentCount = parseInt(badge.textContent, 10);
            if (!isNaN(currentCount) && currentCount > 0) {
                currentCount--;
                badge.textContent = currentCount;
                if (currentCount === 0) {
                    badge.classList.add('hidden');
                }
            }
        } else {
            console.error('Failed to mark notification as read:', data.message);
        }
    } catch (err) {
        console.error('Network error while marking notification as read:', err);
    }
}

/**
 * 删除物品
 */
async function deleteItem(itemID) {
    // 弹出确认框，防止用户误操作
    if (!confirm('您确定要删除这条信息吗？此操作不可恢复。')) {
        return; // 如果用户点击“取消”，则不执行任何操作
    }

    try {
        const response = await fetch(`${API_URL}/items/${itemID}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            // 在请求体中发送当前用户的ID，以便后端进行权限验证
            body: JSON.stringify({ userID: state.currentUser.userID })
        });

        const data = await response.json();
        
        // 使用后端返回的消息显示提示
        showToast(data.message, response.ok);

        if (response.ok) {
            // 如果删除成功，调用 fetchUserItems() 函数重新获取并渲染列表
            // 这样被删除的条目就会从界面上消失
            fetchUserItems();
        }

    } catch (err) {
        // 处理网络错误等异常情况
        showToast('请求失败，请检查您的网络连接。', false);
        console.error('Error deleting item:', err);
    }
}