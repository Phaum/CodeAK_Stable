import {baseBackendUrl} from "../shared/constants"

export async function loginUser({ loginoremail, password }) {
    const response = await fetch(`${baseBackendUrl}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loginoremail, password }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
    }
    if (response.ok){
        await fetch(`${baseBackendUrl}/auth/active`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ loginoremail }),
        });
    }
    return data;
}

export async function registerUser({ login,username, lastname, usergroup, email, password }) {
    const response = await fetch(`${baseBackendUrl}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login,username, lastname, usergroup, email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
    }
    return data;
}

export async function verifyEmail(email, code) {
    try {
        const response = await fetch(`${baseBackendUrl}/auth/verify-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Ошибка подтверждения email");
        }
        return response.json();
    } catch (error) {
        throw new Error(error.message);
    }
}
