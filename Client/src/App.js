import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './elements/Login';
import Register from './elements/Register';
import Layout from './elements/Layout';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import AdminTools from './elements/management/AdminPanel';
import MentorRoute from './components/MentorRoute';
import MentorTools from './elements/management/MentorPanel';
import ResetPassword from './elements/ResetPassword';
import Welcome from './elements/Welcome';
import RatingTable from "./elements/RatingTable";
import Profile from "./elements/Profile";
import News from "./elements/News";
import Courses from "./elements/Courses";
import Contacts from './elements/Contacts';
import Dashboard from './elements/management/Dashboard';
import useHeartbeat from './components/useHeartbeat';
import CoursePageManagement from './elements/management/CoursePageManagement';
import CoursePage from './elements/CoursesPage';
import Logs from './elements/management/Logs';
import SupportPage from './elements/SupportPage';

function App() {
    useHeartbeat(60000);
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route element={<PrivateRoute />}>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Welcome />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/ratingtable" element={<RatingTable />} />
                        <Route path="/news" element={<News />} />
                        <Route path="/courses" element={<Courses />} />
                        <Route path="/contacts" element={<Contacts />} />
                        <Route path="/courses/:id" element={<CoursePage />} />
                        <Route path="/support" element={<SupportPage />} />
                        <Route element={<MentorRoute/>}>
                            <Route path="/mentor-tools" element={<MentorTools />} />
                            <Route path="/edit_mcourses/:id" element={<CoursePageManagement />} />
                            <Route path="/dashboard-view" element={<Dashboard />} />
                        </Route>
                        <Route element={<AdminRoute/>}>
                            <Route path="/admin-tools" element={<AdminTools />} />
                            <Route path="/edit_courses/:id" element={<CoursePageManagement />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/logs" element={<Logs />} />
                        </Route>
                    </Route>
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
