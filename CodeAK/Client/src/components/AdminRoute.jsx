import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import {baseBackendUrl} from "../shared/constants"
import {Spin} from "antd";

const AdminRoute = () => {
    const [isAdmin, setIsAdmin] = useState(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const response = await fetch(`${baseBackendUrl}/isadmin/checkadmin`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                });
                const data = await response.json();
                if (data?.admin === true) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } catch (error) {
                setIsAdmin(false);
            }
        };
        if (token) {
            checkAdmin();
        } else {
            setIsAdmin(false);
        }
    }, [token]);
    if (isAdmin === null) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />; // Показываем загрузку
    return isAdmin ? <Outlet /> : <Navigate to="/login" />;
};

export default AdminRoute;
