// Global state
let currentUser = null;
let authToken = null;
let currentVideo = null;
let currentPage = 'home';
let videos = [];
let categories = [];
let adminData = {};

// API Base URL
const API_BASE = window.location.origin;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Check for existing auth token
    authToken = localStorage.getItem('authToken');
    if (authToken) {
        try {
            await loadUserProfile();
        } catch (error) {
            console.error('Error loading user profile:', error);
            logout();
        }
    }

    // Setup event listeners
    setupEventListeners();
    
    // Setup dark mode
    setupDarkMode();
    
    // Load initial data
    await loadHomeData();
    
    // Setup navigation
    setupNavigation();
    
    // Show appropriate UI based on auth state
    updateUI();
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Auth buttons
    document.getElementById('loginBtn')?.addEventListener('click', showLoginModal);
    document.getElementById('registerBtn')?.addEventListener('click', showRegisterModal);
    document.getElementById('homeLoginBtn')?.addEventListener('click', showLoginModal);
    document.getElementById('homeRegisterBtn')?.addEventListener('click', showRegisterModal);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    // User menu
    document.getElementById('userMenuBtn')?.addEventListener('click', toggleUserMenu);
    
    // Dark mode toggle
    document.getElementById('darkModeToggle')?.addEventListener('click', toggleDarkMode);
    
    // Modals
    setupModalEventListeners();
    
    // Forms
    setupFormEventListeners();
    
    // Video-related
    document.getElementById('homeVideosBtn')?.addEventListener('click', () => showPage('videos'));
    document.getElementById('backToVideos')?.addEventListener('click', () => showPage('videos'));
    
    // Admin navigation
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            showAdminSection(section);
        });
    });
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

function setupModalEventListeners() {
    // Login modal
    document.getElementById('closeLoginModal')?.addEventListener('click', closeAllModals);
    document.getElementById('switchToRegister')?.addEventListener('click', () => {
        hideModal('loginModal');
        showModal('registerModal');
    });
    
    // Register modal
    document.getElementById('closeRegisterModal')?.addEventListener('click', closeAllModals);
    document.getElementById('switchToLogin')?.addEventListener('click', () => {
        hideModal('registerModal');
        showModal('loginModal');
    });
    
    // Upload modal
    document.getElementById('closeUploadModal')?.addEventListener('click', closeAllModals);
    
    // Forgot password
    document.getElementById('forgotPasswordBtn')?.addEventListener('click', showForgotPassword);
    
    // Notification
    document.getElementById('closeNotification')?.addEventListener('click', hideNotification);
}

function setupFormEventListeners() {
    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    
    // Upload form
    document.getElementById('uploadForm')?.addEventListener('submit', handleVideoUpload);
    
    // Video search and filters
    document.getElementById('videoSearch')?.addEventListener('input', debounce(handleVideoSearch, 500));
    document.getElementById('categoryFilter')?.addEventListener('change', handleVideoFilter);
    document.getElementById('sortBy')?.addEventListener('change', handleVideoFilter);
}

function setupNavigation() {
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
        const page = e.state?.page || 'home';
        showPage(page);
    });
}

function setupDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.documentElement.classList.add('dark');
    }
}

// Navigation functions
function handleNavigation(e) {
    e.preventDefault();
    const href = e.target.getAttribute('href');
    if (href && href.startsWith('#')) {
        const page = href.substring(1);
        showPage(page);
    }
}

function showPage(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    
    // Show selected page
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
        pageElement.classList.remove('hidden');
        currentPage = page;
        
        // Load page-specific data
        loadPageData(page);
        
        // Update navigation state
        history.pushState({ page }, '', `#${page}`);
        
        // Update active nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${page}`) {
                link.classList.add('active');
            }
        });
    }
}

async function loadPageData(page) {
    switch (page) {
        case 'videos':
            await loadVideos();
            break;
        case 'admin':
            if (currentUser?.role === 'admin') {
                await loadAdminDashboard();
            }
            break;
    }
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('authToken', authToken);
            
            closeAllModals();
            showNotification('success', 'Login successful!', 'Welcome back!');
            
            updateUI();
            
            if (currentPage === 'home') {
                await loadHomeData();
            }
        } else {
            showNotification('error', 'Login failed', data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('error', 'Error', 'An error occurred during login');
    } finally {
        showLoading(false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = {
        firstName: document.getElementById('registerFirstName').value,
        lastName: document.getElementById('registerLastName').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value,
        role: document.getElementById('registerRole').value
    };
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeAllModals();
            showNotification('success', 'Registration successful!', 'Please check your email for verification.');
        } else {
            showNotification('error', 'Registration failed', data.message);
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('error', 'Error', 'An error occurred during registration');
    } finally {
        showLoading(false);
    }
}

async function logout() {
    try {
        if (authToken) {
            await fetch(`${API_BASE}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        updateUI();
        showPage('home');
        showNotification('success', 'Logged out', 'You have been successfully logged out');
    }
}

async function loadUserProfile() {
    const response = await fetch(`${API_BASE}/api/auth/profile`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
        }
    });
    
    if (response.ok) {
        const data = await response.json();
        currentUser = data.user;
    } else {
        throw new Error('Failed to load user profile');
    }
}

// UI update functions
function updateUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const adminNav = document.getElementById('admin-nav');
    const homeAuthButtons = document.getElementById('home-auth-buttons');
    const homeUserWelcome = document.getElementById('home-user-welcome');
    const homeUserName = document.getElementById('homeUserName');
    
    if (currentUser) {
        // Show user menu
        authButtons?.classList.add('hidden');
        userMenu?.classList.remove('hidden');
        homeAuthButtons?.classList.add('hidden');
        homeUserWelcome?.classList.remove('hidden');
        
        // Update user info
        const initials = `${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}`;
        document.getElementById('userInitials').textContent = initials;
        document.getElementById('userName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
        homeUserName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
        
        // Show admin nav if user is admin
        if (currentUser.role === 'admin') {
            adminNav?.classList.remove('hidden');
        } else {
            adminNav?.classList.add('hidden');
        }
    } else {
        // Show auth buttons
        authButtons?.classList.remove('hidden');
        userMenu?.classList.add('hidden');
        homeAuthButtons?.classList.remove('hidden');
        homeUserWelcome?.classList.add('hidden');
        adminNav?.classList.add('hidden');
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown?.classList.toggle('hidden');
}

// Modal functions
function showModal(modalId) {
    document.getElementById(modalId)?.classList.remove('hidden');
}

function hideModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

function showLoginModal() {
    closeAllModals();
    showModal('loginModal');
}

function showRegisterModal() {
    closeAllModals();
    showModal('registerModal');
}

// Dark mode functions
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
}

// Notification functions
function showNotification(type, title, message) {
    const notification = document.getElementById('notification');
    const notificationIcon = document.getElementById('notificationIcon');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    
    // Set icon and colors based on type
    let iconClass, iconColor;
    switch (type) {
        case 'success':
            iconClass = 'fas fa-check-circle';
            iconColor = 'text-green-500';
            break;
        case 'error':
            iconClass = 'fas fa-exclamation-circle';
            iconColor = 'text-red-500';
            break;
        case 'warning':
            iconClass = 'fas fa-exclamation-triangle';
            iconColor = 'text-yellow-500';
            break;
        default:
            iconClass = 'fas fa-info-circle';
            iconColor = 'text-blue-500';
    }
    
    notificationIcon.className = `flex-shrink-0 ${iconClass} ${iconColor}`;
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    
    notification.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

function hideNotification() {
    document.getElementById('notification')?.classList.add('hidden');
}

// Loading functions
function showLoading(show) {
    const loadingElements = document.querySelectorAll('.loading-spinner');
    loadingElements.forEach(el => {
        el.style.display = show ? 'block' : 'none';
    });
}

// Home page functions
async function loadHomeData() {
    try {
        // Load statistics
        const response = await fetch(`${API_BASE}/api/admin/statistics`);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                updateHomeStatistics(data.statistics);
            }
        }
    } catch (error) {
        console.error('Error loading home data:', error);
    }
}

function updateHomeStatistics(stats) {
    document.getElementById('totalVideos').textContent = stats.videos?.total_videos || 0;
    document.getElementById('totalUsers').textContent = stats.users?.total_users || 0;
    document.getElementById('totalViews').textContent = stats.views?.total_views || 0;
    document.getElementById('totalCategories').textContent = stats.videos?.by_category?.length || 0;
}

// Video functions
async function loadVideos(page = 1, search = '', category = '', sortBy = 'created_at') {
    try {
        showLoading(true);
        
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '12'
        });
        
        if (search) params.append('search', search);
        if (category) params.append('category', category);
        if (sortBy) params.append('sortBy', sortBy);
        
        const response = await fetch(`${API_BASE}/api/videos?${params}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                videos = data.videos;
                categories = data.categories;
                
                renderVideos();
                renderCategories();
                renderPagination(data.pagination);
            }
        } else if (response.status === 401) {
            logout();
        }
    } catch (error) {
        console.error('Error loading videos:', error);
        showNotification('error', 'Error', 'Failed to load videos');
    } finally {
        showLoading(false);
    }
}

function renderVideos() {
    const videosGrid = document.getElementById('videosGrid');
    if (!videosGrid) return;
    
    videosGrid.innerHTML = '';
    
    videos.forEach(video => {
        const videoCard = createVideoCard(video);
        videosGrid.appendChild(videoCard);
    });
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer fade-in';
    card.addEventListener('click', () => playVideo(video.id));
    
    const thumbnail = video.thumbnailPath ? 
        `<img src="${API_BASE}/uploads/${video.thumbnailPath}" alt="${video.title}" class="w-full h-48 object-cover">` :
        `<div class="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <i class="fas fa-video text-4xl text-gray-400"></i>
        </div>`;
    
    const duration = formatDuration(video.duration);
    
    card.innerHTML = `
        ${thumbnail}
        <div class="p-4">
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">${video.title}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">${video.description || ''}</p>
            <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span><i class="fas fa-clock mr-1"></i>${duration}</span>
                <span>${video.category || 'Uncategorized'}</span>
            </div>
            <div class="mt-2 text-xs text-gray-400">
                By ${video.uploadedBy}
            </div>
        </div>
    `;
    
    return card;
}

function renderCategories() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
    
    // Clear existing options except "All Categories"
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

function renderPagination(pagination) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    if (pagination.totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    const { currentPage, totalPages } = pagination;
    
    let html = '<div class="flex items-center space-x-2">';
    
    // Previous button
    if (currentPage > 1) {
        html += `<button onclick="loadVideos(${currentPage - 1})" class="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
            <i class="fas fa-chevron-left"></i>
        </button>`;
    }
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `<button onclick="loadVideos(${i})" class="px-3 py-2 text-sm rounded-md ${
            isActive 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }">${i}</button>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        html += `<button onclick="loadVideos(${currentPage + 1})" class="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
            <i class="fas fa-chevron-right"></i>
        </button>`;
    }
    
    html += '</div>';
    paginationContainer.innerHTML = html;
}

async function playVideo(videoId) {
    try {
        const response = await fetch(`${API_BASE}/api/videos/${videoId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                currentVideo = data.video;
                showVideoPlayer();
            }
        } else if (response.status === 401) {
            logout();
        }
    } catch (error) {
        console.error('Error loading video:', error);
        showNotification('error', 'Error', 'Failed to load video');
    }
}

function showVideoPlayer() {
    showPage('video-player');
    
    // Update video info
    document.getElementById('videoTitle').textContent = currentVideo.title;
    document.getElementById('videoDescription').textContent = currentVideo.description || 'No description available';
    document.getElementById('videoDuration').innerHTML = `<i class="fas fa-clock mr-1"></i>${formatDuration(currentVideo.duration)}`;
    document.getElementById('videoViews').innerHTML = `<i class="fas fa-eye mr-1"></i>${currentVideo.viewCount} views`;
    document.getElementById('videoUploadDate').innerHTML = `<i class="fas fa-calendar mr-1"></i>${formatDate(currentVideo.createdAt)}`;
    document.getElementById('videoCategory').textContent = currentVideo.category || 'Uncategorized';
    document.getElementById('videoUploadedBy').textContent = currentVideo.uploadedBy;
    document.getElementById('videoFileSize').textContent = formatFileSize(currentVideo.fileSize);
    
    // Render tags
    const tagsContainer = document.getElementById('videoTags');
    if (currentVideo.tags) {
        const tags = currentVideo.tags.split(',').map(tag => tag.trim());
        tagsContainer.innerHTML = tags.map(tag => 
            `<span class="inline-block bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs">${tag}</span>`
        ).join(' ');
    } else {
        tagsContainer.innerHTML = '';
    }
    
    // Create video player
    const videoContainer = document.getElementById('videoContainer');
    videoContainer.innerHTML = `
        <video controls autoplay loop class="w-full h-full">
            <source src="${API_BASE}/api/videos/${currentVideo.id}/stream" type="video/mp4">
            Your browser does not support the video tag.
        </video>
    `;
    
    // Load related videos
    loadRelatedVideos();
}

async function loadRelatedVideos() {
    // For simplicity, just show other videos in the same category
    const relatedVideos = videos.filter(v => 
        v.id !== currentVideo.id && 
        v.category === currentVideo.category
    ).slice(0, 5);
    
    const relatedContainer = document.getElementById('relatedVideos');
    if (relatedVideos.length > 0) {
        relatedContainer.innerHTML = relatedVideos.map(video => `
            <div class="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer" onclick="playVideo(${video.id})">
                <div class="w-16 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                    <i class="fas fa-video text-gray-400"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${video.title}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">${formatDuration(video.duration)}</p>
                </div>
            </div>
        `).join('');
    } else {
        relatedContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">No related videos found.</p>';
    }
}

// Video search and filter functions
function handleVideoSearch() {
    const search = document.getElementById('videoSearch').value;
    loadVideos(1, search);
}

function handleVideoFilter() {
    const search = document.getElementById('videoSearch').value;
    const category = document.getElementById('categoryFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    loadVideos(1, search, category, sortBy);
}

// Admin functions
async function loadAdminDashboard() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                adminData = data.dashboard;
                showAdminSection('dashboard');
            }
        }
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        showNotification('error', 'Error', 'Failed to load admin dashboard');
    }
}

function showAdminSection(section) {
    // Update active nav button
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === section) {
            btn.classList.add('active');
        }
    });
    
    const content = document.getElementById('admin-content');
    if (!content) return;
    
    switch (section) {
        case 'dashboard':
            content.innerHTML = renderAdminDashboard();
            break;
        case 'users':
            content.innerHTML = renderAdminUsers();
            loadAdminUsers();
            break;
        case 'videos':
            content.innerHTML = renderAdminVideos();
            loadAdminVideos();
            break;
        case 'activity':
            content.innerHTML = renderAdminActivity();
            loadAdminActivity();
            break;
    }
}

function renderAdminDashboard() {
    if (!adminData) return '<div class="text-center py-8">Loading dashboard...</div>';
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <i class="fas fa-users text-blue-600 dark:text-blue-400 text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">${adminData.users.total}</p>
                    </div>
                </div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <i class="fas fa-video text-green-600 dark:text-green-400 text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Videos</p>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">${adminData.videos.total}</p>
                    </div>
                </div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <i class="fas fa-eye text-purple-600 dark:text-purple-400 text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Views</p>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">${adminData.videos.totalViews}</p>
                    </div>
                </div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                        <i class="fas fa-hdd text-orange-600 dark:text-orange-400 text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Storage Used</p>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">${formatFileSize(adminData.storage.totalSize)}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                <div class="space-y-3">
                    ${adminData.recentActivity.slice(0, 10).map(activity => `
                        <div class="flex items-start space-x-3">
                            <div class="flex-shrink-0">
                                <i class="fas fa-circle text-xs text-gray-400"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-gray-900 dark:text-white">${activity.details}</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">${activity.user} • ${formatDate(activity.timestamp)}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Registrations</h3>
                <div class="space-y-3">
                    ${adminData.recentRegistrations.slice(0, 5).map(user => `
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-900 dark:text-white">${user.name}</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">${user.email} • ${user.role.replace('_', ' ')}</p>
                            </div>
                            <span class="text-xs text-gray-500 dark:text-gray-400">${formatDate(user.registeredAt)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderAdminUsers() {
    return `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">User Management</h3>
                    <button onclick="showCreateUserModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm">
                        <i class="fas fa-plus mr-2"></i>Add User
                    </button>
                </div>
            </div>
            <div id="adminUsersContent" class="p-6">
                <div class="text-center py-8">Loading users...</div>
            </div>
        </div>
    `;
}

function renderAdminVideos() {
    return `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Video Management</h3>
                    <button onclick="showModal('uploadModal')" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm">
                        <i class="fas fa-upload mr-2"></i>Upload Video
                    </button>
                </div>
            </div>
            <div id="adminVideosContent" class="p-6">
                <div class="text-center py-8">Loading videos...</div>
            </div>
        </div>
    `;
}

function renderAdminActivity() {
    return `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Activity Logs</h3>
            </div>
            <div id="adminActivityContent" class="p-6">
                <div class="text-center py-8">Loading activity logs...</div>
            </div>
        </div>
    `;
}

async function loadAdminUsers() {
    // Implementation for loading admin users
    const content = document.getElementById('adminUsersContent');
    content.innerHTML = '<div class="text-center py-8">Users loaded</div>';
}

async function loadAdminVideos() {
    // Implementation for loading admin videos
    const content = document.getElementById('adminVideosContent');
    content.innerHTML = '<div class="text-center py-8">Videos loaded</div>';
}

async function loadAdminActivity() {
    // Implementation for loading admin activity
    const content = document.getElementById('adminActivityContent');
    content.innerHTML = '<div class="text-center py-8">Activity logs loaded</div>';
}

// Video upload function
async function handleVideoUpload(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const fileInput = document.getElementById('videoFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('error', 'Error', 'Please select a video file');
        return;
    }
    
    formData.append('video', file);
    formData.append('title', document.getElementById('videoTitleInput').value);
    formData.append('description', document.getElementById('videoDescriptionInput').value);
    formData.append('category', document.getElementById('videoCategoryInput').value);
    formData.append('tags', document.getElementById('videoTagsInput').value);
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/api/videos/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeAllModals();
            showNotification('success', 'Upload successful!', 'Video uploaded and processed successfully');
            
            // Clear form
            document.getElementById('uploadForm').reset();
            
            // Reload videos if on videos page
            if (currentPage === 'videos') {
                await loadVideos();
            }
        } else {
            showNotification('error', 'Upload failed', data.message);
        }
    } catch (error) {
        console.error('Video upload error:', error);
        showNotification('error', 'Error', 'An error occurred during upload');
    } finally {
        showLoading(false);
    }
}

// Forgot password function
async function showForgotPassword() {
    const email = document.getElementById('loginEmail').value;
    if (!email) {
        showNotification('warning', 'Email required', 'Please enter your email address first');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('success', 'Reset link sent', 'Check your email for password reset instructions');
        } else {
            showNotification('error', 'Error', data.message);
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        showNotification('error', 'Error', 'An error occurred');
    }
}

// Utility functions
function formatDuration(seconds) {
    if (!seconds) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add some CSS for line-clamp utility
const style = document.createElement('style');
style.textContent = `
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .admin-nav-btn {
        @apply px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 border-b-2 border-transparent hover:border-primary-600 dark:hover:border-primary-400 transition-colors;
    }
    .admin-nav-btn.active {
        @apply text-primary-600 dark:text-primary-400 border-primary-600 dark:border-primary-400;
    }
`;
document.head.appendChild(style);
