import React, { useState, useEffect } from "react";
import { PageContainer, ProCard } from "@ant-design/pro-components";
import { Row, Col, Space, Typography, Divider, Spin } from "antd";
import { Avatar } from "antd";
import { UserOutlined, MailOutlined, GithubOutlined } from "@ant-design/icons";
import {baseBackendUrl} from "../shared/constants";
import {useNavigate} from "react-router-dom";
import {fetchProfile} from "../components/Profile";

const { Title, Text } = Typography;

const Contacts = () => {
    const navigate = useNavigate();
    const [creators, setCreators] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    document.title = "Контакты";
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
        const fetchContacts = async () => {
            try {
                const response = await fetch(`${baseBackendUrl}/contacts`, { headers: { Authorization: `Bearer ${token}` } });
                if (!response.ok) {
                    throw new Error("Ошибка при загрузке данных");
                }
                const data = await response.json();
                setCreators(data);
                setLoading(false);
            } catch (error) {
                console.error(error);
            }
        };

        fetchContacts();
    }, []);

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <PageContainer
            title="Контакты разработчиков"
            content="Здесь представлены контакты разработчиков для связи"
        >
            <Row gutter={[16, 16]} justify="center">
                {creators.map((creator) => (
                    <Col key={creator.id} xs={24} sm={12} md={8}>
                        <ProCard
                            hoverable
                            bordered
                            style={{ textAlign: "center" }}
                            bodyStyle={{ padding: "24px" }}
                        >
                            <Space direction="vertical" align="center" size="middle">
                                <Avatar
                                    size={80}
                                    src={creator.avatar}
                                    icon={<UserOutlined />}
                                    alt={creator.name}
                                />
                                <Title level={4} style={{ margin: 0 }}>
                                    {creator.name}
                                </Title>
                                <Text type="secondary">{creator.role}</Text>
                                <Divider style={{ margin: "12px 0" }} />
                                <Space direction="vertical" size={4}>
                                    <Text>
                                        <MailOutlined
                                            style={{ marginRight: 4, color: "#1890ff" }}
                                        />
                                        <a href={`mailto:${creator.email}`}>{creator.email}</a>
                                    </Text>
                                    {creator.telegram && (
                                        <Text>
                                            <a
                                                href={creator.telegram}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Telegram
                                            </a>
                                        </Text>
                                    )}
                                    {creator.github && (
                                        <Text>
                                            <GithubOutlined
                                                style={{ marginRight: 4, color: "#1890ff" }}
                                            />
                                            <a
                                                href={creator.github}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                GitHub
                                            </a>
                                        </Text>
                                    )}
                                </Space>
                            </Space>
                        </ProCard>
                    </Col>
                ))}
            </Row>
        </PageContainer>
    );
};

export default Contacts;
