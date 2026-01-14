import client from './client';

export const parseTransaction = async (text) => {
    try {
        const response = await client.post('/api/transactions/parse/', { text });
        return response.data;
    } catch (error) {
        console.error('Parse Error:', error);
        throw error;
    }
};

export const createTransaction = async (data) => {
    try {
        const response = await client.post('/api/transactions/create/', data);
        return response.data;
    } catch (error) {
        console.error('Create Error:', error);
        throw error;
    }
};

export const getTransactions = async () => {
    try {
        const response = await client.get('/api/transactions/');
        return response.data;
    } catch (error) {
        console.error('Get Transactions Error:', error);
        throw error;
    }
};

export const getCategoryStats = async () => {
    try {
        const response = await client.get('/api/transactions/category-stats/');
        return response.data;
    } catch (error) {
        console.error('Get Category Stats Error:', error);
        throw error;
    }
};

