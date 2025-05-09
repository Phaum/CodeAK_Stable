import React, { useState, useEffect } from 'react';
import { ProLayout } from '@ant-design/pro-components';
import {Link, useLocation, Outlet, useNavigate, useRoutes} from 'react-router-dom';
import { Button } from 'antd';
import {
    BulbOutlined,
    HighlightOutlined,
    LogoutOutlined,
    ProfileOutlined,
    ReadOutlined,
    HomeOutlined,
    UserOutlined,
    ContactsOutlined,
    SlidersOutlined,
    AreaChartOutlined,
    FileSearchOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import {baseBackendUrl} from "../shared/constants"

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [theme, setTheme] = useState(localStorage.getItem('theme'));
    const [isAdmin, setIsAdmin] = useState(null);
    const [isMentor, setIsMentor] = useState(null);
    const token = localStorage.getItem('token');
    const [menuCollapsed, setMenuCollapsed] = useState(false);

    useEffect(() => {
        localStorage.setItem('theme', theme);
    });

    const handleMenuOpen = () => {
        if (window.innerWidth <= 768) {
            window.scrollTo({top: 0, behavior: "smooth"});
            document.body.style.overflow = "hidden";
        }
    };

    const handleMenuClose = () => {
        if (window.innerWidth <= 768) {
            document.body.style.overflow = "";
        }
    };


    const checkAdmin = async () => {
        try {
            const response = await fetch(`${baseBackendUrl}/isadmin/checkadmin`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data?.admin === true) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        } catch (error) {
            setIsAdmin(false);
        }
    };
    const checkMentor = async () => {
        try {
            const response = await fetch(`${baseBackendUrl}/ismentor/checkmentor`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data?.mentor === true) {
                setIsMentor(true);
            } else {
                setIsMentor(false);
            }
        } catch (error) {
            setIsMentor(false);
        }
    };
    checkAdmin();
    checkMentor();
    const menuData = [
        { path: '/profile', name: 'Профиль', icon: <UserOutlined /> },
        { path: '/ratingtable', name: 'Таблица рейтинга', icon: <ProfileOutlined /> },
        { path: '/news', name: 'Новости', icon: <HomeOutlined /> },
        { path: '/courses', name: 'Курсы', icon: <ReadOutlined /> },
        { path: '/contacts', name: 'Контакты', icon: <ContactsOutlined /> },
        { path: '/support', name: 'Поддержка', icon: <WarningOutlined /> },
    ];

    if (isMentor) {
        menuData.push(
            { path: '/mentor-tools', name: 'Инструменты ментора', icon: <SlidersOutlined /> },
            { path: '/dashboard-view', name: 'Дашборд', icon: <AreaChartOutlined /> },
        );
    }

    if (isAdmin) {
        menuData.push(
            { path: '/admin-tools', name: 'Инструменты администратора', icon: <SlidersOutlined /> },
            { path: '/dashboard', name: 'Дашборд', icon: <AreaChartOutlined /> },
            { path: '/logs', name: 'Логирование', icon: <FileSearchOutlined /> },
        );
    }

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'realDark' : 'light'));
    };

    const logout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <ProLayout
            title={
                <span
                    style={{ textDecoration: "none", color: "inherit" }}
                    onClick={() => navigate("/")}
                >
                    Code.ak
                </span>
            }
            logo={theme === 'light' ? '/icon.png' : '/icon1.png'}
            layout="mix"
            location={{ pathname: location.pathname }}
            route={{
                path: '/',
                routes: menuData,
            }}
            menuItemRender={(item, dom) => <Link to={item.path || '/'}>{dom}</Link>}
            fixSiderbar
            fixedHeader
            navTheme={theme}
            collapsed={menuCollapsed}
            onCollapse={(collapsed) => {
                setMenuCollapsed(collapsed);
                if (!collapsed) {
                    handleMenuOpen();
                } else {
                    handleMenuClose();
                }
            }}
            rightContentRender={() => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Button
                        onClick={toggleTheme}
                        icon={theme === 'light' ? <BulbOutlined /> : <HighlightOutlined />}
                    />
                    <Button danger onClick={logout} icon={<LogoutOutlined />} />
                </div>
            )}
        >
            <Outlet />
        </ProLayout>
    );
};

export default Layout;
