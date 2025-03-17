import React, { useState, useEffect } from "react";
import { Button, Input, message, Row, Col, Spin, Switch, Modal, Form, Select } from "antd";
import { PageContainer } from "@ant-design/pro-components";
import ProCard from "@ant-design/pro-card";
import { useLocation,useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { baseBackendUrl } from "../../shared/constants";
import {fetchProfile} from "../../components/Profile";

const CourseManagement = () => {
    const [courses, setCourses] = useState([]);
    const navigate = useNavigate();
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isCourseModalGroupsOpen, setIsCourseModalGroupsOpen] = useState(false);
    const [editingCourses, setEditingCourses] = useState({});
    const [form] = Form.useForm();
    const token = localStorage.getItem('token');
    const [loading, setLoading] = useState(true);
    const [allTeams, setAllTeams] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const location = useLocation();
    const pathSegment = location.pathname.slice(1);

    const loadCourses = async () => {
        try {
            const response = await fetch(`${baseBackendUrl}/courses`, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) throw new Error("Ошибка получения курсов");
            const data = await response.json();
            setCourses(data);
            setLoading(false);
        } catch (error) {
            message.error(error.message);
        }
    };

    const fetchAllTeams = async () => {
        try {
            const response = await fetch(`${baseBackendUrl}/team-courses/teams/all`, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) throw new Error("Ошибка получения списка команд");
            return await response.json();
        } catch (error) {
            message.error(error.message);
            return [];
        }
    };

    const fetchCourseTeams = async (courseId) => {
        try {
            const response = await fetch(`${baseBackendUrl}/team-courses/${courseId}/teams`, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) throw new Error("Ошибка получения команд курса");
            return await response.json();
        } catch (error) {
            message.error(error.message);
            return [];
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
        // fetchGroups();
    }, []);

    const updateCourse = async (courseId) => {
        const updatedData = editingCourses[courseId];
        if (!updatedData) return;

        try {
            const response = await fetch(`${baseBackendUrl}/courses/${courseId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updatedData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Ошибка обновления курса");
            }

            message.success("Курс обновлён!");

            setCourses((prev) =>
                prev.map((course) =>
                    course.id === courseId ? { ...course, ...updatedData } : course
                )
            );

            setEditingCourses((prev) => {
                const updatedCourses = { ...prev };
                delete updatedCourses[courseId];
                return updatedCourses;
            });
        } catch (error) {
            message.error(error.message);
        }
    };

    const handleDeleteCourse = async (courseId) => {
        try {
            const response = await fetch(`${baseBackendUrl}/courses/${courseId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) throw new Error("Ошибка удаления курса");

            message.success("Курс удалён!");
            setCourses((prev) => prev.filter((c) => c.id !== courseId));
        } catch (error) {
            message.error(error.message);
        }
    };

    const toggleCourseVisibility = async (course) => {
        try {
            const response = await fetch(`${baseBackendUrl}/courses/${course.id}/visibility`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) throw new Error("Ошибка изменения видимости курса");

            const data = await response.json();
            message.success(data.message);

            setCourses((prev) =>
                prev.map((c) => (c.id === course.id ? { ...c, visible: data.visible } : c))
            );
        } catch (error) {
            message.error(error.message);
        }
    };

    const handleCreateCourse = async (values) => {
        try {
            const response = await fetch(`${baseBackendUrl}/courses`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) throw new Error("Ошибка создания курса");

            const course = await response.json();
            message.success("Курс создан!");
            setCourses((prev) => [...prev, course]);
            setIsCourseModalOpen(false);
            form.resetFields();
        } catch (error) {
            message.error(error.message);
        }
    };

    const openGroupsModal = async (courseId) => {
        setSelectedCourseId(courseId);
        const allTeamsList = await fetchAllTeams();
        const selectedTeamsList = await fetchCourseTeams(courseId);

        setAllTeams(allTeamsList);
        setSelectedGroups(selectedTeamsList.map(team => team.id));
        setIsCourseModalGroupsOpen(true);
    };

    const handleGroupChange = (value) => {
        setSelectedGroups(value);
    };

    const saveSelectedTeams = async () => {
        if (!selectedCourseId) return;
        try {
            const response = await fetch(`${baseBackendUrl}/team-courses/${selectedCourseId}/teams`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ teamIds: selectedGroups }),
            });

            if (!response.ok) throw new Error("Ошибка сохранения команд");

            message.success("Список команд обновлён!");
            setIsCourseModalGroupsOpen(false);
        } catch (error) {
            message.error(error.message);
        }
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const reorderedCourses = Array.from(courses);
        const [movedCourse] = reorderedCourses.splice(result.source.index, 1);
        reorderedCourses.splice(result.destination.index, 0, movedCourse);
        setCourses(reorderedCourses);
        const payload = {
            courses: reorderedCourses.map((c, index) => ({ id: c.id, course_order: index + 1 }))
        };
        try {
            const response = await fetch(`${baseBackendUrl}/courses/reorder`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Ошибка сохранения порядка курсов");
            }
            message.success("Порядок курсов сохранён!");
        } catch (error) {
            console.error("Ошибка:", error.message);
            message.error(error.message);
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <PageContainer title="Курсы" content="Редактирование курсов (интерфейс администратора)">
            <Button type="primary" onClick={() => setIsCourseModalOpen(true)} style={{ marginBottom: 20 }}>
                Добавить курс
            </Button>
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="courses">
                    {(provided) => (
                        <Row gutter={[16, 16]} {...provided.droppableProps} ref={provided.innerRef}>
                            {courses.map((course, index) => (
                                <Draggable key={course.id} draggableId={String(course.id)} index={index}>
                                    {(provided) => (
                                        <Col ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} xs={24} sm={12} md={8} lg={6}>
                                            <ProCard hoverable bordered>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                    <Input
                                                        value={editingCourses[course.id]?.title ?? course.title}
                                                        onChange={(e) =>
                                                            setEditingCourses((prev) => ({
                                                                ...prev,
                                                                [course.id]: { ...prev[course.id], title: e.target.value },
                                                            }))
                                                        }
                                                        placeholder="Название курса"
                                                        style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}
                                                    />
                                                    <Input.TextArea
                                                        value={editingCourses[course.id]?.description ?? course.description}
                                                        onChange={(e) =>
                                                            setEditingCourses((prev) => ({
                                                                ...prev,
                                                                [course.id]: { ...prev[course.id], description: e.target.value },
                                                            }))
                                                        }
                                                        placeholder="Описание курса"
                                                        autoSize={{ minRows: 2, maxRows: 5 }}
                                                    />
                                                    <Button key="primary" onClick={() => updateCourse(course.id)}>Сохранить</Button>
                                                    <Button key="delete" danger onClick={() => handleDeleteCourse(course.id)}>Удалить</Button>
                                                    <Switch
                                                        checked={course.visible}
                                                        onClick={() => toggleCourseVisibility(course)}
                                                        checkedChildren="Видимый"
                                                        unCheckedChildren="Скрыт"
                                                    />
                                                    {course.visible && (
                                                        <Button key="primary" onClick={() => openGroupsModal(course.id)}>Выбрать список групп</Button>
                                                        )}
                                                    <Button
                                                        key="default"
                                                        onClick={() => navigate(pathSegment !== 'mentor-tools'
                                                            ? `/edit_courses/${course.id}`
                                                            : `/edit_mcourses/${course.id}`
                                                        )}
                                                    >
                                                        Открыть курс
                                                    </Button>
                                                </div>
                                            </ProCard>
                                        </Col>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </Row>
                    )}
                </Droppable>
            </DragDropContext>
            <Modal
                title="Создать курс"
                open={isCourseModalOpen}
                onCancel={() => setIsCourseModalOpen(false)}
                footer={null}
            >
                <Form layout="vertical" form={form} onFinish={handleCreateCourse}>
                    <Form.Item
                        label="Название курса"
                        name="title"
                        rules={[{ required: true, message: "Введите название курса" }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item label="Описание курса" name="description">
                        <Input.TextArea rows={4} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit">
                        Создать курс
                    </Button>
                </Form>
            </Modal>
            <Modal
                title="Выбор списка групп"
                open={isCourseModalGroupsOpen}
                onCancel={() => setIsCourseModalGroupsOpen(false)}
                onOk={saveSelectedTeams}
                okText="Сохранить"
            >
                <Form layout="vertical">
                    <Form.Item label="Выберите группы">
                        <Select
                            mode="multiple"
                            style={{ width: "100%" }}
                            placeholder="Выберите группы"
                            value={selectedGroups}
                            onChange={handleGroupChange}
                        >
                            {allTeams
                                .filter((team) => !["none", "admin", "mentor"].includes(team.team_name))
                                .map((team) => (
                                <Select.Option key={team.id} value={team.id}>
                                    {team.team_name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </PageContainer>
    );
};

export default CourseManagement;


