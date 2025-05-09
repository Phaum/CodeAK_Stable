import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {PageContainer, ProList} from "@ant-design/pro-components";
import {Button, message, Modal, Input, Row, Col, Switch, Spin} from "antd";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import {baseBackendUrl} from "../../shared/constants";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import {
    fetchCourses,
    fetchSections,
    addSection,
    deleteSection,
    reorderSections,
    updateSectionContent,
    deleteFile
} from "../../components/Cource";
import { Form } from "antd";
import moment from "moment/moment";
import {fetchProfile} from "../../components/Profile";

const CoursePageManagement = () => {
    const navigate = useNavigate();
    const { id: courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [sections, setSections] = useState([]);
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [isViewSectionModalOpen, setIsViewSectionModalOpen] = useState(false);
    const [viewSectionId, setViewSectionId] = useState(null);
    const [viewSectionContent, setViewSectionContent] = useState("");
    const [viewSectionTitle, setViewSectionTitle] = useState("");
    const [form] = Form.useForm();
    const [editingSections, setEditingSections] = useState({});
    const [attachments, setAttachments] = useState([]);
    const [viewMode, setViewMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    document.title = course ? `Редактирование курса - ${course}` : "Загрузка...";
    useEffect(() => {
        async function loadProfile() {
            try {
                const data = await fetchProfile(token);
            } catch (error) {
                localStorage.removeItem('token');
                navigate("/login");
            }
        }
        const loadSections = async () => {
            try {
                const data = await fetchSections(courseId);
                console.log("data: ",data);
                setSections(data || []);
                const dataCourses = await fetchCourses(courseId);
                console.log("dataCourses: ",dataCourses);
                setCourse(dataCourses.title);
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

    const handleAddSection = async () => {
        try {
            const values = await form.validateFields();
            const newSection = await addSection(courseId, {
                section_title: values.section_title,
                content_md: "",
                section_description: values.section_description,
                section_order: sections.length + 1,
            });

            message.success("Раздел создан");
            setSections([...sections, newSection]);
            setIsSectionModalOpen(false);
            form.resetFields();
        } catch (error) {
            message.error(error.message);
        }
    };

    const openViewSectionModal = async (section) => {
        try {
            const data = await fetchSections(courseId, section.id);
            setViewSectionId(data.id);
            setViewSectionContent(data.content_md || "Нет содержимого");
            setAttachments(data.attachments || []);
            setViewSectionTitle(section.section_title);
            setIsViewSectionModalOpen(true);
        } catch (error) {
            message.error(error.message);
        }
    };

    const handleDeleteSection = async (sectionId) => {
        try {
            await deleteSection(courseId, sectionId);
            message.success("Раздел удалён");
            setSections(sections.filter((section) => section.id !== sectionId));
        } catch (error) {
            message.error("Ошибка удаления раздела");
        }
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;

        const reordered = Array.from(sections);
        const [movedSection] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, movedSection);

        setSections(reordered);

        try {
            await reorderSections(courseId, reordered);
            message.success("Порядок разделов сохранён!");
        } catch (error) {
            message.error("Ошибка сохранения порядка разделов");
        }
    };

    const handleSaveSection = async (section) => {
        const updatedData = editingSections[section.id] || {};
        const dateValue = updatedData.date
            ? updatedData.date
            : moment(section.date).format('YYYY-MM-DD');
        try {
            const response = await fetch(`${baseBackendUrl}/courses/${courseId}/sections/${section.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    section_title: updatedData.section_title,
                    content_md: updatedData.content_md,
                    visible: updatedData.visible,
                    section_description: updatedData.section_description,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Ошибка обновления раздела");
            }

            const updatedSection = await response.json();
            message.success("Раздел обновлен!");

            setSections((prev) =>
                prev.map((item) => (item.id === section.id ? { ...item, ...updatedSection } : item))
            );
        } catch (error) {
            message.error(error.message);
        }
    };

    const handleCancelSection = (sectionId) => {
        setEditingSections((prev) => {
            const newState = { ...prev };
            delete newState[sectionId];
            return newState;
        });
    };

    const handleFieldChange = (id, field, value) => {
        setEditingSections((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value,
            },
        }));
    };

    const handleSaveMdContent = async () => {
        if (!viewSectionContent.trim()) {
            message.error("Markdown содержимое не может быть пустым");
            return;
        }
        const formData = new FormData();
        formData.append('content_md', viewSectionContent);
        attachments.forEach((file) => {
            formData.append('attachments', file);
        });
        try {
            await updateSectionContent(courseId,viewSectionId,attachments, viewSectionContent);
            message.success("Markdown файл обновлён!");
            setIsViewSectionModalOpen(false);
            setAttachments([]);
        } catch (error) {
            message.error("Ошибка при сохранении Markdown-файла");
        }
    };

    const toggleVisibilitySection = async (section) => {
        try {
            const response = await fetch(`${baseBackendUrl}/courses/${courseId}/sections/visibility/${section.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ visible: !section.visible }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Ошибка изменения видимости");
            }

            const updatedSection = await response.json();
            message.success("Видимость раздела изменена!");

            setSections((prev) =>
                prev.map((item) => (item.id === section.id ? { ...item, visible: updatedSection.visible } : item))
            );
        } catch (error) {
            message.error(error.message);
        }
    };

    const handleDeleteFile = async (sectionId, attachment) => {
        try {
            await deleteFile(sectionId, attachment.id);
            message.success('Файл удалён');
            setAttachments(prev => prev.filter(att => att.id !== attachment.id));
        } catch (error) {
            console.error(error);
            message.error('Ошибка удаления файла');
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <PageContainer title={course} content="Управление разделами курса">
            <Button onClick={() => navigate(-1)} type="default" style={{ marginBottom: 16 }}>
                Назад
            </Button>
            <Button type="primary" onClick={() => setIsSectionModalOpen(true)} style={{ marginBottom: 16 }}>
                Добавить раздел
            </Button>
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="sections-list">
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}>
                            <ProList
                                rowKey="id"
                                dataSource={sections}
                                renderItem={(section, index, defaultDom) => (
                                    <Draggable draggableId={String(section.id)} index={index} key={section.id}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={{
                                                    marginBottom: 16,
                                                    padding: 16,
                                                    borderRadius: 8,
                                                    ...provided.draggableProps.style,
                                                }}
                                            >
                                                {defaultDom}
                                            </div>
                                        )}
                                    </Draggable>
                                )}
                                metas={{
                                    title: {
                                        render: (_, record) => (
                                            <Input
                                                value={editingSections[record.id]?.section_title ?? record.section_title}
                                                onChange={(e) =>
                                                    handleFieldChange(record.id, "section_title", e.target.value)
                                                }
                                            />
                                        ),
                                    },
                                    description: {
                                        render: (_, record) => (
                                            <Input.TextArea
                                                value={editingSections[record.id]?.section_description ?? record.section_description}
                                                onChange={(e) =>
                                                    handleFieldChange(record.id, "section_description", e.target.value)
                                                }
                                                rows={3}
                                            />
                                        ),
                                    },
                                    actions: {
                                        render: (_, record) => (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <Button key="save" type="primary" onClick={() => handleSaveSection(record)}>
                                                        Сохранить
                                                    </Button>
                                                    <Button key="cancel" onClick={() => handleCancelSection(record.id)}>
                                                        Отмена
                                                    </Button>
                                                </div>
                                                <Button key="delete" danger onClick={() => handleDeleteSection(record.id)}>
                                                    Удалить раздел
                                                </Button>
                                                <Switch
                                                    checked={record.visible}
                                                    onClick={() => toggleVisibilitySection(record)}
                                                    checkedChildren="Видимый"
                                                    unCheckedChildren="Скрыт"
                                                />
                                                <Button key="edit" type="primary"
                                                        onClick={() => openViewSectionModal(record)}
                                                >
                                                    Редактировать содержимое
                                                </Button>
                                            </div>
                                        ),
                                    },
                                }}
                            />
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            <Modal title="Добавить раздел" open={isSectionModalOpen} onCancel={() => setIsSectionModalOpen(false)} onOk={handleAddSection}>
                <Form form={form} layout="vertical">
                    <Form.Item name="section_title" label="Заголовок раздела" rules={[{ required: true, message: "Введите заголовок раздела" }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="section_description" label="Описание раздела" rules={[{ required: true, message: "Введите описание раздела" }]}>
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
            <Modal
                title={viewSectionTitle || "Содержимое раздела"}
                open={isViewSectionModalOpen}
                onCancel={() => setIsViewSectionModalOpen(false)}
                onOk={handleSaveMdContent}
                okText="Сохранить"
                width={1000}
            >
                <Button
                    onClick={() => setViewMode((prev) => !prev)}
                    style={{ marginBottom: 10 }}
                >
                    {viewMode ? "Редактировать" : "Просмотр"}
                </Button>
                <Row>
                    {viewMode ? (
                        <Col span={24}>
                            <MarkdownRenderer content={viewSectionContent} />
                        </Col>
                    ) : (
                        <>
                            <Col span={24}>
                                <Input.TextArea
                                    value={viewSectionContent}
                                    onChange={(e) => setViewSectionContent(e.target.value)}
                                    rows={10}
                                    placeholder="Отредактируйте Markdown‑содержание"
                                    autoSize={{ minRows: 3, maxRows: 90 }}
                                />
                            </Col>
                        </>
                    )}
                </Row>
                <Input
                    type="file"
                    multiple
                    onChange={(e) => {
                        setAttachments(Array.from(e.target.files));
                    }}
                />
                {attachments.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                        <strong>Прикреплённые файлы:</strong>
                        <ul>
                            {attachments.map((file, index) => (
                                <li>
                                    <li key={index}>{file.name || file.filename}</li>
                                    <Button
                                        type="danger"
                                        onClick={() => handleDeleteFile(file.section_id, file)}
                                        style={{ marginLeft: 8 }}
                                    >
                                        Удалить
                                    </Button>,
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
