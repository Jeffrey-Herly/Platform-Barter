/**
 * Navbar Utility Functions
 * Used across all dashboard pages
 */

console.log('[Navbar] Script loaded!');

// Page mapping
const pageRoutes = {
    'dashboard': '/dashboard/',
    'search': '/items/search',
    'profile': '/dashboard/profile',
    'items': '/dashboard/items',
    'notifications': '/dashboard/notifications',
    'conversations': '/conversations/page',
    'wishlist': '/dashboard/wishlist',
    'reviews': '/dashboard/reviews',
    'admin': '/admin'
};

// Navigation function
function navigateTo(page) {
    if (pageRoutes[page]) {
        window.location.href = pageRoutes[page];
    }
}

// Logout function
function logout() {
    console.log('[Navbar] logout() function called');
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        console.log('[Navbar] User confirmed logout, sending request to /auth/logout');
        fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // IMPORTANT: Send cookies with request
            body: JSON.stringify({})
        }).then(response => {
            console.log('[Navbar] Logout response received, status:', response.status);
            if (response.ok) {
                console.log('[Navbar] Logout successful, redirecting to /auth/');
                window.location.href = '/auth/';
            } else {
                console.error('Logout failed with status:', response.status);
                alert('Terjadi kesalahan saat logout. Status: ' + response.status);
            }
        }).catch(error => {
            console.error('[Navbar] Fetch error:', error);
            alert('Terjadi kesalahan saat logout: ' + error.message);
        });
    } else {
        console.log('[Navbar] User cancelled logout');
    }
}

// Mobile Sidebar Management
class MobileSidebar {
    constructor() {
        this.hamburgerBtn = document.getElementById('hamburger-btn');
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('sidebar-overlay');
        this.navItems = document.querySelectorAll('.nav-item');
        
        console.log('[MobileSidebar] Initializing:');
        console.log('  - hamburgerBtn:', this.hamburgerBtn ? 'FOUND' : 'NOT FOUND');
        console.log('  - sidebar:', this.sidebar ? 'FOUND' : 'NOT FOUND');
        console.log('  - overlay:', this.overlay ? 'FOUND' : 'NOT FOUND');
        console.log('  - navItems count:', this.navItems.length);
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Hamburger button click - MULTIPLE EVENTS
        if (this.hamburgerBtn) {
            // Mouse events
            this.hamburgerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[MobileSidebar] Hamburger CLICK event');
                this.toggleSidebar();
            });
            
            // Touch events for mobile
            this.hamburgerBtn.addEventListener('touchstart', (e) => {
                console.log('[MobileSidebar] Hamburger TOUCH event');
            });
            
            // Pointer events (modern)
            this.hamburgerBtn.addEventListener('pointerdown', (e) => {
                console.log('[MobileSidebar] Hamburger POINTER event');
            });
            
            console.log('[MobileSidebar] ✓ Hamburger listeners attached (click, touch, pointer)');
        } else {
            console.error('[MobileSidebar] ✗ Hamburger button NOT FOUND!');
        }

        // Overlay click
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                console.log('[MobileSidebar] Overlay clicked - closing sidebar');
                this.closeSidebar();
            });
            console.log('[MobileSidebar] ✓ Overlay listener attached');
        }

        // Nav items click
        this.navItems.forEach((item, index) => {
            item.addEventListener('click', (e) => {
                console.log(`[MobileSidebar] Nav item ${index} clicked:`, item.textContent);
                this.closeSidebar();
            });
        });
        console.log(`[MobileSidebar] ✓ ${this.navItems.length} nav items listeners attached`);

        // Body click (close sidebar)
        if (this.sidebar && this.hamburgerBtn) {
            document.body.addEventListener('click', (e) => {
                if (!this.sidebar.contains(e.target) && !this.hamburgerBtn.contains(e.target)) {
                    if (this.sidebar.classList.contains('active')) {
                        console.log('[MobileSidebar] Body clicked outside - closing sidebar');
                        this.closeSidebar();
                    }
                }
            });
            console.log('[MobileSidebar] ✓ Body click listener attached');
        }

        // Window resize listener
        window.addEventListener('resize', () => {
            const width = window.innerWidth;
            console.log(`[MobileSidebar] Window resized to ${width}px`);
            if (width > 768 && this.sidebar.classList.contains('active')) {
                console.log('[MobileSidebar] Screen resized to desktop - closing sidebar');
                this.closeSidebar();
            }
        });
        console.log('[MobileSidebar] ✓ Resize listener attached');

        console.log('[MobileSidebar] ✓✓✓ ALL EVENT LISTENERS SET UP ✓✓✓');
    }

    toggleSidebar() {
        if (this.sidebar.classList.contains('active')) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        console.log('[MobileSidebar] Opening sidebar');
        console.log('  - sidebar:', this.sidebar);
        console.log('  - overlay:', this.overlay);
        
        this.sidebar.classList.add('active');
        if (this.overlay) this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        console.log('  - sidebar class:', this.sidebar.className);
        console.log('  - overlay class:', this.overlay ? this.overlay.className : 'N/A');
    }

    closeSidebar() {
        console.log('[MobileSidebar] Closing sidebar');
        this.sidebar.classList.remove('active');
        if (this.overlay) this.overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Initialize navbar event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Navbar] DOMContentLoaded event fired');

    // Initialize mobile sidebar
    new MobileSidebar();

    // Navigation links
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    console.log('[Navbar] Found nav items:', navItems.length);
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (page && pageRoutes[page]) {
                window.location.href = pageRoutes[page];
            }
        });
    });

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    console.log('[Navbar] Logout button found:', logoutBtn ? 'YES' : 'NO');
    if (logoutBtn) {
        console.log('[Navbar] Adding click event listener to logout button');
        logoutBtn.addEventListener('click', function() {
            console.log('[Navbar] Logout button clicked!');
            logout();
        });
    } else {
        console.warn('[Navbar] Logout button (#logout-btn) not found in DOM');
    }

    console.log('[Navbar] Initialization complete');
});
