import React, {useEffect, useState} from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Modal, Button, Input, message, Typography, Spin } from 'antd';
import {fetchProfile} from "../components/Profile";
import {useNavigate} from "react-router-dom";
import {baseBackendUrl} from "../shared/constants"

const { Title, Paragraph } = Typography;

const Welcome = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    document.title = "Code.ak";
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
        setLoading(false);
        const checkEmailVerification = async () => {
            if (!token) return;
            try {
                const userData = await fetchProfile(token);
                console.log(userData);
                if (!userData.email_verified) {
                    setUserEmail(userData.email);
                    setIsModalOpen(true);
                }
            } catch (error) {
                console.error("Ошибка получения профиля:", error);
            }
        };
        checkEmailVerification();
    }, []);

    const handleResendVerification = async () => {
        try {
            const response = await fetch(`${baseBackendUrl}/user/resend-verification`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: userEmail }),
            });

            if (!response.ok) throw new Error("Ошибка повторной отправки подтверждения");

            message.success("Письмо с подтверждением отправлено!");
        } catch (error) {
            message.error(error.message);
        }
    };

    const handleVerifyCode = async () => {
        if (!verificationCode) {
            message.error("Введите код подтверждения");
            return;
        }
        setIsVerifying(true);
        try {
            const response = await fetch(`${baseBackendUrl}/user/verify-email`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: userEmail, verification_code: verificationCode }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Ошибка подтверждения");
            message.success("Email подтверждён!");
            setIsModalOpen(false);
            window.location.reload();
        } catch (error) {
            message.error(error.message);
        } finally {
            setIsVerifying(false);
        }
    };
    
    const contentStyle = {
        height: '160px',
        lineHeight: '160px',
        textAlign: 'center',
    };
    
    if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

    return (
        <div>
            <PageContainer
                header={{
                    title: 'Добро пожаловать!',
                }}
                content="Здесь вы можете получать актуальные новости и просматривать доступные материалы."
            >
                <ProCard
                    title="Основная информация"
                    headerBordered
                    style={{ marginBottom: 16 }}
                >
                    <Title level={2}>Привет, пользователь!</Title>
                    <Paragraph>
                        Команда Code.ak рада приветствовать вас на нашем портале. Здесь вы можете выполнять основные задачи,
                        отслеживать обновления и управлять своим аккаунтом. Нажмите на кнопку ниже, чтобы начать.
                    </Paragraph>

                </ProCard>

                <ProCard title="Последние новости" headerBordered>
                    <Paragraph>
                        Здесь будут отображаться последние новости и обновления системы. Вы всегда можете быть в курсе
                        всех событий, используя удобный интерфейс.
                    </Paragraph>
                </ProCard>
            </PageContainer>
            <Modal
                title="Подтверждение Email"
                open={isModalOpen}
                footer={[
                    <Button key="resend" type="primary" onClick={handleResendVerification}>
                        Отправить письмо
                    </Button>,
                    <Button key="verify" type="primary" loading={isVerifying} onClick={handleVerifyCode}>
                        Подтвердить
                    </Button>,
                ]}
            >
                <p>Ваш email <strong>{userEmail}</strong> не подтверждён.</p>
                <p>Введите код, который мы отправили на вашу почту:</p>
                <Input
                    placeholder="Введите код"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                />
            </Modal>
        </div>

    );
};

export default Welcome;
