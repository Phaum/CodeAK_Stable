import React, { useEffect, useState } from 'react';
import { Card, Typography, Button, message, Spin } from "antd";
import {baseBackendUrl} from "../../shared/constants";

const { Text, Title } = Typography;

const Logs = () => {
    const [logs, setLogs] = useState("");
    const [loading, setLoading] = useState(false);
    const token = localStorage.getItem("token");
    document.title = "Логирование";
    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${baseBackendUrl}/logs/view`, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) throw new Error("Ошибка загрузки логов");
            const data = await response.json();
            const reversedLogs = data.logs.split("\n").reverse().join("\n");
            setLogs(reversedLogs);
        } catch (error) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <Card title={<Title level={3}>Логи сервера</Title>} extra={
            <Button onClick={fetchLogs} loading={loading} type="primary">
                Обновить
            </Button>
        }>
            <pre style={{ whiteSpace: "pre-wrap", maxHeight: "500px", overflowY: "auto", padding: 10, borderRadius: 5 }}>
                <Text>{logs || "Логи отсутствуют"}</Text>
            </pre>
        </Card>
    );
};

export default Logs;