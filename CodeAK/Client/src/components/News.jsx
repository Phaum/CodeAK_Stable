import {baseFrontEndUrl, baseBackendUrl} from "../shared/constants"
import {message} from "antd";
const API_URL = `${baseBackendUrl}/news`;

export async function fetchNews() {
    const token = localStorage.getItem("token");
    const response = await fetch(API_URL, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    return data;
}

export async function fetchViewNews() {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/view`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    return data;
}

export async function addNews(newsData) {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append('title', newsData.title);
    formData.append('description', newsData.description);
    formData.append('date', newsData.date);
    formData.append('tags', `{${newsData.tags.join(',')}}`);
    let imageFile = null;
    if (Array.isArray(newsData.imageFile)) {
        imageFile = newsData.imageFile[0]?.originFileObj;
    } else if (newsData.imageFile instanceof File) {
        imageFile = newsData.imageFile;
    }
    if (imageFile instanceof File) {
        formData.append('image', imageFile);
    } else {
        console.error("Ошибка: imageFile не является файлом", newsData.imageFile);
    }
    const response = await fetch(`${API_URL}/add`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    return response.json();
}

export async function editNews(id, newsData) {
    const token = localStorage.getItem("token");
    console.log(token);
    const formData = new FormData();
    formData.append('title', newsData.title);
    formData.append('description', newsData.description);
    formData.append('date', newsData.date);
    formData.append('tags', `{${newsData.tags.join(',')}}`);
    formData.append('visible', newsData.visible);
    if (newsData.imageFile) {
        formData.append('image', newsData.imageFile);
    } else {
        formData.append('imageUrl', newsData.imageUrl || '');
    }
    const response = await fetch(`${API_URL}/edit/${id}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });
    return response.json();
}


export async function deleteNews(id) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/delete/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return response.json();
}

export async function reorderNews(reorderedNews) {
    const token = localStorage.getItem("token");
    await fetch(`${API_URL}/reorder`, {
        method: 'PUT',
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reorderedNews }),
    });
}

export async function deleteFile(fileName) {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${baseBackendUrl}/news/attachment/${fileName}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            throw new Error("Ошибка при удалении файла");
        }
        return response.json();
    } catch (error) {
        console.error(error);
    }
}