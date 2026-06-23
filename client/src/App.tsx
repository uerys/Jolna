import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AdminUsers from "./pages/admin/Users";
import PhysioDashboard from "./pages/physio/Dashboard";
import PhysioClientDetail from "./pages/physio/ClientDetail";
import Profile from "./pages/Profile";
import ClientExercises from "./pages/client/Exercises";
import ClientHistory from "./pages/client/History";
import Chat from "./pages/Chat";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/about"} component={About} />
      <Route path={"/contact"} component={Contact} />
      <Route path={"/login"} component={Login} />
      <Route path={"/forgot-password"} component={ForgotPassword} />
      <Route path={"/register"} component={Register} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/chat"} component={Chat} />
      <Route path={"/chat/:clientId"} component={Chat} />

      {/* Admin */}
      <Route path={"/admin/users"} component={AdminUsers} />

      {/* Physiotherapist */}
      <Route path={"/physio"} component={PhysioDashboard} />
      <Route path={"/physio/clients/:id"} component={PhysioClientDetail} />

      {/* Client */}
      <Route path={"/client/exercises"} component={ClientExercises} />
      <Route
        path={"/client/today"}
        component={() => {
          const [, navigate] = useLocation();
          useEffect(() => {
            navigate("/client/exercises", { replace: true });
          }, [navigate]);
          return null;
        }}
      />
      <Route path={"/client/history"} component={ClientHistory} />

      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
