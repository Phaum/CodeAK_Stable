import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { message } from "antd";

export const exportToExcel = (data, fileName = "export") => {
    if (!data || !data.length) {
        message.warning("Нет данных для экспорта!");
        return;
    }
    const formattedData = data.map(({ id, login, username, lastname, usergroup, role, codegroup, email, avatar, created_at }) => ({
        ID: id,
        "login": login,
        "Имя" : username,
        "Фамилия" : lastname,
        "Email": email,
        "Студенческая группа" : usergroup,
        "Роль": role,
        "Команда": codegroup,
        "Аватар": avatar,
        "Дата регистрации": created_at,
    }));
    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Пользователи");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const fileData = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(fileData, `${fileName}_${new Date().toLocaleDateString("ru-RU")}.xlsx`);
};
