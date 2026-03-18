import client from './client';

export const getYuntaekScore = async (year, month) => {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const { data } = await client.get('/api/users/yuntaek-score/', { params });
    return data;
};

export const getYuntaekReport = async (year, month) => {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const { data } = await client.get('/api/users/yuntaek-report/', { params });
    return data;
};

export const regenerateYuntaekData = async (year, month) => {
    const payload = {};
    if (year) payload.year = year;
    if (month) payload.month = month;
    const { data } = await client.post('/api/users/yuntaek-regenerate/', payload);
    return data;
};
