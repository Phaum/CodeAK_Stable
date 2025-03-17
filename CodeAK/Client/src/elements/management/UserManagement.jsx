import React, { useEffect, useState, useRef } from "react";
import {Input, Select, Button, message, Modal, Space, Typography, Spin} from "antd";
import {LockOutlined, MailOutlined, SearchOutlined, UserOutlined} from "@ant-design/icons";
import { exportToExcel } from "../../components/ExportToExcel";
import {baseBackendUrl} from "../../shared/constants"
import {useLocation, useNavigate} from "react-router-dom";
import ProTable from "@ant-design/pro-table";
import {ProForm, ProFormText} from "@ant-design/pro-components";
import {registerUser} from "../../components/LoginUser";
import {fetchProfile} from "../../components/Profile";
const { Title, Text } = Typography;

const { Option } = Select;

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const token = localStorage.getItem("token");
    const searchInput = useRef(null);
    const [searchText, setSearchText] = useState("");
    const location = useLocation();
    const pathSegment = location.pathname.slice(1);
    const navigate = useNavigate();

    useEffect(() => {
        async function loadProfile() {
            try {
                const data = await fetchProfile(token);
            } catch (error) {
                localStorage.removeItem('token');
                navigate("/login");
            }
        }
        const fetchUsersAndGroups = async () => {
            try {
                const token = localStorage.getItem("token");
                const [usersResponse, groupsResponse] = await Promise.all([
                    fetch(`${baseBackendUrl}/admin-tools`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${baseBackendUrl}/teams`, { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                if (!usersResponse.ok || !groupsResponse.ok) {
                    throw new Error("Ошибка при загрузке данных");
                }
                const usersData = await usersResponse.json();
                const groupsData = await groupsResponse.json();
                setUsers(usersData);
                setGroups(groupsData.map(team => team.team_name));
                setLoading(false);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        if (token) {
            loadProfile();
        }
        fetchUsersAndGroups();
    }, [token]);

    const deleteUser = async (id) => {
        try {
            const response = await fetch(`${baseBackendUrl}/admin-tools/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                },
            });
            if (!response.ok) {
                throw new Error("Ошибка при удалении пользователя");
            }
            setUsers(users.filter((user) => user.id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

    const updateUser = async (id, updatedUser) => {
        try {
            const response = await fetch(`${baseBackendUrl}/admin-tools/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updatedUser),
            });
            if (!response.ok) {
                throw new Error("Ошибка при обновлении пользователя");
            }
            setUsers(users.map((user) => (user.id === id ? updatedUser : user)));
            alert(`Пользователь ${updatedUser.username} успешно обновлен!`);
        } catch (err) {
            alert(err.message);
        }
    };

    const updateUserGroup = async (id, newGroup) => {
        try {
            const response = await fetch(`${baseBackendUrl}/admin-tools/${id}/codegroup`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ newGroup }),
            });
            if (!response.ok) {
                throw new Error("Ошибка при изменении группы");
            }
            setUsers(users.map((user) => (user.id === id ? { ...user, codegroup: newGroup } : user)));
        } catch (err) {
            alert(err.message);
        }
    };

    const resetPassword = async (id) => {
        const newPassword = prompt("Введите новый пароль (мин. 6 символов):");
        if (!newPassword || newPassword.length < 6) {
            alert("Пароль должен содержать минимум 6 символов!");
            return;
        }
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${baseBackendUrl}/admin-tools/${id}/reset-password`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ newPassword }),
            });
            if (!response.ok) {
                throw new Error("Ошибка при изменении пароля");
            }
            alert("Пароль успешно изменен!");
        } catch (err) {
            alert(err.message);
        }
    };

    if (error) return <p>Ошибка: {error}</p>;

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    const handleSearch = (selectedKeys, confirm) => {
        confirm();
        setSearchText(selectedKeys[0]);
    };

    const handleReset = (clearFilters) => {
        clearFilters();
        setSearchText("");
    };

    const onFinish = async (values) => {
        try {
            const response = await registerUser(values);
            message.success('Успешная регистрация!');
            setTimeout(() => {
            }, 600);
        } catch (error) {
            message.error('Ошибка регистрации');
        }
    };

    const userColumns = [
        {
            title: "Логин",
            dataIndex: "login",
            key: "login",
            sorter: (a, b) => a.login.localeCompare(b.login),
            filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                <div style={{ padding: 8 }}>
                    <Input
                        ref={searchInput}
                        placeholder="Поиск пользователя"
                        value={selectedKeys[0]}
                        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                        onPressEnter={() => handleSearch(selectedKeys, confirm)}
                        style={{ width: 188, marginBottom: 8, display: "block" }}
                    />
                    <Button
                        type="primary"
                        onClick={() => handleSearch(selectedKeys, confirm)}
                        icon={<SearchOutlined />}
                        size="small"
                        style={{ width: 90, marginRight: 8 }}
                    >
                        Найти
                    </Button>
                    <Button onClick={() => handleReset(clearFilters)} size="small" style={{ width: 90 }}>
                        Сброс
                    </Button>
                </div>
            ),
            onFilter: (value, record) => record.login.toLowerCase().includes(value.toLowerCase()),
            render: (text, record) => (
                <Input
                    value={text}
                    onChange={(e) =>
                        setUsers((prev) =>
                            prev.map((u) =>
                                u.id === record.id ? { ...u, login: e.target.value } : u
                            )
                        )
                    }
                />
            ),
        },
        {
            title: "Имя",
            dataIndex: "username",
            key: "username",
            sorter: (a, b) => a.username.localeCompare(b.username),
            filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                <div style={{ padding: 8 }}>
                    <Input
                        ref={searchInput}
                        placeholder="Поиск пользователя"
                        value={selectedKeys[0]}
                        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                        onPressEnter={() => handleSearch(selectedKeys, confirm)}
                        style={{ width: 188, marginBottom: 8, display: "block" }}
                    />
                    <Button
                        type="primary"
                        onClick={() => handleSearch(selectedKeys, confirm)}
                        icon={<SearchOutlined />}
                        size="small"
                        style={{ width: 90, marginRight: 8 }}
                    >
                        Найти
                    </Button>
                    <Button onClick={() => handleReset(clearFilters)} size="small" style={{ width: 90 }}>
                        Сброс
                    </Button>
                </div>
            ),
            onFilter: (value, record) => record.username.toLowerCase().includes(value.toLowerCase()),
            render: (text, record) => (
                <Input
                    value={text}
                    onChange={(e) =>
                        setUsers((prev) =>
                            prev.map((u) =>
                                u.id === record.id ? { ...u, username: e.target.value } : u
                            )
                        )
                    }
                />
            ),
        },
        {
            title: "Фамилия",
            dataIndex: "lastname",
            key: "lastname",
            sorter: (a, b) => a.lastname.localeCompare(b.lastname),
            filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                <div style={{ padding: 8 }}>
                    <Input
                        ref={searchInput}
                        placeholder="Поиск пользователя"
                        value={selectedKeys[0]}
                        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                        onPressEnter={() => handleSearch(selectedKeys, confirm)}
                        style={{ width: 188, marginBottom: 8, display: "block" }}
                    />
                    <Button
                        type="primary"
                        onClick={() => handleSearch(selectedKeys, confirm)}
                        icon={<SearchOutlined />}
                        size="small"
                        style={{ width: 90, marginRight: 8 }}
                    >
                        Найти
                    </Button>
                    <Button onClick={() => handleReset(clearFilters)} size="small" style={{ width: 90 }}>
                        Сброс
                    </Button>
                </div>
            ),
            onFilter: (value, record) => record.lastname.toLowerCase().includes(value.toLowerCase()),
            render: (text, record) => (
                <Input
                    value={text}
                    onChange={(e) =>
                        setUsers((prev) =>
                            prev.map((u) =>
                                u.id === record.id ? { ...u, lastname: e.target.value } : u
                            )
                        )
                    }
                />
            ),
        },
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
            sorter: (a, b) => a.email.localeCompare(b.email),
            filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                <div style={{ padding: 8 }}>
                    <Input
                        ref={searchInput}
                        placeholder="Поиск пользователя"
                        value={selectedKeys[0]}
                        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                        onPressEnter={() => handleSearch(selectedKeys, confirm)}
                        style={{ width: 188, marginBottom: 8, display: "block" }}
                    />
                    <Button
                        type="primary"
                        onClick={() => handleSearch(selectedKeys, confirm)}
                        icon={<SearchOutlined />}
                        size="small"
                        style={{ width: 90, marginRight: 8 }}
                    >
                        Найти
                    </Button>
                    <Button onClick={() => handleReset(clearFilters)} size="small" style={{ width: 90 }}>
                        Сброс
                    </Button>
                </div>
            ),
            onFilter: (value, record) => record.email.toLowerCase().includes(value.toLowerCase()),
            render: (text, record) => (
                <Input
                    value={text}
                    disabled={pathSegment === 'mentor-tools'}
                    onChange={(e) =>
                        setUsers((prev) =>
                            prev.map((u) =>
                                u.id === record.id ? { ...u, email: e.target.value } : u
                            )
                        )
                    }
                />
            ),
        },
        {
            title: "Роль",
            dataIndex: "role",
            key: "role",
            sorter: (a, b) => a.role.localeCompare(b.role),
            render: (text, record) => (
                <Select
                    value={text}
                    disabled={pathSegment === 'mentor-tools' && (text === "admin" || text === "mentor")}
                    onChange={(value) =>
                        setUsers((prev) =>
                            prev.map((u) => (u.id === record.id ? { ...u, role: value } : u))
                        )
                    }
                    style={{ width: 120 }}
                >
                    {pathSegment !== 'mentor-tools' && (
                        <>
                            <Option value="admin">Админ</Option>
                            <Option value="mentor">Ментор</Option>
                        </>
                    )}

                    <Option value="student">Студент</Option>
                    <Option value="user">Пользователь</Option>
                </Select>

            ),
        },
        {
            title: "Команда",
            dataIndex: "codegroup",
            key: "codegroup",
            sorter: (a, b) => a.codegroup.localeCompare(b.codegroup),
            filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                <div style={{ padding: 8 }}>
                    <Select
                        showSearch
                        style={{ width: 188 }}
                        placeholder="Выберите команду"
                        value={selectedKeys[0]}
                        onChange={(value) => setSelectedKeys(value ? [value] : [])}
                    >
                        {groups.map((g) => (
                            <Select.Option key={g} value={g}>
                                {g}
                            </Select.Option>
                        ))}
                    </Select>
                    <div style={{ marginTop: 8 }}>
                        <Button
                            type="primary"
                            onClick={() => confirm()}
                            size="small"
                            style={{ width: 90, marginRight: 8 }}
                        >
                            Найти
                        </Button>
                        <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
                            Сброс
                        </Button>
                    </div>
                </div>
            ),
            onFilter: (value, record) => record.codegroup === value,
            render: (text, record) => (
                <Select
                    value={text}
                    onChange={(value) => updateUserGroup(record.id, value)}
                    style={{ width: 120 }}
                    disabled={pathSegment === 'mentor-tools' && (text === "admin" || text === "mentor")}
                >
                    {pathSegment === 'mentor-tools' ? (
                        groups
                            .filter((group) => group !== "admin" && group !== "mentor")
                            .map((codegroup) => (
                                <Select.Option
                                    key={codegroup}
                                    value={codegroup}
                                >
                                    {codegroup}
                                </Select.Option>
                            ))
                    ) : (
                        groups.map((codegroup) => (
                            <Select.Option key={codegroup} value={codegroup}>
                                {codegroup}
                            </Select.Option>
                        ))
                    )}
                </Select>
            ),
        },
        {
            title: "Действия",
            key: "actions",
            render: (_, record) => (
                <div>
                    {pathSegment !== 'mentor-tools'&&   (
                        <Button type="link" onClick={() => resetPassword(record.id)} style={{ display: "block" }}>
                            Изменить пароль
                        </Button>
                    )
                    }
                    <Button type="link" onClick={() => updateUser(record.id, record)} style={{ display: "block" }}>
                        Сохранить
                    </Button>
                    {pathSegment !== 'mentor-tools'&&   (
                        <Button type="link" danger onClick={() => deleteUser(record.id)} style={{ display: "block" }}>
                            Удалить
                        </Button>
                    )
                    }
                </div>
            ),
        },
    ];

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <div style={{ padding: 20 }}>
            <Button type="primary" onClick={() => exportToExcel(users, "users_data")} style={{ marginBottom: 16 }}>
                Экспорт в Excel
            </Button>
            {pathSegment !== 'mentor-tools'&&   (
                <Button type="primary" onClick={showModal} style={{ marginTop: 20 }}>
                    Добавить пользователя
                </Button>
            )
            }
            <ProTable
                columns={userColumns}
                dataSource={users}
                rowKey="id"
                search={false}
                pagination={{ pageSize: 10 }}
                toolBarRender={() => []}
                scroll={{ x: 'max-content' }}
            />
            <Modal title="Добавить пользователя" open={isModalOpen} onCancel={handleCancel} footer={null}>
                <Title level={2} className="register-title">Регистрация пользователя</Title>
                <ProForm
                    onFinish={onFinish}
                    submitter={{
                        render: (props) => (
                            <div className="button-group">
                                <Space>
                                    <Button onClick={() => props.form?.resetFields()}>Сбросить</Button>
                                    <Button type="primary" onClick={() => props.form?.submit()}>Зарегистрироваться</Button>
                                </Space>
                            </div>
                        ),
                    }}
                >
                    <ProFormText
                        name="login"
                        fieldProps={{ prefix: <UserOutlined className="site-form-item-icon" /> }}
                        placeholder="Введите логин"
                        rules={[{ required: true, message: 'Введите логин' }]}
                    />
                    <ProFormText
                        name="username"
                        fieldProps={{ prefix: <UserOutlined className="site-form-item-icon" /> }}
                        placeholder="Введите имя"
                        rules={[{ required: true, message: 'Введите имя' }]}
                    />
                    <ProFormText
                        name="lastname"
                        fieldProps={{ prefix: <UserOutlined className="site-form-item-icon" /> }}
                        placeholder="Введите фамилию"
                        rules={[{ required: true, message: 'Введите фамилию' }]}
                    />
                    <ProFormText
                        name="email"
                        fieldProps={{ prefix: <MailOutlined className="site-form-item-icon" /> }}
                        placeholder="Введите email"
                        rules={[{ required: true, message: 'Введите email' }, { type: 'email', message: 'Неверный формат email' }]}
                    />
                    <ProFormText.Password
                        name="password"
                        fieldProps={{ prefix: <LockOutlined className="site-form-item-icon" /> }}
                        placeholder="Введите пароль"
                        rules={[{ required: true, message: 'Введите пароль' }]}
                    />
                </ProForm>
            </Modal>
        </div>
    );
};

export default UserManagement;
