import React from "react";

const DownloadFile = ({ file }) => {
    const token = localStorage.getItem("token");
    if (!file || !file.url || !file.name) {
        console.error("Ошибка: Неверный формат файла", file);
        return <p>Ошибка загрузки</p>;
    }

    const handleDownload = async () => {
        try {
            const response = await fetch(file.url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Ошибка при скачивании файла");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", file.name);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Ошибка при скачивании:", error);
            alert("Не удалось скачать файл");
        }
    };

    return (
        <button type="button" onClick={handleDownload} className="download-button">
            {file.name}
        </button>
    );
};

export default DownloadFile;
