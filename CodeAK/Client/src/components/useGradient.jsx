import { useState } from 'react';

export const useGradient = () => {
    const [isLogin, setIsLogin] = useState(true);

    const toggleGradient = (toLogin) => {
        setIsLogin(toLogin);
    };

    return { isLogin, toggleGradient };
};
