import React, { useEffect, useState } from "react";
import {Table, Tag, Input, Button, message, Form, Spin} from "antd";
import { useNavigate } from "react-router-dom";
import {baseBackendUrl} from "../shared/constants"
import {fetchProfile} from "../components/Profile";

const SupportPage = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState([]);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    useEffect(() => {
        async function loadProfile() {
            try {
                const data = await fetchProfile(token);
            } catch (error) {
                localStorage.removeItem('token');
                navigate("/login");
            }
        }
        const loadReports = async () => {
            try {
                const data = await fetchUserReports();
                setReports(data);
            } catch (error) {
                message.error("Ошибка загрузки репортов");
            }
        };
        if (token) {
            loadProfile();
        }
        loadReports();
        setLoading(false);
        const interval = setInterval(() => {
            loadReports();;
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    async function sendReport(message) {
        const token = localStorage.getItem("token");
        const response = await fetch(`${baseBackendUrl}/reports/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ message }),
        });

        if (!response.ok) {
            throw new Error("Ошибка при отправке репорта");
        }

        return response.json();
    }

    const columns = [
        { title: "Сообщение", dataIndex: "message", key: "message" },
        {
            title: "Статус",
            dataIndex: "status",
            key: "status",
            render: (status) => (
                <Tag color={status === "resolved" ? "green" : "orange"}>
                    {status === "resolved" ? "Решено" : "Ожидает ответа"}
                </Tag>
            ),
        },
        { title: "Ответ", dataIndex: "admin_response", key: "admin_response" },
    ];

    async function fetchUserReports() {
        const token = localStorage.getItem("token");
        const response = await fetch(`${baseBackendUrl}/reports/user`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error("Ошибка загрузки репортов");
        }

        return response.json();
    }

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            await sendReport(values.message);
            message.success("Ваше сообщение отправлено!");
            form.resetFields();
        } catch (error) {
            message.error("Ошибка отправки репорта.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <div>
            <Form form={form} onFinish={handleSubmit}>
                <Form.Item name="message" rules={[{ required: true, message: "Введите ваше сообщение" }]}>
                    <Input.TextArea placeholder="Введите ваше сообщение" rows={4} />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                    Отправить
                </Button>
            </Form>
            <Table columns={columns} dataSource={reports} rowKey="id" />
        </div>
    );
};

export default SupportPage;
