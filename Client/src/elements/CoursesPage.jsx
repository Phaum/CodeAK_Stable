import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer, ProList } from "@ant-design/pro-components";
import { Button, message, Modal, Spin } from "antd";
import MarkdownRenderer from "../components/MarkdownRenderer";
import {
    fetchCourses,
    fetchViewSections,
} from "../components/Cource";
import { fetchProfile } from "../components/Profile";
import {baseBackendUrl} from "../shared/constants";

const CoursePageManagement = () => {
    const navigate = useNavigate();
    const { id: courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [sections, setSections] = useState([]);
    const [description, setDescription] = useState(null);
    const [isViewSectionModalOpen, setIsViewSectionModalOpen] = useState(false);
    const [viewSectionContent, setViewSectionContent] = useState("");
    const [viewSectionTitle, setViewSectionTitle] = useState("");
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");
    const isMobile = window.innerWidth <= 768;
    document.title = course ? `${course}` : "Загрузка...";
    useEffect(() => {
        async function loadProfile() {
            try {
                await fetchProfile(token);
            } catch (error) {
                localStorage.removeItem("token");
                navigate("/login");
            }
        }

        const loadSections = async () => {
            try {
                const sectionsData = await fetchViewSections(courseId);
                console.log(sectionsData);
                setSections(sectionsData || []);

                const courseData = await fetchCourses(courseId);
                setCourse(courseData.title);
                setDescription(courseData.description);
                setAttachments(courseData.attachments || []);
                setLoading(false);
            } catch (error) {
                message.error(error.message);
            }
        };

        if (token) {
            loadProfile();
        }
        if (courseId) loadSections();
    }, [courseId]);

    const openViewSectionModal = async (section) => {
        try {
            const data = await fetchViewSections(courseId, section.id);
            setViewSectionContent(data.content_md || "Нет содержимого");
            setAttachments(data.attachments || []);
            setViewSectionTitle(section.section_title);
            setIsViewSectionModalOpen(true);
        } catch (error) {
            message.error(error.message);
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <PageContainer title={course} content={description}>
            <Button onClick={() => navigate(-1)} type="default" style={{ marginBottom: 16 }}>
                Назад
            </Button>
            <ProList
                rowKey="id"
                dataSource={sections}
                itemLayout={isMobile ? "vertical" : "horizontal"}
                renderItem={(section, index, defaultDom) => (
                    <div
                        style={{
                            marginBottom: 16,
                            padding: 16,
                            borderRadius: 8,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                        }}
                    >
                        {defaultDom}
                    </div>
                )}
                metas={{
                    title: {
                        dataIndex: "section_title",
                        style: { whiteSpace: "normal", wordWrap: "break-word" },
                    },
                    description: {
                        dataIndex: "section_description",
                        style: { whiteSpace: "normal", wordWrap: "break-word" },
                    },
                    actions: {
                        render: (_, record) => [
                            <Button key="readMore" type="link" onClick={() => openViewSectionModal(record)}>
                                Подробнее
                            </Button>,
                        ],
                    },
                }}
            />
            <Modal
                title={viewSectionTitle || "Содержимое раздела"}
                open={isViewSectionModalOpen}
                onCancel={() => setIsViewSectionModalOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setIsViewSectionModalOpen(false)}>
                        Закрыть
                    </Button>
                ]}
                width={1000}
            >
                <MarkdownRenderer content={viewSectionContent} />
                {attachments.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                        <strong>Прикреплённые файлы:</strong>
                        <ul>
                            {attachments.map((att) => (
                                <li key={att.id}>
                                    <a
                                        href={`${baseBackendUrl}${att.file_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {att.filename}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </Modal>
        </PageContainer>
    );
};

export default CoursePageManagement;
