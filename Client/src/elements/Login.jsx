import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { ProForm, ProFormText } from '@ant-design/pro-components';
import { Card, message, Typography, Space, Button, Modal } from 'antd';
import { motion } from 'framer-motion';
import {baseBackendUrl} from "../shared/constants"
import "./css/Login.css"
import { loginUser } from '../components/LoginUser';

const { Title, Text } = Typography;

function Login() {
    const [isAnimating, setIsAnimating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        try {
            const response = await loginUser(values);
            if (!response.token) throw new Error('Токен не получен');

            localStorage.setItem('token', response.token);
            message.success('Успешный вход!');

            const theme = localStorage.getItem('theme');
            if(theme === "null"){
                localStorage.setItem('theme', 'realDark');
            }

            setTimeout(() => {
                window.location.href = '/';
            }, 600);
        } catch (error) {
            message.error('Ошибка входа');
        }
    };

    const handleRegisterClick = () => {
        setIsAnimating(true);
        setTimeout(() => navigate('/register'), 600);
    };

    const showForgotPasswordModal = () => {
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const handleForgotPassword = async (values) => {
        setIsSubmitting(true);
        try {
            const response = await fetch(`${baseBackendUrl}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(values),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            message.success('Письмо отправлено! Проверьте почту.');
            setIsModalVisible(false);
        } catch (error) {
            message.error('Ошибка при отправке запроса.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-container">
            <motion.div
                className={`auth-container ${isSuccess ? '' : 'login'}`}
                initial={isSuccess ? { x: 0, y: 0, opacity: 1 } : { x: '-100%', opacity: 0 }}
                animate={isSuccess ? { y: '-100%', opacity: 0 } : isAnimating ? { x: '-100%', opacity: 0 } : { x: 0, opacity: 1 }
                }
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
            >
                <Card className="login-card">
                    <Title level={2} className="login-title">
                        Вход в систему
                    </Title>
                    <Text type="secondary">Введите учетные данные, чтобы продолжить</Text>

                    <ProForm
                        onFinish={onFinish}
                        submitter={{
                            render: (props) => (
                                <div className="button-group">
                                    <Space>
                                        <Button onClick={() => props.form?.resetFields()}>
                                            Сбросить
                                        </Button>
                                        <Button type="primary" onClick={() => props.form?.submit()}>
                                            Войти
                                        </Button>
                                    </Space>
                                </div>
                            ),
                        }}
                    >
                        <ProFormText
                            name="loginoremail"
                            fieldProps={{ prefix: <MailOutlined className="site-form-item-icon" /> }}
                            placeholder="Введите логин или email"
                            rules={[{ required: true, message: 'Введите логин или email' }]}
                        />
                        <ProFormText.Password
                            name="password"
                            fieldProps={{ prefix: <LockOutlined className="site-form-item-icon" /> }}
                            placeholder="Введите пароль"
                            rules={[{ required: true, message: 'Введите пароль' }]}
                        />
                    </ProForm>
                    <Text>
                        <Button type="link" onClick={showForgotPasswordModal}>
                            Забыли пароль?
                        </Button>
                    </Text>
                    <Text>
                        Нет аккаунта?{' '}
                        <Button type="link" onClick={handleRegisterClick}>
                            Зарегистрироваться
                        </Button>
                    </Text>
                </Card>
                <Modal
                    title="Сброс пароля"
                    open={isModalVisible}
                    onCancel={handleCancel}
                    footer={null}
                >
                    <Text>
                        Введите ваш email, чтобы получить ссылку для сброса пароля.
                    </Text>
                    <ProForm onFinish={handleForgotPassword} submitter={false}>
                        <ProFormText
                            name="email"
                            fieldProps={{ prefix: <MailOutlined /> }}
                            placeholder="Введите email"
                            rules={[
                                { required: true, message: 'Введите email' },
                                { type: 'email', message: 'Неверный email' },
                            ]}
                        />
                        <Button type="primary" htmlType="submit" loading={isSubmitting} block>
                            Отправить ссылку
                        </Button>
                    </ProForm>
                </Modal>
            </motion.div>
        </div>
    );
}

export default Login;
