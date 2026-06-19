import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/auth";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorSearch from "./pages/DoctorSearch";
import Appointments from "./pages/Appointments";
import ConsultRoom from "./pages/ConsultRoom";
import MedicalRecords from "./pages/MedicalRecords";
import SymptomChecker from "./pages/SymptomChecker";
import AIChat from "./pages/AIChat";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientView from "./pages/PatientView";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster richColors position="top-right" />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Patient */}
            <Route path="/dashboard" element={<ProtectedRoute roles={["patient"]}><PatientDashboard /></ProtectedRoute>} />
            <Route path="/doctors" element={<ProtectedRoute roles={["patient"]}><DoctorSearch /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute roles={["patient", "doctor"]}><Appointments /></ProtectedRoute>} />
            <Route path="/consult/:id" element={<ProtectedRoute roles={["patient", "doctor"]}><ConsultRoom /></ProtectedRoute>} />
            <Route path="/records" element={<ProtectedRoute roles={["patient"]}><MedicalRecords /></ProtectedRoute>} />
            <Route path="/ai/symptom" element={<ProtectedRoute roles={["patient"]}><SymptomChecker /></ProtectedRoute>} />
            <Route path="/ai/chat" element={<ProtectedRoute roles={["patient"]}><AIChat /></ProtectedRoute>} />

            {/* Doctor */}
            <Route path="/doctor" element={<ProtectedRoute roles={["doctor"]}><DoctorDashboard /></ProtectedRoute>} />
            <Route path="/doctor/appointments" element={<ProtectedRoute roles={["doctor"]}><Appointments /></ProtectedRoute>} />
            <Route path="/doctor/patient/:patientId" element={<ProtectedRoute roles={["doctor"]}><PatientView /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
