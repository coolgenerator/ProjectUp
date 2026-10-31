import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Home from "./routes/Home.tsx";
import NotFound from "./routes/login/NotFound.tsx";
import About from "./routes/About.tsx";
import Login from "./routes/login/Login.tsx";
import Register from "./routes/login/Register.tsx";
import Projects from "./routes/projects/Projects.tsx";
// import Partners from "./routes/partners/Partners.tsx"; // hidden for demo
// import Jobs from "./routes/jobs/Jobs.tsx"; // hidden for demo
import Messages from "./routes/connect/Messages.tsx";
import Connections from "./routes/connect/Connections.tsx";
import Notifications from "./routes/connect/Notifications.tsx";
import EditProfile from "./routes/profile/EditProfileMultiStep.tsx";
import Welcome from "./routes/Welcome.tsx";
import MyProfile from "./routes/profile/MyProfile.tsx";
import MyPosts from "./routes/profile/MyPosts.tsx";
import MyProjects from "./routes/projects/MyProjects.tsx";
import ApplicationBoard from "./routes/projects/ApplicationBoard.tsx";
// import MySchedules from "./routes/MySchedules.tsx"; // hidden for demo
import Saved from "./routes/Saved.tsx";
import Settings from "./routes/Settings.tsx";
// import TestI18n from "./routes/TestI18n.tsx"; // hidden for demo
import VerificationPage from "./routes/login/VerificationPage.tsx";
import ForgetPassword from "./routes/login/ForgetPassword.tsx";
import ResetPassword from "./routes/login/ResetPassword.tsx";
import ProjectApply from "./routes/projects/ProjectApply.tsx";
import ProjectDashboard from "./routes/projects/ProjectDashboard.tsx";
import ProjectPostPage from "./routes/projects/ProjectPost.tsx";
import JoinProjectShare from "./routes/projects/JoinProjectShare.tsx";
import ProjectInvitation from "./routes/projects/ProjectInvitation.tsx";
import PostPage from "./routes/posts/PostPage.tsx";
import EditPost from "./routes/posts/EditPost.tsx";
import Terms from "./routes/legal/Terms.tsx";
import Privacy from "./routes/legal/Privacy.tsx";
import Cookies from "./routes/legal/Cookies.tsx";
import AIProjectAssistant from "./routes/projects/AIProjectAssistant.tsx";
import OAuthCallback from "./components/auth/OAuthCallback.tsx";
// import OrganizationDashboard from "./routes/organization/OrganizationDashboard.tsx"; // hidden for demo
// import OrganizationRegister from "./routes/organization/OrganizationRegister.tsx"; // hidden for demo
import PricingPage from "./routes/pricing/PricingPage.tsx";
// import SubscriptionSuccess from "./routes/subscription/SubscriptionSuccess.tsx"; // hidden for demo
// import Subscription from "./routes/account/Subscription.tsx"; // hidden for demo
// import Spark from "./routes/spark/Spark.tsx"; // hidden for demo
// import Build from "./routes/build/Build.tsx"; // hidden for demo
// import Resources from "./routes/resources/Resources.tsx"; // hidden for demo
// import Research from "./routes/research/Research.tsx"; // hidden for demo
// import PaperReader from "./components/papers/PaperReader.tsx"; // hidden for demo
// import Blueprint from "./pages/Blueprint.tsx"; // hidden for demo
import TaskManagement from "./components/project/TaskManagement/TaskManagement.tsx";
import CreateProject from "./routes/projects/CreateProject.tsx";
import AcceptInvite from "./routes/projects/AcceptInvite.tsx";
import IdeaWorkbench from "./routes/ideas/IdeaWorkbench.tsx";

// The landing page is for visitors; signed-in users start from the community feed, which shows their to-dos on top.
const Landing = () => {
    const isAuthenticated = useSelector((state: any) => state.auth.authenticated);
    return isAuthenticated ? <Navigate to="/home" replace /> : <Welcome />;
};

export function AppRouter() {
    return (
        <Routes>
            {/* General */}
            <Route path="/" element={<Landing />} />
            <Route path="/home" element={<Home />} />
            <Route path="/about" element={<About />} />

            {/* Legal */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />

            {/* Login */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forget-password" element={<ForgetPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify" element={<VerificationPage />} />

            {/* OAuth Callbacks */}
            <Route path="/auth/google/callback" element={<OAuthCallback />} />
            <Route path="/auth/facebook/callback" element={<OAuthCallback />} />
            <Route path="/auth/discord/callback" element={<OAuthCallback />} />

            {/* User */}
            <Route path="/profile" element={<MyProfile />} />
            <Route path="/profile/:shortId" element={<MyProfile />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/account" element={<Settings />} />
            <Route path="/my-profile" element={<MyProfile />} />
            <Route path="/my-posts" element={<MyPosts />} />
            <Route path="/my-projects" element={<MyProjects />} />
            <Route path="/applications" element={<ApplicationBoard />} />
            {/* <Route path="/my-schedules" element={<MySchedules />} /> */}
            <Route path="/saved" element={<Saved />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/:tab" element={<Settings />} />
            {/* <Route path="/test-i18n" element={<TestI18n />} /> */}

            {/* Posts */}
            <Route path="/post/:shortId" element={<PostPage />} />
            <Route path="/edit-post/:shortId" element={<EditPost />} />

            {/* Features */}
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:chatId" element={<Messages />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/notifications" element={<Notifications />} />

            {/* Ideas */}
            <Route path="/ideas" element={<IdeaWorkbench />} />

            {/* Projects */}
            <Route path="/projects" element={<Projects />} />
            <Route path="/create-project" element={<CreateProject />} />
            <Route path="/projects/share/:token" element={<JoinProjectShare />} />
            <Route path="/project/invite/:token" element={<ProjectInvitation />} />
            <Route path="/invites/:token" element={<AcceptInvite />} />
            <Route path="/project/:shortId/apply" element={<ProjectApply />} />
            <Route path="/ai-project-assistant" element={<AIProjectAssistant />} />
            <Route path="/project/:shortId/dashboard" element={<ProjectDashboard />} />
            <Route path="/project/:projectId/tasks" element={<TaskManagement />} />
            <Route path="/projectpost/:shortId" element={<ProjectPostPage />} />

            {/* Partners */}
            {/* <Route path="/partners" element={<Partners />} /> */}

            {/* Jobs */}
            {/* <Route path="/jobs" element={<Jobs />} /> */}

            {/* Organization */}
            {/* <Route path="/organization/dashboard" element={<OrganizationDashboard />} /> */}
            {/* <Route path="/organization/register" element={<OrganizationRegister />} /> */}

            {/* Pricing & Subscription */}
            <Route path="/pricing" element={<PricingPage />} />
            {/* <Route path="/subscription/success" element={<SubscriptionSuccess />} /> */}
            {/* <Route path="/account/subscription" element={<Subscription />} /> */}


            {/* New Sections */}
            {/* <Route path="/spark" element={<Spark />} /> */}
            {/* <Route path="/build" element={<Build />} /> */}

            {/* Resources */}
            {/* <Route path="/resources" element={<Resources />} /> */}
            {/* <Route path="/research" element={<Research />} /> */}

            {/* Papers */}
            {/* <Route path="/paper/:paperId" element={<PaperReader />} /> */}

            {/* Blueprint */}
            {/* <Route path="/blueprint" element={<Blueprint />} /> */}

            {/* Others */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}