import { LockOutlined } from '@ant-design/icons';
import { ProForm, ProFormText } from '@ant-design/pro-components';
import { Card, message, Typography, Button } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {baseBackendUrl} from "../shared/constants"

const { Title, Text } = Typography;

function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onFinish = async (values) => {
        setIsSubmitting(true);
        try {
            const response = await fetch(`${baseBackendUrl}/auth/reset-password/${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: values.password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Ошибка при сбросе пароля.');

            message.success('Пароль успешно изменён!');
            navigate('/login');
        } catch (error) {
            message.error(error?.message || 'Ошибка при сбросе пароля.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div className="register-container">
            <Card className="reset-password-card">
                <Title level={2}>Установите новый пароль</Title>
                <Text type="secondary">Введите новый пароль для вашего аккаунта</Text>

                <ProForm
                    onFinish={onFinish}
                    submitter={false}
                >
                    <ProFormText.Password
                        name="password"
                        fieldProps={{ prefix: <LockOutlined /> }}
                        placeholder="Введите новый пароль"
                        rules={[{ required: true, message: 'Введите новый пароль' }]}
                    />
                    <Button type="primary" htmlType="submit" loading={isSubmitting} block>
                        Сохранить пароль
                    </Button>
                </ProForm>
            </Card>
        </motion.div>
    );
}

export default ResetPassword;
