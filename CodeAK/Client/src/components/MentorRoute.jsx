import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import {baseBackendUrl} from "../shared/constants"
import {Spin} from "antd";

const MentorRoute = () => {
    const [isMentor, setIsMentor] = useState(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const checkMentor = async () => {
            try {
                const response = await fetch(`${baseBackendUrl}/ismentor/checkmentor`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                });
                const data = await response.json();
                if (data?.mentor === true) {
                    setIsMentor(true);
                } else {
                    setIsMentor(false);
                }
            } catch (error) {
                setIsMentor(false);
            }
        };
        if (token) {
            checkMentor();
        } else {
            setIsMentor(false);
        }
    }, [token]);
    if (isMentor === null) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />; // Показываем загрузку
    return isMentor ? <Outlet /> : <Navigate to="/login" />;
};

export default MentorRoute;
