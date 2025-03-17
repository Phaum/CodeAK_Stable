import React, { useState, useEffect, useRef } from 'react';
import { PageContainer, ProList, ProFormItem } from '@ant-design/pro-components';
import {Space, Button, Upload, Avatar, message, Modal, Input, DatePicker, Row, Col, Switch, Spin } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useMediaQuery } from 'react-responsive';
import { useNavigate } from "react-router-dom";
import {
    ProForm,
    ProFormText,
    ProFormTextArea,
    ProFormDatePicker,
} from '@ant-design/pro-form';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import moment from 'moment';
import { baseBackendUrl } from "../../shared/constants";
import MarkdownRenderer from "../../components/MarkdownRenderer";

import {
    fetchNews,
    addNews,
    editNews,
    deleteNews,
    reorderNews,
    deleteFile,
} from '../../components/News';
import {fetchProfile} from "../../components/Profile";

const NewsManagement = () => {
    const [dataSource, setDataSource] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNews, setEditingNews] = useState({});
    const [currentRecordId, setCurrentRecordId] = useState(null);
    const fileInputRef = useRef(null);
    const [isContentModalOpen, setIsContentModalOpen] = useState(false);
    const [contentData, setContentData] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [currentNewsId, setCurrentNewsId] = useState(null);
    const [viewMode, setViewMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const isMobile = useMediaQuery({ maxWidth: 767 });

    useEffect(() => {
        async function loadProfile() {
            try {
                const data = await fetchProfile(token);
            } catch (error) {
                localStorage.removeItem('token');
                navigate("/login");
            }
        }
        const loadNews = async () => {
            try {
                const data = await fetchNews();
                const parsedData = data.map((item) => {
                    let tagsArray = [];
                    if (Array.isArray(item.tags)) {
                        tagsArray = item.tags;
                    } else if (typeof item.tags === 'string') {
                        tagsArray = item.tags
                            .replace(/^{|}$/g, '')
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean);
                    }
                    return { ...item, tags: tagsArray };
                });
                setDataSource(parsedData);
                setLoading(false);
            } catch (err) {
                console.error('Ошибка при загрузке новостей:', err);
                message.error('Ошибка при загрузке новостей');
            }
        };
        if (token) {
            loadProfile();
        }
        loadNews();
    }, []);

    const handleFinish = async (values) => {
        let tagsArray = [];
        if (values.tags) {
            tagsArray = values.tags.split(',').map((tag) => tag.trim());
        }

        const newsData = {
            ...values,
            tags: tagsArray,
            imageFile:
                values.imageFile &&
                values.imageFile[0] &&
                values.imageFile[0].originFileObj,
        };

        try {
            const newNews = await addNews(newsData);
            setDataSource((prev) => [...prev, newNews]);
            message.success('Новость добавлена');
            setIsModalOpen(false);
        } catch (err) {
            console.error('Ошибка при добавлении новости:', err);
            message.error('Ошибка при добавлении новости');
        }
        return true;
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const reordered = Array.from(dataSource);
        const [removed] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, removed);
        setDataSource(reordered);
        const payload = {
            reorderedNews: reordered.map((c, index) => ({ id: c.id, position: index + 1 }))
        };
        try {
            await reorderNews(payload);
            message.success('Порядок новостей обновлен');
        } catch (error) {
            console.error('Ошибка изменения порядка новостей:', error);
            message.error('Ошибка изменения порядка новостей');
        }
    };

    const handleFieldChange = (id, field, value) => {
        setEditingNews((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value,
            },
        }));
    };

    const handleSave = async (record) => {
        const updatedData = editingNews[record.id] || {};
        const dateValue = updatedData.date
            ? updatedData.date
            : moment(record.date).format('YYYY-MM-DD');

        const updatedNews = {
            ...record,
            ...updatedData,
            date: dateValue,
        };

        if (!updatedNews.imageFile) {
            updatedNews.imageUrl = record.imageurl;
        }
        if (!Array.isArray(updatedNews.tags)) {
            updatedNews.tags = [];
        }

        try {
            const updatedRecord = await editNews(record.id, updatedNews);
            setDataSource((prev) =>
                prev.map((item) => (item.id === record.id ? updatedRecord : item))
            );
            message.success('Новость обновлена');
            setEditingNews((prev) => {
                const newState = { ...prev };
                delete newState[record.id];
                return newState;
            });
        } catch (err) {
            console.error('Ошибка обновления новости:', err);
            message.error('Ошибка обновления новости');
        }
    };

    const handleCancel = (id) => {
        setIsModalOpen(false);
        setEditingNews((prev) => {
            const newState = { ...prev };
            delete newState[id];
            return newState;
        });
    };

    const handleDelete = async (record) => {
        try {
            await deleteNews(record.id);
            setDataSource((prev) => prev.filter((item) => item.id !== record.id));
            message.success('Новость удалена');
        } catch (err) {
            console.error('Ошибка удаления новости:', err);
            message.error('Ошибка удаления новости');
        }
    };

    const toggleVisibility = async (record) => {
        try {
            const response = await fetch(`${baseBackendUrl}/news/visibility/${record.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ visible: !record.visible }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Ошибка изменения видимости");
            }
            const data = await response.json();
            message.success(data.message || "Видимость изменена");
            setDataSource((prev) =>
                prev.map((item) =>
                    item.id === record.id ? { ...item, visible: data.visible } : item
                )
            );
        } catch (error) {
            message.error(error.message);
        }
    };

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleChangePhotoClick = (recordId) => {
        setCurrentRecordId(recordId);
        fileInputRef.current.click();
    };

    const handleFileChangeGlobal = async (e) => {
        const file = e.target.files[0];
        if (!file || !currentRecordId) return;
        const previewUrl = URL.createObjectURL(file);
        setDataSource((prev) =>
            prev.map((item) =>
                item.id === currentRecordId ? { ...item, imageurl: previewUrl } : item
            )
        );
        const record = dataSource.find((item) => item.id === currentRecordId);
        if (!record) return;
        const updatedNews = {
            title: record.title,
            description: record.description,
            date: moment(record.date).format('YYYY-MM-DD'),
            tags: record.tags,
            visible: record.visible,
            imageFile: file,
            imageurl: record.imageurl,
        };

        try {
            const updatedRecord = await editNews(currentRecordId, updatedNews);
            setDataSource((prev) =>
                prev.map((item) => (item.id === currentRecordId ? updatedRecord : item))
            );
            message.success('Фото обновлено');
        } catch (err) {
            console.error('Ошибка обновления фото:', err);
            message.error('Ошибка обновления фото');
        }
    };

    const openContentModal = async (newsId) => {
        setCurrentNewsId(newsId);
        try {
            const res = await fetch(`${baseBackendUrl}/news/content/${newsId}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setContentData(data.content_md || '');
            setAttachments(data.attachments || []);
            setIsContentModalOpen(true);
        } catch (error) {
            console.error("Ошибка получения подробного содержания", error);
            message.error("Не удалось загрузить подробное описание");
        }
    };

    const handleSaveContent = async () => {
        const formData = new FormData();
        formData.append('content_md', contentData);
        attachments.forEach((file) => {
            formData.append('attachments', file);
        });

        try {
            const res = await fetch(`${baseBackendUrl}/news/content/${currentNewsId}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });
            const updatedData = await res.json();
            message.success("Содержание обновлено");
            setIsContentModalOpen(false);
        } catch (error) {
            console.error("Ошибка обновления содержания", error);
            message.error("Ошибка обновления содержания");
        }
    };

    const handleDeleteFile = async (attachment) => {
        try {
            await deleteFile(attachment.id);
            message.success('Файл удалён');
            setAttachments(prev => prev.filter(att => att.id !== attachment.id));
        } catch (error) {
            console.error(error);
            message.error('Ошибка удаления файла');
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <div>
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChangeGlobal}
            />

            <Button type="primary" onClick={showModal} style={{ marginTop: 20 }}>
                Создать новость
            </Button>

            <Modal
                title="Создать новость"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <ProForm
                    onFinish={handleFinish}
                    submitter={{
                        searchConfig: { submitText: 'Добавить новость' },
                        resetButtonProps: { children: 'Очистить форму' }
                    }}
                    initialValues={{
                        title: '',
                        description: '',
                        date: null,
                        tags: '',
                        imageurl: '',
                    }}
                >
                    <ProFormText
                        name="title"
                        label="Заголовок новости"
                        placeholder="Введите заголовок новости"
                        rules={[{ required: true, message: 'Пожалуйста, введите заголовок' }]}
                    />
                    <ProFormTextArea
                        name="description"
                        label="Описание новости"
                        placeholder="Введите краткое описание новости"
                        rules={[{ required: true, message: 'Пожалуйста, введите описание' }]}
                    />
                    <ProFormDatePicker
                        name="date"
                        label="Дата новости"
                        placeholder="Выберите дату"
                        rules={[{ required: true, message: 'Пожалуйста, выберите дату' }]}
                    />
                    <ProFormText
                        name="tags"
                        label="Теги"
                        placeholder="Введите теги через запятую (например: Важное, Срочно)"
                    />
                    <ProFormItem
                        name="imageFile"
                        label="Изображение новости"
                        valuePropName="fileList"
                        getValueFromEvent={(e) => e?.fileList.slice(-1)} // Ограничение до 1 файла
                        rules={[{ required: true, message: "Пожалуйста, прикрепите изображение" }]}
                    >
                        <Upload
                            listType="picture"
                            maxCount={1} // Ограничение до 1 файла
                            beforeUpload={() => false} // Запрещаем автоматическую загрузку
                        >
                            <Button icon={<UploadOutlined />}>Загрузить изображение</Button>
                        </Upload>
                    </ProFormItem>
                </ProForm>
            </Modal>
            <Modal
                title="Редактировать содержимое (Markdown)"
                open={isContentModalOpen}
                onCancel={() => setIsContentModalOpen(false)}
                onOk={handleSaveContent}
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
                <pre style={{ whiteSpace: "pre-wrap" }}>
                    <MarkdownRenderer content={contentData} />
                </pre>
                        </Col>
                    ) : (
                        <>
                            <Col span={24}>
                                <Input.TextArea
                                    value={contentData}
                                    onChange={(e) => setContentData(e.target.value)}
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
                                        onClick={() => handleDeleteFile(file)}
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

            <PageContainer title="Новости" content="Редактирование новостей (интерфейс администратора)">
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="news-list">
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}>
                                <ProList
                                    rowKey="id"
                                    dataSource={dataSource}
                                    itemLayout={isMobile ? 'vertical' : 'horizontal'}
                                    renderItem={(item, index, defaultDom) => (
                                        <Draggable draggableId={String(item.id)} index={index} key={item.id}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    style={{
                                                        marginBottom: 16,
                                                        padding: 16,
                                                        borderRadius: 8,
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
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
                                                    value={editingNews[record.id]?.title ?? record.title}
                                                    onChange={(e) => handleFieldChange(record.id, 'title', e.target.value)}
                                                />
                                            ),
                                        },
                                        avatar: {
                                            render: (_, record) => (
                                                <Avatar
                                                    shape="square"
                                                    size={64}
                                                    src={baseBackendUrl + (editingNews[record.id]?.imageurl || record.imageurl)}
                                                />
                                            ),
                                        },
                                        subTitle: {
                                            render: (_, record) => (
                                                <Space size="middle" style={{ flexWrap: 'wrap' }}>
                                                    <DatePicker
                                                        value={moment(editingNews[record.id]?.date || record.date)}
                                                        onChange={(date, dateString) =>
                                                            handleFieldChange(record.id, 'date', dateString)
                                                        }
                                                    />
                                                    <Input
                                                        placeholder="Теги через запятую"
                                                        style={{ width: 200 }}
                                                        value={((editingNews[record.id]?.tags) || (record.tags) || []).join(', ')}
                                                        onChange={(e) =>
                                                            handleFieldChange(
                                                                record.id,
                                                                'tags',
                                                                e.target.value.split(',').map((tag) => tag.trim())
                                                            )
                                                        }
                                                    />
                                                </Space>
                                            ),
                                        },
                                        description: {
                                            render: (_, record) => (
                                                <Input.TextArea
                                                    value={editingNews[record.id]?.description ?? record.description}
                                                    onChange={(e) =>
                                                        handleFieldChange(record.id, 'description', e.target.value)
                                                    }
                                                    rows={4}
                                                />
                                            ),
                                        },
                                        actions: {
                                            render: (_, record) => (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <Button key="save" type="primary" onClick={() => handleSave(record)}>
                                                            Сохранить
                                                        </Button>
                                                        <Button key="cancel" onClick={() => handleCancel(record.id)}>
                                                            Отмена
                                                        </Button>
                                                    </div>
                                                    <Button key="delete" danger onClick={() => handleDelete(record)}>
                                                        Удалить новость
                                                    </Button>
                                                    <Switch
                                                        checked={record.visible}
                                                        onClick={() => toggleVisibility(record)}
                                                        checkedChildren="Видимый"
                                                        unCheckedChildren="Скрыт"
                                                    />
                                                    <Button key="changePhoto" onClick={() => handleChangePhotoClick(record.id)}>
                                                        Сменить фото
                                                    </Button>
                                                    <Button
                                                        key="edit"
                                                        type="primary"
                                                        onClick={() => openContentModal(record.id)}
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
            </PageContainer>
        </div>
    );
};

export default NewsManagement;
