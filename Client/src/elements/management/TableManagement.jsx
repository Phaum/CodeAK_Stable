import React, { useState, useEffect } from 'react';
import ProTable from "@ant-design/pro-table";
import { PageContainer } from "@ant-design/pro-components";
import { Button, message, Modal, Form, Input, InputNumber, Spin, Table, Select, Typography } from 'antd';
import { useMediaQuery } from 'react-responsive';
import { baseBackendUrl } from '../../shared/constants';
import {useNavigate} from "react-router-dom";
import {fetchProfile} from "../../components/Profile";
const { Title } = Typography;

async function fetchTeams() {
    const token = localStorage.getItem("token");
    const response = await fetch(`${baseBackendUrl}/teams`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error("Ошибка получения данных");
    return response.json();
}

async function addTeam(teamData) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${baseBackendUrl}/teams`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(teamData),
    });
    if (!response.ok) throw new Error("Ошибка добавления команды");
    return response.json();
}

async function updateTeam(id, teamData) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${baseBackendUrl}/teams/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(teamData),
    });
    if (!response.ok) throw new Error("Ошибка обновления команды");
    return response.json();
}

async function deleteTeam(id) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${baseBackendUrl}/teams/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`
        },
    });
    if (!response.ok) throw new Error("Ошибка удаления команды");
    return response.json();
}

const TableManagement = () => {
    const [dataSource, setDataSource] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentTeam, setCurrentTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();
    const isMobile = useMediaQuery({ maxWidth: 767 });
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentParticipant, setCurrentParticipant] = useState(null);
    const [formIndividual] = Form.useForm();
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
        },
        {
            title: 'Действия',
            key: 'actions',
            render: (_, record) => (
                <div>
                    <Button type="link" onClick={() => openEditModal(record)} style={{ display: "block" }}>
                        Редактировать
                    </Button>
                    <Button type="link" danger onClick={() => handleDeleteTeam(record.id)} style={{ display: "block" }}>
                        Удалить
                    </Button>
                </div>
            ),
        },
    ];

    const participantColumns = [
        {
            title: 'Место',
            dataIndex: 'rank',
            key: 'rank',
            sorter: (a, b) => a.rank - b.rank,
        },
        {
            title: 'Имя',
            dataIndex: 'team_name',
            key: 'team_name',
            render: (text) => <strong>{text}</strong>,
        },
        {
            title: 'Очки',
            dataIndex: 'points',
            key: 'points',
            sorter: (a, b) => a.points - b.points,
        },
        {
            title: 'Действия',
            key: 'actions',
            render: (_, record) => (
                <div>
                    <Button type="link" onClick={() => {setCurrentParticipant(record); setIsModalOpen(true);}} style={{ display: "block" }}>
                        Редактировать
                    </Button>
                    <Button type="link" danger onClick={() => handleDelete(record.id)} style={{ display: "block" }}>
                        Удалить
                    </Button>
                </div>
            ),
        },
    ];

    const openAddModal = () => {
        form.resetFields();
        setIsAddModalOpen(true);
    };

    const openEditModal = (team) => {
        setCurrentTeam(team);
        form.setFieldsValue({
            team_name: team.team_name,
            points: team.points,
            wins: team.wins,
            losses: team.losses,
        });
        setIsEditModalOpen(true);
    };

    const handleAddTeam = async () => {
        try {
            const values = await form.validateFields();
            const newTeam = await addTeam({
                team_name: values.team_name,
                points: values.points,
                wins: values.wins || 0,
                losses: values.losses || 0,
            });
            setDataSource(prev => [...prev, newTeam]);
            message.success("Команда добавлена");
            setIsAddModalOpen(false);
        } catch (error) {
            message.error("Ошибка добавления команды");
        }
    };

    const handleEditTeam = async () => {
        try {
            const values = await form.validateFields();
            const updatedTeam = await updateTeam(currentTeam.id, {
                team_name: values.team_name,
                points: values.points,
                wins: values.wins || 0,
                losses: values.losses || 0,
            });
            setDataSource(prev =>
                prev.map(team => team.id === currentTeam.id ? updatedTeam : team)
            );
            message.success("Команда обновлена");
            setIsEditModalOpen(false);
        } catch (error) {
            message.error("Ошибка обновления команды");
        }
    };

    const handleDeleteTeam = async (id) => {
        try {
            await deleteTeam(id);
            setDataSource(prev => prev.filter(team => team.id !== id));
            message.success("Команда удалена");
        } catch (error) {
            message.error("Ошибка удаления команды");
        }
    };

    const fetchParticipants = async () => {
        try {
            const response = await fetch(`${baseBackendUrl}/teams/individuals`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const usersList = await fetch(`${baseBackendUrl}/admin-tools`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }).then(res => res.json());
            setUsers(usersList);
            const data = await response.json();
            setParticipants(data);
        } catch (error) {
            message.error("Ошибка загрузки участников");
        }
    };

    const handleSave = async () => {
        try {
            const method = currentParticipant?.id ? "PUT" : "POST";
            const url = currentParticipant?.id
                ? `${baseBackendUrl}/teams/individual/${currentParticipant.id}`
                : `${baseBackendUrl}/teams/individual`;

            await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(currentParticipant),
            });

            message.success("Данные сохранены!");
            fetchParticipants();
            setIsModalOpen(false);
        } catch (error) {
            message.error("Ошибка сохранения");
        }
    };

    const handleDelete = async (id) => {
        try {
            await fetch(`${baseBackendUrl}/teams/individual/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}`},
            });
            message.success("Участник удалён!");
            fetchParticipants();
        } catch (error) {
            message.error("Ошибка удаления");
        }
    };


    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
            <PageContainer
                title="Рейтинг команд"
                content="Управление командами: добавление, редактирование и удаление команд. Место определяется автоматически на основе очков."
            >
                <Button type="primary" onClick={openAddModal} style={{ marginBottom: 16 }}>
                    Добавить команду
                </Button>
                <Table
                    columns={columns}
                    dataSource={dataSource.filter((team) => !["none", "admin", "mentor"].includes(team.team_name))}
                    rowKey="id"
                    search={false}
                    pagination={{ pageSize: 10 }}
                    toolBarRender={() => []}
                    scroll={{ x: 'max-content' }}
                />
                <Title level={4} style={{ marginTop: 12 }}>Таблица индивидуальных участников</Title>
                <Button type="primary" onClick={() => { setCurrentParticipant({ team_name: "", points: 0 }); setIsModalOpen(true); }} style={{ marginTop: 16, marginBottom: 16   }}>
                    Добавить участника
                </Button>
                <Table
                    dataSource={participants}
                    columns={participantColumns}
                    rowKey="id"
                    scroll={{ x: 'max-content' }}
                />
                <Modal
                    title={isAddModalOpen ? "Добавить команду" : "Редактировать команду"}
                    visible={isAddModalOpen || isEditModalOpen}
                    onCancel={() => {
                        setIsAddModalOpen(false);
                        setIsEditModalOpen(false);
                    }}
                    onOk={isAddModalOpen ? handleAddTeam : handleEditTeam}
                >
                    <Form form={form} layout="vertical">
                        <Form.Item name="team_name" label="Название команды" rules={[{ required: true, message: "Введите название команды" }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="points" label="Очки" rules={[{ required: true, message: "Введите количество очков" }]}>
                            <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                    </Form>
                </Modal>
                <Modal
                    title={currentParticipant?.id ? "Редактировать участника" : "Добавить участника"}
                    open={isModalOpen}
                    onCancel={() => setIsModalOpen(false)}
                    onOk={handleSave}
                >
                    <Form form={formIndividual} layout="vertical">
                        {/* Выбор пользователя */}
                        <Form.Item
                            name="user_id"
                            label="Выберите пользователя"
                            rules={[{ required: true, message: "Выберите пользователя" }]}
                        >
                            <Select
                                placeholder="Выберите пользователя"
                                onChange={(value) => {
                                    const selectedUser = users.find(user => user.id === value);
                                    setCurrentParticipant({
                                        ...currentParticipant,
                                        user_id: value,
                                        team_name: selectedUser?.login || "",
                                    });
                                    formIndividual.setFieldsValue({ user_id: value });
                                }}
                            >
                                {users.map(user => (
                                    <Select.Option key={user.id} value={user.id}>
                                        {user.login}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        {/* Поле ввода очков */}
                        <Form.Item
                            name="points"
                            label="Очки"
                            rules={[{ required: true, message: "Введите количество очков" }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                onChange={(value) => {
                                    setCurrentParticipant({ ...currentParticipant, points: value });
                                    formIndividual.setFieldsValue({ points: value });
                                }}
                            />
                        </Form.Item>
                    </Form>

                </Modal>
            </PageContainer>
    );
};

export default TableManagement;
