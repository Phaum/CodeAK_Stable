import React, { useEffect } from "react";
import {Collapse, Divider} from "antd";
import UserManagement from "./UserManagement";
import NewsManagement from "./NewsManagement";
import TableManagement from "./TableManagement";
import MaterialManagement from "./CourseManagement";
import {useNavigate} from "react-router-dom";
import {fetchProfile} from "../../components/Profile";

const { Panel } = Collapse;

const MentorPanel = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    document.title = "Инструменты ментора";
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
    return (
        <div>
            <h1>Панель ментора</h1>
            <Divider style={{ marginTop: 20, marginBottom: 20 }} />
            <Collapse accordion>
                <Panel header="Управление пользователями" key="administration">
                    <UserManagement/>
                </Panel>
                <Panel header="Управление таблицей рейтинга" key="tablemanagement">
                    <TableManagement/>
                </Panel>
                <Panel header="Управление новостями" key="news">
                    <NewsManagement/>
                </Panel>
                <Panel header="Управление материалами" key="material">
                    <MaterialManagement/>
                </Panel>
            </Collapse>
        </div>
    );
};

export default MentorPanel;
