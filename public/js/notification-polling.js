/**
 * Notification Polling System
 * Implements polling untuk real-time notification updates
 * Polls setiap 5 detik untuk new notifications
 */

class NotificationPoller {
    constructor(options = {}) {
        this.pollInterval = options.pollInterval || 5000; // 5 seconds default
        this.userId = options.userId;
        this.pollingActive = false;
        this.pollTimer = null;
        this.lastCheckTime = new Date();
        this.badgeElement = options.badgeElement || '.notification-badge';
        this.notificationPanel = options.notificationPanel || '#notification-panel';
        this.onNewNotification = options.onNewNotification || null;
        this.retryCount = 0;
        this.maxRetries = 5;
    }

    /**
     * Start polling untuk new notifications
     */
    start() {
        if (this.pollingActive) return;

        this.pollingActive = true;
        console.log('[NotificationPoller] Starting notification polling...');

        // Get initial unread count
        this.updateBadgeCount();

        // Polling loop
        this.pollNotifications();
    }

    /**
     * Stop polling
     */
    stop() {
        this.pollingActive = false;
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
        console.log('[NotificationPoller] Polling stopped');
    }

    /**
     * Fetch recent notifications dari API
     * @private
     */
    async pollNotifications() {
        if (!this.pollingActive) return;

        try {
            const since = this.lastCheckTime.toISOString();
            const response = await fetch(
                `/api/notifications/recent?since=${since}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.data.notifications.length > 0) {
                this.retryCount = 0; // Reset retry count on success
                this.lastCheckTime = new Date();

                // Process new notifications
                data.data.notifications.forEach(notification => {
                    this.handleNewNotification(notification);
                });

                // Update badge count
                await this.updateBadgeCount();

                // Callback untuk new notifications
                if (this.onNewNotification) {
                    this.onNewNotification(data.data.notifications);
                }
            }
        } catch (error) {
            console.error('[NotificationPoller] Error polling notifications:', error);
            this.retryCount++;

            if (this.retryCount > this.maxRetries) {
                console.error('[NotificationPoller] Max retries reached, stopping polling');
                this.stop();
            }
        }

        // Schedule next poll
        this.pollTimer = setTimeout(() => this.pollNotifications(), this.pollInterval);
    }

    /**
     * Handle new notification dan update UI
     * @private
     */
    handleNewNotification(notification) {
        // Add to notification panel
        const notifHtml = this.createNotificationElement(notification);
        const panel = document.querySelector(this.notificationPanel);
        if (panel) {
            panel.insertAdjacentHTML('afterbegin', notifHtml);
        }

        // Show browser notification
        this.showBrowserNotification(notification);

        // Play sound
        this.playNotificationSound();
    }

    /**
     * Create notification HTML element
     * @private
     */
    createNotificationElement(notification) {
        const timeString = this.getRelativeTime(notification.created_at);
        const badgeClass = this.getTypeoBadgeClass(notification.type_name);

        return `
            <div class="notification-item p-3 border-bottom ${!notification.is_read ? 'unread' : ''}"
                 data-notification-id="${notification.notification_id}"
                 data-reference-id="${notification.reference_id}"
                 data-reference-type="${notification.reference_type}">
                <div class="d-flex align-items-start gap-2">
                    <span class="badge ${badgeClass} mt-1">${notification.type_name}</span>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${this.escapeHtml(notification.title)}</h6>
                        <p class="mb-1 text-muted small">${this.escapeHtml(notification.message)}</p>
                        <small class="text-secondary">${timeString}</small>
                    </div>
                    <button class="btn btn-sm btn-close notification-close"
                            data-notification-id="${notification.notification_id}"
                            type="button"
                            aria-label="Close"></button>
                </div>
            </div>
        `;
    }

    /**
     * Get badge class berdasarkan notification type
     * @private
     */
    getTypeoBadgeClass(typeName) {
        const badgeMap = {
            'BARTER_REQUEST': 'badge-info',
            'BARTER_ACCEPTED': 'badge-success',
            'BARTER_REJECTED': 'badge-danger',
            'NEW_MESSAGE': 'badge-primary',
            'REVIEW_RECEIVED': 'badge-warning',
            'ITEM_MATCHED': 'badge-secondary',
            'SYSTEM': 'badge-light'
        };
        return badgeMap[typeName] || 'badge-secondary';
    }

    /**
     * Get relative time string (e.g., "2 minutes ago")
     * @private
     */
    getRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

        return date.toLocaleDateString('id-ID');
    }

    /**
     * Update badge count dengan unread notifications
     */
    async updateBadgeCount() {
        try {
            const response = await fetch(
                '/api/notifications/unread/count',
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const count = data.data.unread_count;

            // Update badge
            const badges = document.querySelectorAll(this.badgeElement);
            badges.forEach(badge => {
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.classList.remove('d-none');
                } else {
                    badge.classList.add('d-none');
                }
            });
        } catch (error) {
            console.error('[NotificationPoller] Error updating badge count:', error);
        }
    }

    /**
     * Show browser notification
     * @private
     */
    showBrowserNotification(notification) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/images/logo.png',
                tag: notification.notification_id
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(notification.title, {
                        body: notification.message,
                        icon: '/images/logo.png',
                        tag: notification.notification_id
                    });
                }
            });
        }
    }

    /**
     * Play notification sound
     * @private
     */
    playNotificationSound() {
        try {
            const audio = new Audio('/audio/notification.mp3');
            audio.play().catch(e => console.log('Cannot play sound:', e));
        } catch (error) {
            console.log('Sound notification not available');
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        try {
            const response = await fetch(
                `/api/notifications/${notificationId}/read`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Update UI
            const element = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (element) {
                element.classList.remove('unread');
            }

            // Update badge
            await this.updateBadgeCount();

            console.log('[NotificationPoller] Notification marked as read');
        } catch (error) {
            console.error('[NotificationPoller] Error marking notification as read:', error);
        }
    }

    /**
     * Delete notification
     */
    async deleteNotification(notificationId) {
        try {
            const response = await fetch(
                `/api/notifications/${notificationId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Remove from UI
            const element = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (element) {
                element.remove();
            }

            // Update badge
            await this.updateBadgeCount();

            console.log('[NotificationPoller] Notification deleted');
        } catch (error) {
            console.error('[NotificationPoller] Error deleting notification:', error);
        }
    }

    /**
     * Escape HTML untuk security
     * @private
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Get auth token dari localStorage atau cookie
     * @private
     */
    getAuthToken() {
        // Try localStorage
        let token = localStorage.getItem('authToken');
        if (token) return token;

        // Try sessionStorage
        token = sessionStorage.getItem('authToken');
        if (token) return token;

        // Try cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.split('=');
            if (name.trim() === 'token') {
                return value;
            }
        }

        return '';
    }
}

// Export untuk digunakan di HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotificationPoller };
}
