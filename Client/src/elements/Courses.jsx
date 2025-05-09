import React, { useState, useEffect } from "react";
import { Button, message, Row, Col, Typography, Spin } from "antd";
import { PageContainer } from "@ant-design/pro-components";
import ProCard from "@ant-design/pro-card";
import { useNavigate } from "react-router-dom";
import { baseBackendUrl } from "../shared/constants";
import {fetchProfile} from "../components/Profile";

const { Title, Paragraph } = Typography;

const CourseManagement = () => {
    const [courses, setCourses] = useState([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    document.title = "Курсы";
    const loadCourses = async () => {
        try {
            const response = await fetch(`${baseBackendUrl}/courses/view`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) throw new Error("Ошибка получения курсов");
            const data = await response.json();
            setCourses(data);
            setLoading(false);
        } catch (error) {
            message.error(error.message);
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
        loadCourses();
    }, []);

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <PageContainer
            title="Учебные материалы"
            content="Выберите раздел, который вас интересует, и изучайте материалы в удобном формате."
        >
            <Row gutter={[16, 16]}>
                {courses.map((course) => (
                    <Col key={course.id} xs={24} sm={12} md={8} lg={6}>
                        <ProCard
                            hoverable
                            bordered
                            style={{ width: '100%' }}
                            cover={
                                <img
                                    alt={course.title}
                                    src={course.imageUrl}
                                    style={{ objectFit: 'cover', height: 180, width: '100%' }}
                                />
                            }
                            actions={[
                                <Button ey="go" type="primary" onClick={() => navigate(`/courses/${course.id}`)}>
                                    Открыть курс
                                </Button>,
                            ]}
                        >
                            <Title level={4}>{course.title}</Title>
                            <Paragraph ellipsis={{ rows: 2 }}>
                                {course.description}
                            </Paragraph>
                        </ProCard>
                    </Col>
                ))}
            </Row>
        </PageContainer>

    );
};

export default CourseManagement;