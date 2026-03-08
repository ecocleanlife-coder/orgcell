/**
 * Utility functions for handling Browser Push Notifications.
 */

export const isNotificationSupported = () => {
    return 'Notification' in window;
};

export const getNotificationPermission = () => {
    if (!isNotificationSupported()) return 'denied';
    return Notification.permission;
};

export const requestNotificationPermission = async () => {
    if (!isNotificationSupported()) {
        console.warn('This browser does not support desktop notifications.');
        return 'denied';
    }

    try {
        const permission = await Notification.requestPermission();
        return permission;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return 'denied';
    }
};

/**
 * Sends a push notification if permission is granted.
 * @param {string} title - The notification title
 * @param {object} options - Options (body, icon, etc.)
 */
export const sendPushNotification = (title, options = {}) => {
    if (getNotificationPermission() === 'granted') {
        try {
            const notification = new Notification(title, {
                icon: '/icon-192.png', // PWA default icon
                vibrate: [200, 100, 200],
                ...options
            });

            // Optional: Auto-close after a few seconds
            // setTimeout(() => notification.close(), 5000);
            return notification;
        } catch (error) {
            console.error('Failed to send push notification:', error);
        }
    } else {
        console.log(`Notification '${title}' blocked (permission: ${getNotificationPermission()})`);
    }
    return null;
};
