import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
import Home from "./pages/Home";
import AdminUsers from "./pages/admin/Users";
import PhysioDashboard from "./pages/physio/Dashboard";
import PhysioClientDetail from "./pages/physio/ClientDetail";
import Profile from "./pages/Profile";
import ClientToday from "./pages/client/Today";
import ClientHistory from "./pages/client/History";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/profile"} component={Profile} />

      {/* Admin */}
      <Route path={"/admin/users"} component={AdminUsers} />

      {/* Physiotherapist */}
      <Route path={"/physio"} component={PhysioDashboard} />
      <Route path={"/physio/clients/:id"} component={PhysioClientDetail} />

      {/* Client */}
      <Route path={"/client/today"} component={ClientToday} />
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
