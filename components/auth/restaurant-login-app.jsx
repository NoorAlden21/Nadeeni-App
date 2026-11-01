"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { CashierLogin } from "@/components/cashier/cashier-login";
import { apiFetch, clearToken, readToken, writeToken } from "@/lib/api/client";
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

function destination(user) {
  if (!user?.is_active) {
    return "inactive";
  }
  if (user.restaurant_role === "cashier") {
    return "cashier";
  }
  if (user.restaurant_role === "owner") {
    return "owner";
  }
  return "other";
}

export function RestaurantLoginApp() {
  const router = useRouter();
  const [phase, setPhase] = useState("checking");
  const [token, setToken] = useState(null);
  const [notice, setNotice] = useState("");
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
        const nextPhase = destination(nextUser);
        if (nextPhase === "other") {
          clearToken();
          setNotice(cashierCopy.notRestaurant);
          setPhase("login");
          apiFetch("/auth/logout", { token: stored, method: "POST" }).catch(() => {});
          return;
        }
        setToken(stored);
        setPhase(nextPhase);
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
    if (phase === "cashier") {
      router.replace("/cashier");
    }
    if (phase === "owner") {
      router.replace("/owner");
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
    setNotice("");
    setPhase("login");
  }

  async function handleLogin(session) {
    const nextUser = session?.user;
    const nextPhase = destination(nextUser);
    if (nextPhase === "other") {
      if (session?.token) {
        try {
          await apiFetch("/auth/logout", { token: session.token, method: "POST" });
        } catch {
          // The screen still refuses this session.
        }
      }
      setNotice(cashierCopy.notRestaurant);
      return;
    }

    writeToken(session.token);
    setToken(session.token);
    setNotice("");
    setPhase(nextPhase);
  }

  if (phase === "checking" || phase === "cashier" || phase === "owner") {
    return <Gate>{cashierCopy.loadingSession}</Gate>;
  }

  if (phase === "inactive") {
    return <Gate action={<ExitButton onClick={logout} />}>{cashierCopy.inactive}</Gate>;
  }

  if (phase === "error") {
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

  return <CashierLogin notice={notice} onSuccess={handleLogin} />;
}
