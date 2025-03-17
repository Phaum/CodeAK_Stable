import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { ProForm, ProFormText } from '@ant-design/pro-components';
import { Card, message, Typography, Space, Button, Form, Modal, Input } from 'antd';
import { motion } from 'framer-motion';
import "./css/Register.css"
import {registerUser, verifyEmail} from '../components/LoginUser';

const { Title, Text } = Typography;

function Register() {
    const [isAnimating, setIsAnimating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [email, setEmail] = useState("");
    const onFinish = async (values) => {
        try {
            const response = await registerUser(values);
            message.success("Регистрация успешна! Введите код подтверждения.");
            setEmail(values.email);
            setIsModalOpen(true);
        } catch (error) {
            message.error(error.message || "Ошибка регистрации");
        }
    };

    const handleVerify = async (values) => {
        try {
            await verifyEmail(email, values.code);
            message.success("Email подтверждён!");
            setIsModalOpen(false);
            setTimeout(() => navigate("/login"), 600);
        } catch (error) {
            message.error(error.message || "Ошибка подтверждения email");
        }
    };

    const handleLoginClick = () => {
        setIsAnimating(true);
        setTimeout(() => navigate('/login'), 600);
    };

    return (
        <div className="register-container">
            <motion.div
                className={`auth-container register`}
                initial={isSuccess ? { x: 0, y: 0, opacity: 1 } : { x: '100%', opacity: 0 }}
                animate={isAnimating ? { x: '100%', opacity: 0 } : { x: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
            >
                <Card className="register-card">
                    <Title level={2} className="register-title">Создайте аккаунт</Title>
                    <Text type="secondary">Заполните данные, чтобы зарегистрироваться</Text>

                    <ProForm
                        onFinish={onFinish}
                        submitter={{
                            render: (props) => (
                                <div className="button-group">
                                    <Space>
                                        <Button onClick={() => props.form?.resetFields()}>Сбросить</Button>
                                        <Button type="primary" onClick={() => props.form?.submit()}>Зарегистрироваться</Button>
                                    </Space>
                                </div>
                            ),
                        }}
                    >
                        <ProFormText
                            name="login"
                            fieldProps={{ prefix: <UserOutlined className="site-form-item-icon" /> }}
                            placeholder="Введите логин"
                            rules={[{ required: true, message: 'Введите логин' }]}
                        />
                        <ProFormText
                            name="username"
                            fieldProps={{ prefix: <UserOutlined className="site-form-item-icon" /> }}
                            placeholder="Введите имя"
                            rules={[{ required: true, message: 'Введите имя' }]}
                        />
                        <ProFormText
                            name="lastname"
                            fieldProps={{ prefix: <UserOutlined className="site-form-item-icon" /> }}
                            placeholder="Введите фамилию"
                            rules={[{ required: true, message: 'Введите фамилию' }]}
                        />
                        <ProFormText
                            name="usergroup"
                            fieldProps={{ prefix: <UserOutlined className="site-form-item-icon" /> }}
                            placeholder="Введите студенческую группу"
                            rules={[{ required: true, message: 'Введите студенческую группу' }]}
                        />
                        <ProFormText
                            name="email"
                            fieldProps={{ prefix: <MailOutlined className="site-form-item-icon" /> }}
                            placeholder="Введите email"
                            rules={[{ required: true, message: 'Введите email' }, { type: 'email', message: 'Неверный формат email' }]}
                        />
                        <ProFormText.Password
                            name="password"
                            fieldProps={{ prefix: <LockOutlined className="site-form-item-icon" /> }}
                            placeholder="Введите пароль"
                            rules={[{ required: true, message: 'Введите пароль' }]}
                        />
                    </ProForm>
                    <Button type="link" onClick={handleLoginClick}>
                        Уже есть аккаунт?
                    </Button>
                </Card>
            </motion.div>
            <Modal
                title="Подтверждение Email"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Text>На вашу почту <strong>{email}</strong> был отправлен код. Введите его ниже:</Text>
                <Form form={form} onFinish={handleVerify}>
                    <Form.Item
                        label="Введите код"
                        name="code"
                        rules={[{ required: true, message: "Введите код" }]}
                    >
                        <Input placeholder="Код из email" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit">
                        Подтвердить
                    </Button>
                </Form>
            </Modal>
        </div>
    );
}

export default Register;
