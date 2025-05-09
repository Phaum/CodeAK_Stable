import { baseBackendUrl } from "../shared/constants";

export async function fetchProfile(token) {
    try {
        const response = await fetch(`${baseBackendUrl}/user/profile`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            },
        });

        if (!response.ok) {
            throw new Error("Ошибка загрузки профиля");
        }

        return await response.json();
    } catch (error) {
        console.error("Ошибка загрузки профиля:", error);
        throw new Error("Ошибка загрузки профиля");
    }
}

export async function updateAvatar(file, token) {
    const formData = new FormData();
    formData.append("avatar", file);
    try {
        const response = await fetch(`${baseBackendUrl}/user/profile/avatar`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Ошибка обновления аватара");
        }
        return result;
    } catch (error) {
        console.error("Ошибка обновления аватара:", error);
        throw new Error(error.message || "Ошибка обновления аватара");
    }
}

export async function updateProfile(data, token) {
    try {
        const response = await fetch(`${baseBackendUrl}/user/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Ошибка обновления профиля");
        }
        return result;
    } catch (error) {
        console.error("Ошибка обновления профиля:", error);
        throw new Error(error.message || "Ошибка обновления профиля");
    }
}
