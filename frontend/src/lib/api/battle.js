import client from './client';

export async function getBattleProfile() {
    const { data } = await client.get('/api/battles/profile/me/');
    return data;
}

export async function issueBattleCode() {
    const { data } = await client.post('/api/battles/profile/issue-code/');
    return data;
}

export async function lookupBattleUser(battleCode) {
    const { data } = await client.get('/api/battles/users/lookup/', {
        params: { battle_code: battleCode },
    });
    return data;
}

export async function createBattleRequest(payload) {
    const { data } = await client.post('/api/battles/requests/', payload);
    return data;
}

export async function acceptBattleRequest(battleId) {
    const { data } = await client.post(`/api/battles/${battleId}/accept/`);
    return data;
}

export async function rejectBattleRequest(battleId) {
    const { data } = await client.post(`/api/battles/${battleId}/reject/`);
    return data;
}

export async function cancelBattleRequest(battleId) {
    const { data } = await client.post(`/api/battles/${battleId}/cancel/`);
    return data;
}

export async function getBattleEntry() {
    const { data } = await client.get('/api/battles/entry/');
    return data;
}

export async function getCurrentBattle() {
    const { data } = await client.get('/api/battles/current/');
    return data;
}

export async function getCurrentBattleProgress() {
    const { data } = await client.get('/api/battles/current/progress/');
    return data;
}

export async function getBattleResult(battleId) {
    const { data } = await client.get(`/api/battles/${battleId}/result/`);
    return data;
}

export async function confirmBattleResult(battleId) {
    const { data } = await client.post(`/api/battles/${battleId}/confirm-result/`);
    return data;
}
