import client from './client';

export const getYuntaekScore = async (year, month) => {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const { data } = await client.get('/api/users/yuntaek-score/', { params });
    return data;
};

export const getYuntaekReport = async (year, month, refresh = false) => {
    const params = { refresh };
    if (year) params.year = year;
    if (month) params.month = month;
    const { data } = await client.get('/api/users/yuntaek-report/', { params });
    return data;
};
