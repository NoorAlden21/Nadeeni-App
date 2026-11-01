"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import {
  apiFetch,
  clearAdminToken,
  readAdminToken,
  writeAdminToken,
} from "@/lib/api/client";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminLogin } from "@/components/admin/admin-login";
import { cashierCopy, staffErrorText } from "@/lib/cashier/orders";

function Gate({ children, action }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ivory px-4 text-center">
      <BrandMark className="h-12 w-12" />
      <p className="max-w-sm text-base font-medium text-burgundy-deep">{children}</p>
      {action}
    </div>
  );
}

function ExitButton({ onClick, children = "خروج" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl bg-burgundy px-5 font-semibold text-ivory"
    >
      {children}
    </button>
  );
}

export function AdminApp() {
  const [phase, setPhase] = useState("checking");
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [notice, setNotice] = useState("");
  const [gateMessage, setGateMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stopped = false;
    const stored = readAdminToken();

    if (!stored) {
      setPhase("login");
      return undefined;
    }

    apiFetch("/me", { token: stored })
      .then((nextUser) => {
        if (stopped) {
          return;
        }
        if (!nextUser?.is_platform_admin) {
          clearAdminToken();
          setPhase("login");
          setNotice(cashierCopy.notAdmin);
          return;
        }
        setToken(stored);
        setUser(nextUser);
        setPhase(nextUser.is_active ? "ready" : "inactive");
      })
      .catch((error) => {
        if (stopped) {
          return;
        }
        if (error.status === 401) {
          clearAdminToken();
          setPhase("login");
          return;
        }
        setGateMessage(staffErrorText(error));
        setPhase("error");
      });

    return () => {
      stopped = true;
    };
  }, [attempt]);

  async function logout() {
    const current = token || readAdminToken();
    if (current) {
      try {
        await apiFetch("/auth/logout", { token: current, method: "POST" });
      } catch {
        // A dead token still leaves this screen.
      }
    }
    clearAdminToken();
    setToken(null);
    setUser(null);
    setNotice("");
    setPhase("login");
  }

  async function handleLogin(session) {
    if (!session?.user?.is_platform_admin) {
      if (session?.token) {
        try {
          await apiFetch("/auth/logout", { token: session.token, method: "POST" });
        } catch {
          // The screen still refuses a non-admin session.
        }
      }
      setNotice(cashierCopy.notAdmin);
      return;
    }

    writeAdminToken(session.token);
    setToken(session.token);
    setUser(session.user);
    setNotice("");
    setPhase(session.user.is_active ? "ready" : "inactive");
  }

  if (phase === "checking") {
    return <Gate>{cashierCopy.loadingSession}</Gate>;
  }

  if (phase === "login") {
    return <AdminLogin notice={notice} onSuccess={handleLogin} />;
  }

  if (phase === "inactive") {
    return <Gate action={<ExitButton onClick={logout} />}>{cashierCopy.inactive}</Gate>;
  }

  if (phase === "error" || !token || !user) {
    return (
      <Gate
        action={
          <ExitButton
            onClick={() => {
              setPhase("checking");
              setAttempt((value) => value + 1);
            }}
          >
            إعادة المحاولة
          </ExitButton>
        }
      >
        {gateMessage || cashierCopy.network}
      </Gate>
    );
  }

  return <AdminDashboard token={token} user={user} onUnauthenticated={logout} />;
}
