import React, { useEffect } from "react";
import {Collapse, Divider} from "antd";
import UserManagement from "./UserManagement";
import NewsManagement from "./NewsManagement";
import MaterialManagement from "./CourseManagement";
import TableManagement from "./TableManagement";
import {useNavigate} from "react-router-dom";
import {fetchProfile} from "../../components/Profile";
import ContactsManagement from "./ContactsManagement";

const AdminPanel = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    document.title = "Инструменты администратора";
    useEffect(() => {
        async function loadProfile() {
            try {
                const data = await fetchProfile(token);
            } catch (error) {
                localStorage.removeItem('token');
                navigate("/login");
            }
        }
        if (token) {
            loadProfile();
        }
    }, []);
    const items = [
        {
            key: 'administration',
            label:'Управление пользователями',
            children: <UserManagement/>,
        },
        {
            key: 'tablemanagement',
            label:'Управление таблицей рейтинга',
            children: <TableManagement/>,
        },
        {
            key: 'news',
            label:'Управление новостями',
            children: <NewsManagement/>,
        },
        {
            key: 'material',
            label:'Управление курсами',
            children: <MaterialManagement/>,
        },
        {
            key: 'contacts',
            label:'Управление контактами',
            children: <ContactsManagement/>,
        },
    ]
    return (
        <div>
            <h1>Панель администратора</h1>
            <Divider style={{ marginTop: 20, marginBottom: 20 }} />
            <Collapse ghost items={items} />
        </div>
    );
};

export default AdminPanel;
