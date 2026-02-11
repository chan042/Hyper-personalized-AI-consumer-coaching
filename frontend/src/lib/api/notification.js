import client from './client';

export const getNotifications = async () => {
    const response = await client.get('/api/notifications/');
    return response.data;
};

export const markAsRead = async (id) => {
    const response = await client.patch(`/api/notifications/${id}/read/`);
    return response.data;
};

export const markAllAsRead = async () => {
    const response = await client.patch('/api/notifications/read/');
    return response.data;
};

export const getUnreadCount = async () => {
    const response = await client.get('/api/notifications/count/');
    return response.data.unread_count;
};
