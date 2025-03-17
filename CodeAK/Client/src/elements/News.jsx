import React, { useState, useEffect } from 'react';
import { PageContainer, ProList } from '@ant-design/pro-components';
import {Typography, Tag, Space, Button, Avatar, Modal, Spin} from 'antd';
import { useMediaQuery } from 'react-responsive';
import moment from 'moment';
import {fetchViewNews} from '../components/News';
import { baseBackendUrl } from '../shared/constants';
import MarkdownRenderer from "../components/MarkdownRenderer";
import {useNavigate} from "react-router-dom";
import {fetchProfile} from "../components/Profile";

const NewsPanel = () => {
    const { Text } = Typography;
    const [news, setNews] = useState([]);
    const isMobile = useMediaQuery({ maxWidth: 767 });
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    document.title = "Новости";
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
        const loadNews = async () => {
            try {
                const data = await fetchViewNews();
                const parsedData = data.map((item) => {
                    let tagsArray = [];
                    if (Array.isArray(item.tags)) {
                        tagsArray = item.tags;
                    } else if (typeof item.tags === 'string') {
                        tagsArray = item.tags
                            .replace(/^{|}$/g, '')
                            .split(',')
                            .map((tag) => tag.trim())
                            .filter(Boolean);
                    }
                    return { ...item, tags: tagsArray };
                });
                setNews(parsedData);
                setLoading(false);
            } catch (error) {
                console.error('Ошибка загрузки новостей:', error);
            }
        };
        loadNews();
    }, []);

    const handleReadMore = async (newsId) => {
        try {
            const response = await fetch(`${baseBackendUrl}/news/content/${newsId}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) {
                throw new Error('Ошибка при получении подробного содержания');
            }
            const data = await response.json();
            setDetailData(data);
            setIsDetailModalOpen(true);
        } catch (error) {
            console.error('Ошибка загрузки подробного содержания', error);
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <PageContainer
            title="Новости"
            content="Здесь вы можете ознакомиться с последними новостями и обновлениями"
        >
            <ProList
                rowKey="id"
                dataSource={news}
                itemLayout={isMobile ? 'vertical' : 'horizontal'}
                renderItem={(item, index, defaultDom) => (
                    <div
                        style={{
                            marginBottom: 16,
                            padding: 16,
                            borderRadius: 8,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        }}
                    >
                        {defaultDom}
                    </div>
                )}
                metas={{
                    title: {
                        dataIndex: 'title',
                        style: { whiteSpace: 'normal', wordWrap: 'break-word' },
                    },
                    avatar: {
                        render: (_, record) => (
                            <Avatar
                                shape="square"
                                size={isMobile ? 80 : 64}
                                src={`${baseBackendUrl}${record.imageurl}`}
                            />
                        ),
                    },
                    subTitle: {
                        render: (_, record) => (
                            <Space size="middle" style={{ flexWrap: 'wrap' }}>
                                <Text>{moment(record.date).format('YYYY-MM-DD')}</Text>
                                {record.tags?.map((tag) => (
                                    <Tag color="blue" key={tag}>
                                        {tag}
                                    </Tag>
                                ))}
                            </Space>
                        ),
                    },
                    description: {
                        dataIndex: 'description',
                        style: { whiteSpace: 'normal', wordWrap: 'break-word' },
                    },
                    actions: {
                        render: (_, record) => [
                            <Button key="readMore" type="link" onClick={() => handleReadMore(record.id)}>
                                Подробнее
                            </Button>,
                        ],
                    },
                }}
            />
            <Modal
                title={detailData ? detailData.title || 'Подробности новости' : 'Подробности новости'}
                visible={isDetailModalOpen}
                onCancel={() => setIsDetailModalOpen(false)}
                footer={null}
                width={1000}
            >
                {detailData ? (
                    <div>
                        {detailData.content_md && detailData.content_md.trim() ? (
                            <pre style={{ whiteSpace: 'pre-wrap' }}>
                                <MarkdownRenderer content={detailData.content_md}/>
                                </pre>
                        ) : (
                            <p>Подробное содержание новости отсутствует</p>
                        )}
                        {detailData.attachments && detailData.attachments.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <h3>Вложения</h3>
                                <ul>
                                    {detailData.attachments.map((att) => (
                                        <li key={att.id}>
                                            <a
                                                href={`${baseBackendUrl}${att.file_url}`}
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
                    </div>
                ) : (
                    <p>Загрузка...</p>
                )}
            </Modal>
        </PageContainer>
    );
};

export default NewsPanel;
