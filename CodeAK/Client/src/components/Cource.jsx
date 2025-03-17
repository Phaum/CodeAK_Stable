import { baseBackendUrl } from "../shared/constants";

const API_URL = `${baseBackendUrl}/courses`;

export async function fetchSections(courseId, sectionId = null) {
    console.log("fetchSections", courseId, sectionId);
    const token = localStorage.getItem("token");
    if (!courseId) throw new Error("Не указан courseId");
    const url = sectionId ? `${API_URL}/${courseId}/sections/${sectionId}` : `${API_URL}/${courseId}/sections`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("Ошибка получения разделов курса");
    return response.json();
}

export async function fetchViewSections(courseId, sectionId = null) {
    console.log("fetchViewSections", courseId, sectionId);
    const token = localStorage.getItem("token");
    if (!courseId) throw new Error("Не указан courseId");
    const url = sectionId ? `${API_URL}/${courseId}/sections/${sectionId}` : `${API_URL}/${courseId}/sections/view`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("Ошибка получения разделов курса");
    return response.json();
}

export async function fetchCourses(courseId = null) {
    const token = localStorage.getItem("token");
    const url = courseId ? `${API_URL}/${courseId}` : API_URL;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
        throw new Error("Ошибка получения курсов");
    }
    return response.json();
}

export async function addSection(courseId, sectionData) {
    const token = localStorage.getItem("token");
    if (!courseId) throw new Error("Не указан courseId");
    const response = await fetch(`${API_URL}/${courseId}/sections`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sectionData),
    });
    if (!response.ok) throw new Error("Ошибка создания раздела");
    return response.json();
}

export async function deleteSection(courseId, sectionId) {
    const token = localStorage.getItem("token");
    console.log({
        Authorization: `Bearer ${token}`
    });
    if (!courseId || !sectionId) throw new Error("Не указан courseId или sectionId");
    const response = await fetch(`${API_URL}/${courseId}/sections/${sectionId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) throw new Error("Ошибка удаления раздела");
    return response.json();
}

export async function reorderSections(courseId, reorderedSections) {
    const token = localStorage.getItem("token");
    if (!courseId) throw new Error("Не указан courseId");
    const response = await fetch(`${API_URL}/${courseId}/sections/reorder`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            sections: reorderedSections.map((section, index) => ({
                id: section.id,
                order: index + 1,
            })),
        }),
    });

    if (!response.ok) throw new Error("Ошибка изменения порядка разделов");
    return response.json();
}

export async function updateSectionContent(courseId, sectionId, files, content_md) {
    const formData = new FormData();
    const token = localStorage.getItem("token");
    formData.append("courseId", courseId);
    formData.append("sectionId", sectionId);
    if (content_md) formData.append("content_md", content_md);
    if (files && files.length > 0) {
        files.forEach((file) => {
            formData.append("files", file);
        });
    }
    try {
        const response = await fetch(`${API_URL}/${sectionId}/sections/content`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) throw new Error("Ошибка обновления данных");
        return response.json();
    } catch (error) {
        throw new Error(error.message);
    }
}

export async function deleteFile(sectionId, fileName) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/${sectionId}/sections/${sectionId}/attachments/${fileName}`, {
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