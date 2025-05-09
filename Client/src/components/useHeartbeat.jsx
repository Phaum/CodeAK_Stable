import { useEffect } from 'react';
import {baseBackendUrl} from "../shared/constants";

const useHeartbeat = (interval = 300000) => {
  useEffect(() => {
    const token = localStorage.getItem("token");
    const sendHeartbeat = async () => {
      try {
        await fetch(`${baseBackendUrl}/auth/active`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error("Ошибка отправки heartbeat:", error);
      }
    };
    sendHeartbeat();
    const intervalId = setInterval(sendHeartbeat, interval);
    return () => clearInterval(intervalId);
  }, [interval]);
};

export default useHeartbeat;
