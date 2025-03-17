import React, { useEffect, useState } from 'react';
import {Card, Typography, Button, message, Spin, Modal, Form, Input, InputNumber, Row, Col, Space, Divider, Avatar } from "antd";
import { UserOutlined, MailOutlined, GithubOutlined, PlusOutlined } from "@ant-design/icons";
import {baseBackendUrl} from "../../shared/constants";
import ProTable from "@ant-design/pro-table";
import {PageContainer, ProCard} from "@ant-design/pro-components";
import { useNavigate } from "react-router-dom";
import { fetchProfile } from "../../components/Profile";

const { Text, Title } = Typography;

const ContactsManagement = () => {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentContact, setCurrentContact] = useState(null);
    const [form] = Form.useForm();
    const token = localStorage.getItem("token");

    document.title = "Контакты";

    useEffect(() => {
        async function loadProfile() {
            try {
                await fetchProfile(token);
            } catch (error) {
                localStorage.removeItem("token");
                navigate("/login");
            }
        }

        if (token) {
            loadProfile();
        }

        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            const response = await fetch(`${baseBackendUrl}/contacts`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Ошибка при загрузке данных");
            const data = await response.json();
            setContacts(data);
            setLoading(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const method = currentContact ? "PUT" : "POST";
            const url = currentContact
                ? `${baseBackendUrl}/contacts/${currentContact.id}`
                : `${baseBackendUrl}/contacts`;

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) throw new Error("Ошибка сохранения контакта");

            fetchContacts();
            setIsModalOpen(false);
            form.resetFields();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        try {
            await fetch(`${baseBackendUrl}/contacts/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchContacts();
        } catch (error) {
            console.error("Ошибка удаления контакта:", error);
        }
    };

    if (loading) return <Spin size="large" style={{ display: "block", margin: "50px auto" }} />;

    return (
        <PageContainer title="Контакты разработчиков" content="Здесь представлены контакты разработчиков">
            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                    setCurrentContact(null);
                    form.resetFields();
                    setIsModalOpen(true);
                }}
                style={{ marginBottom: 16 }}
            >
                Добавить контакт
            </Button>
            <Row gutter={[16, 16]} justify="center">
                {contacts.map((contact) => (
                    <Col key={contact.id} xs={24} sm={12} md={8}>
                        <ProCard
                            hoverable
                            bordered
                            style={{ textAlign: "center" }}
                            bodyStyle={{ padding: "24px" }}
                        >
                            <Space direction="vertical" align="center" size="middle">
                                <Avatar size={80} src={contact.avatar} icon={<UserOutlined />} alt={contact.name} />
                                <Title level={4} style={{ margin: 0 }}>{contact.name}</Title>
                                <Text type="secondary">{contact.role}</Text>
                                <Divider style={{ margin: "12px 0" }} />
                                <Text>
                                    <MailOutlined style={{ marginRight: 4, color: "#1890ff" }} />
                                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                                </Text>
                                <Button onClick={() => { form.setFieldsValue(contact); setCurrentContact(contact); setIsModalOpen(true); }}>Редактировать</Button>
                                <Button danger onClick={() => handleDelete(contact.id)}>Удалить</Button>
                            </Space>
                        </ProCard>
                    </Col>
                ))}
            </Row>
            <Modal
                title={currentContact ? "Редактировать контакт" : "Добавить контакт"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={handleSave}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Имя"
                        rules={[{ required: true, message: "Введите имя" }]}
                    >
                        <Input placeholder="Введите имя" />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ type: "email", message: "Введите корректный email" }]}
                    >
                        <Input placeholder="Введите email" />
                    </Form.Item>

                    <Form.Item
                        name="role"
                        label="Роль"
                        rules={[{ required: true, message: "Введите роль" }]}
                    >
                        <Input placeholder="Введите роль (например, Разработчик)" />
                    </Form.Item>

                    <Form.Item
                        name="telegram"
                        label="Telegram"
                    >
                        <Input placeholder="Введите ссылку на Telegram (https://t.me/username)" />
                    </Form.Item>

                    <Form.Item
                        name="github"
                        label="GitHub"
                    >
                        <Input placeholder="Введите ссылку на GitHub (https://github.com/username)" />
                    </Form.Item>

                    <Form.Item
                        name="avatar"
                        label="Аватар (URL)"
                    >
                        <Input placeholder="Введите ссылку на изображение (URL)" />
                    </Form.Item>
                </Form>
            </Modal>
        </PageContainer>
    );
};

export default ContactsManagement;
