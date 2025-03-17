import React, { useState, useEffect } from 'react';
import { PageContainer, ProCard, ProDescriptions, ProForm, ProFormText } from '@ant-design/pro-components';
import { Avatar, Button, message, Row, Col, Spin, Upload } from 'antd';
import { fetchProfile, updateProfile, updateAvatar } from '../components/Profile';
import { useNavigate } from "react-router-dom";
import { baseBackendUrl } from '../shared/constants';

const Profile = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [avatar, setAvatar] = useState(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    document.title = "Профиль";
    useEffect(() => {
        document.title = 'Профиль'
        async function loadProfile() {
            try {
                const data = await fetchProfile(token);
                setProfile(data);
                setAvatar(data.avatar);
                console.log(data.avatar);
                setLoading(false);
            } catch (error) {
                localStorage.removeItem('token');
                navigate("/login");
            }
        }
        if (token) {
            loadProfile();
        }
    }, [token, navigate]);

    const handleSave = async (values) => {
        try {
            await updateProfile(values, token);
            message.success("Профиль успешно обновлён");
            setProfile(values);
            setEditing(false);
        } catch (error) {
            message.error(error.message);
        }
    };

    const handleCancel = () => {
        setEditing(false);
    };

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const handleAvatarUpload = async ({ file }) => {
        if (!file) return;
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            message.error("Файл слишком большой! Максимальный размер 10MB.");
            return;
        }
        try {
            const result = await updateAvatar(file, token);
            delay(2000).then(() => setAvatar(result.avatar));
            message.success("Аватар обновлён");
            message.info("Если фото не обновилось, обновите страницу");
            return result;
        } catch (error) {
            message.error(error.message);
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <PageContainer title="Профиль" content="Просмотр и редактирование информации о вашем профиле (фотогафию можно сменить нажав на нее!)">
            <ProCard style={{ textAlign: 'center' }}>
                <Upload showUploadList={false} customRequest={handleAvatarUpload}>
                    <Avatar
                        size={100}
                        src={avatar || `${baseBackendUrl}/uploads/default-avatar.png`}
                        style={{ cursor: "pointer", border: "2px solid #ccc" }}
                    />
                </Upload>
                {editing ? (
                    <ProForm
                        initialValues={profile}
                        onFinish={handleSave}
                        submitter={{
                            resetButtonProps: false,
                            searchConfig: { submitText: 'Сохранить' },
                            render: (props, doms) => [
                                <Button key="cancel" onClick={handleCancel}>Отмена</Button>,
                                ...doms,
                            ],
                        }}
                    >
                        <ProFormText name="login" label="Логин" rules={[{ required: true, message: 'Введите логин' }]} />
                        <Row gutter={16}>
                            <Col span={12}>
                                <ProFormText name="username" label="Имя" rules={[{ required: true, message: 'Введите имя' }]} />
                            </Col>
                            <Col span={12}>
                                <ProFormText name="lastname" label="Фамилия" rules={[{ required: true, message: 'Введите фамилию' }]} />
                            </Col>
                        </Row>
                        <ProFormText name="email" label="Email" rules={[{ required: true, message: 'Введите Email' }]} />
                        <ProFormText name="usergroup" label="Группа" />
                    </ProForm>
                ) : (
                    <>
                        <ProDescriptions title="Личная информация" dataSource={profile} column={2} columns={[
                            { title: 'Логин', dataIndex: 'login' },
                            { title: 'Имя', dataIndex: 'username' },
                            { title: 'Фамилия', dataIndex: 'lastname' },
                            { title: 'Email', dataIndex: 'email' },
                            { title: 'Группа', dataIndex: 'usergroup' },
                            { title: 'Команда', dataIndex: 'codegroup' },
                        ]} />
                        <Button type="primary" onClick={() => setEditing(true)} style={{ marginTop: 16 }}>Редактировать профиль</Button>
                    </>
                )}
            </ProCard>
        </PageContainer>
    );
};

export default Profile;
