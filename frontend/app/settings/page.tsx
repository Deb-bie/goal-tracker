"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import CalendarSyncCard from "@/components/CalendarSyncCard";

function SettingsContent() {
  return (
    <div className="animate-fade-up space-y-6">
      <h1 className="font-display text-2xl font-bold text-slate-900">Settings</h1>
      <CalendarSyncCard />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
