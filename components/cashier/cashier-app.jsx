"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearToken, readToken } from "@/lib/api/client";
import { CashierDashboard } from "@/components/cashier/cashier-dashboard";
import { BrandMark } from "@/components/brand/brand-mark";
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

function destination(user) {
  if (!user?.is_active) {
    return "inactive";
  }
  if (user.restaurant_role === "cashier") {
    return "dashboard";
  }
  if (user.restaurant_role === "owner") {
    return "owner";
  }
  return "other";
}

export function CashierApp() {
  const router = useRouter();
  const [phase, setPhase] = useState("checking");
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [gateMessage, setGateMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stopped = false;
    const stored = readToken();

    if (!stored) {
      setPhase("login");
      return undefined;
    }

    apiFetch("/me", { token: stored })
      .then((nextUser) => {
        if (stopped) {
          return;
        }
        setToken(stored);
        setUser(nextUser);
        setPhase(destination(nextUser));
      })
      .catch((error) => {
        if (stopped) {
          return;
        }
        if (error.status === 401) {
          clearToken();
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

  useEffect(() => {
    if (phase === "owner") {
      router.replace("/owner");
    }
    if (phase === "login") {
      router.replace("/login");
    }
  }, [phase, router]);

  async function logout() {
    const current = token || readToken();
    if (current) {
      try {
        await apiFetch("/auth/logout", { token: current, method: "POST" });
      } catch {
        // A dead token still leaves this screen.
      }
    }
    clearToken();
    setToken(null);
    setUser(null);
    setPhase("login");
  }

  if (phase === "checking" || phase === "owner" || phase === "login") {
    return (
      <Gate>
        {cashierCopy.loadingSession}
      </Gate>
    );
  }

  if (phase === "inactive") {
    return (
      <Gate action={<HeaderExit onClick={logout} />}>
        {cashierCopy.inactive}
      </Gate>
    );
  }

  if (phase === "other") {
    return (
      <Gate action={<HeaderExit onClick={logout} />}>
        {cashierCopy.notRestaurant}
      </Gate>
    );
  }

  if (phase === "error" || !token || !user) {
    return (
      <Gate
        action={
          <HeaderExit onClick={() => {
            setPhase("checking");
            setAttempt((value) => value + 1);
          }}
          >
            إعادة المحاولة
          </HeaderExit>
        }
      >
        {gateMessage || cashierCopy.network}
      </Gate>
    );
  }

  return (
    <CashierDashboard
      token={token}
      user={user}
      onUnauthenticated={logout}
      onInactive={() => setPhase("inactive")}
    />
  );
}

function HeaderExit({ onClick, children = "خروج" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl bg-burgundy px-5 font-semibold text-on-primary"
    >
      {children}
    </button>
  );
}
