import { Routes, Route } from "react-router-dom";
import { RequireAuth, GuestRoute, RequireRole } from "./auth/guards";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Education from "./pages/Education";
import Honors from "./pages/Honors";
import FieldTrips from "./pages/FieldTrips";
import Schedule from "./pages/Schedule";
import Settings from "./pages/Settings";
import Assistant from "./pages/Assistant";
import Announcements from "./pages/Announcements";
import Gallery from "./pages/Gallery";
import MyFiles from "./pages/MyFiles";
import Placeholder from "./pages/Placeholder";
import ProfilePage from "./pages/ProfilePage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import ClassroomLobby from "./pages/classroom/ClassroomLobby";
import ClassroomRoom from "./pages/classroom/ClassroomRoom";
import TeacherPanel from "./pages/classroom/TeacherPanel";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import { AppearanceProvider } from "./appearance/AppearanceContext";

export default function App() {
  return (
    <AppearanceProvider>
    <Routes>
      {/* public */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* protected */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/education" element={<Education />} />
          <Route path="/education/:grade" element={<Education />} />
          <Route path="/education/:grade/:classroom" element={<Education />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/classes" element={<ClassroomLobby />} />
          <Route path="/classes/room/:roomCode" element={<ClassroomRoom />} />
          <Route
            path="/classes/teach"
            element={
              <RequireRole roles={["teacher", "admin"]}>
                <TeacherPanel />
              </RequireRole>
            }
          />
          <Route
            path="/classes-old"
            element={
              <Placeholder
                title="کلاس‌ها"
                description="مدیریت کلاس‌های شما، محتوای آموزشی و تمرین‌های هر درس به‌زودی در این بخش قرار می‌گیرد."
                d="M4.5 13.5L12 7.5l7.5 6M4.5 20.25h15a1.5 1.5 0 001.5-1.5v-9a1.5 1.5 0 00-1.5-1.5h-15A1.5 1.5 0 003 9.75v9a1.5 1.5 0 001.5 1.5z"
              />
            }
          />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/my-files" element={<MyFiles />} />
          <Route
            path="/admin"
            element={
              <RequireRole roles={["admin"]}>
                <AdminDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireRole roles={["admin"]}>
                <AdminUsers />
              </RequireRole>
            }
          />
          <Route path="/honors" element={<Honors />} />
          <Route path="/field-trips" element={<FieldTrips />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
    </AppearanceProvider>
  );
}
