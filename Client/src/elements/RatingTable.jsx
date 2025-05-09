import React, { useState, useEffect } from 'react';
import ProTable from "@ant-design/pro-table";
import { PageContainer } from "@ant-design/pro-components";
import {message, Spin, Table, Button, Input, Modal, Typography} from 'antd';
import { baseBackendUrl } from '../shared/constants';
import { useNavigate } from "react-router-dom";
import {fetchProfile} from "../components/Profile";
const { Title } = Typography;

async function fetchTeams() {
    const token = localStorage.getItem("token");
    const response = await fetch(`${baseBackendUrl}/teams`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("Ошибка получения данных");
    return response.json();
}

const TeamRanking = () => {
    const [dataSource, setDataSource] = useState([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState([]);
    const token = localStorage.getItem('token');
    document.title = "Таблица рейтинга";
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
        loadTeams();
        fetchParticipants();
        setLoading(false);
        const interval = setInterval(() => {
            loadTeams();
            fetchParticipants();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const loadTeams = async () => {
        try {
            const teams = await fetchTeams();
            setDataSource(teams);
        } catch (error) {
            message.error("Ошибка загрузки данных");
        }
    };

    const columns = [
        {
            title: 'Место',
            dataIndex: 'rank',
            key: 'rank',
            sorter: (a, b) => a.rank - b.rank,
        },
        {
            title: 'Команда',
            dataIndex: 'team_name',
            key: 'team_name',
            render: (text) => <strong>{text}</strong>,
        },
        {
            title: 'Очки',
            dataIndex: 'points',
            key: 'points',
            sorter: (a, b) => a.points - b.points,
        }
    ];

    const individualColumns = [
        {
            title: "Место",
            dataIndex: "rank",
            key: "rank"
        },
        {
            title: "Имя",
            dataIndex: "team_name",
            key: "team_name"
        },
        {
            title: "Очки",
            dataIndex: "points",
            key: "points"
        },
    ]
    const fetchParticipants = async () => {
        try {
            const response = await fetch(`${baseBackendUrl}/teams/individuals`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await response.json();
            setParticipants(data);
        } catch (error) {
            message.error("Ошибка загрузки участников");
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <PageContainer
            title="Рейтинг команд"
            content="Актуальные данные рейтинга команд Code.ak!"
        >
            <Table
                columns={columns}
                dataSource={dataSource.filter((team) => !["none", "admin", "mentor"].includes(team.team_name))}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                toolBarRender={() => []}
                scroll={{ x: 'max-content' }}
            />
            <Title level={4} style={{ marginTop: 12, marginBottom: 12 }}>Рейтинг индивидуальных участников</Title>
            <Table
                dataSource={participants}
                columns={individualColumns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
            />
        </PageContainer>
    );
};

export default TeamRanking;
