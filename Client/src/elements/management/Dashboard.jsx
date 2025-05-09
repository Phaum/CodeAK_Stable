import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Statistic, Card, Spin } from 'antd';
import { Line } from '@ant-design/charts';
import {baseBackendUrl} from "../../shared/constants";
import {useNavigate} from "react-router-dom";
import {fetchProfile} from "../../components/Profile";

const Dashboard = () => {
    const [summaryData, setSummaryData] = useState(null);
    const [chartData, setChartData] = useState([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    document.title = "Дашборд";
    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${baseBackendUrl}/dashboard`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error('Ошибка при загрузке данных дашборда');
            }
            const data = await response.json();
            setSummaryData(data.summary);
            setChartData(data.chartData);
            setLoading(false);
        } catch (error) {
            console.error(error);
        }
    };

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
        fetchDashboardData();
    }, []);

    const lineConfig = {
        data: chartData,
        xField: 'date',
        yField: 'value',
        smooth: true,
        height: 300,
        autoFit: true,
        point: {
            size: 5,
            shape: 'diamond',
        },
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <PageContainer title="Дашборд" content="Общая статистика и динамика по данным">
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Общее количество пользователей"
                            value={summaryData ? summaryData.totalUsers : 0}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Активных пользователей"
                            value={summaryData ? summaryData.activeUsers : 0}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Новых регистраций"
                            value={summaryData ? summaryData.newRegistrations : 0}
                        />
                    </Card>
                </Col>
            </Row>
            <ProCard title="Динамика пользователей" style={{ marginBottom: 24 }}>
                {chartData.length ? (
                    <Line {...lineConfig} />
                ) : (
                    <p>Загрузка данных для графика...</p>
                )}
            </ProCard>
        </PageContainer>
    );
};

export default Dashboard;
