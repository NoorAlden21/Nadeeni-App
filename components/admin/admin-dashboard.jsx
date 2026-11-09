"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { AccountPanel } from "@/components/admin/account-panel";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PlanPanel } from "@/components/admin/plan-panel";
import { RestaurantPanel } from "@/components/admin/restaurant-panel";
import { apiFetch } from "@/lib/api/client";
import { adminErrorText, sortByName } from "@/lib/admin/format";
import { staffErrorText } from "@/lib/cashier/orders";
import { readFeatures } from "@/lib/features";

function HeaderButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl px-3 text-sm font-medium text-ink/55 underline-offset-4 transition duration-300 hover:text-burgundy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
    >
      {children}
    </button>
  );
}

function tabClass(active) {
  return `inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl px-4 text-sm font-semibold ${
    active ? "bg-burgundy text-on-primary" : "bg-white text-burgundy-deep ring-1 ring-burgundy/15"
  }`;
}

export function AdminDashboard({ token, user, onUnauthenticated }) {
  const [tab, setTab] = useState("restaurants");
  const [restaurants, setRestaurants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState("");
  const [planTarget, setPlanTarget] = useState(null);
  const [accountTarget, setAccountTarget] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const onUnauthenticatedRef = useRef(onUnauthenticated);

  useEffect(() => {
    onUnauthenticatedRef.current = onUnauthenticated;
  }, [onUnauthenticated]);

  useEffect(() => {
    let stopped = false;

    async function load() {
      try {
        const [restaurantList, planList] = await Promise.all([
          apiFetch("/admin/restaurants", { token }),
          apiFetch("/admin/subscription-plans", { token }),
        ]);
        if (stopped) {
          return;
        }
        setRestaurants(Array.isArray(restaurantList) ? restaurantList : []);
        setPlans(Array.isArray(planList) ? planList : []);
        setLoadError("");
      } catch (error) {
        if (stopped) {
          return;
        }
        if (error.status === 401) {
          onUnauthenticatedRef.current();
          return;
        }
        setLoadError(adminErrorText(error, staffErrorText));
      } finally {
        if (!stopped) {
          setLoaded(true);
        }
      }
    }

    load();

    return () => {
      stopped = true;
    };
  }, [token]);

  function fail(error, setLocal) {
    if (error?.status === 401) {
      onUnauthenticatedRef.current();
      return;
    }
    const text = adminErrorText(error, staffErrorText);
    if (setLocal) {
      setLocal(text);
    } else {
      setNotice(text);
    }
  }

  async function mutate(work) {
    setBusy(true);
    setNotice("");
    try {
      return await work();
    } finally {
      setBusy(false);
    }
  }

  function replaceRestaurant(updated) {
    setRestaurants((current) =>
      sortByName(current.map((item) => (item.id === updated.id ? updated : item))),
    );
    setSelected((current) => (current?.id === updated.id ? updated : current));
  }

  async function createRestaurant(body, setError) {
    return mutate(async () => {
      try {
        const created = await apiFetch("/admin/restaurants", {
          token,
          method: "POST",
          body,
        });
        setRestaurants((current) => sortByName([...current, created]));
        return true;
      } catch (error) {
        fail(error, setError);
        return false;
      }
    });
  }

  async function updateRestaurant(id, body, setError) {
    return mutate(async () => {
      try {
        const updated = await apiFetch(`/admin/restaurants/${encodeURIComponent(id)}`, {
          token,
          method: "PATCH",
          body,
        });
        replaceRestaurant(updated);
        return true;
      } catch (error) {
        fail(error, setError);
        return false;
      }
    });
  }

  async function openAccounts(restaurant) {
    setSelected(restaurant);
    setAccounts([]);
    setAccountsError("");
    setAccountsLoading(true);
    try {
      const list = await apiFetch(
        `/admin/restaurants/${encodeURIComponent(restaurant.id)}/accounts`,
        { token },
      );
      setAccounts(Array.isArray(list) ? list : []);
    } catch (error) {
      fail(error, setAccountsError);
    } finally {
      setAccountsLoading(false);
    }
  }

  async function createAccount(restaurantId, role, body, setError) {
    const path = role === "owner" ? "owners" : "cashiers";
    return mutate(async () => {
      try {
        const created = await apiFetch(
          `/admin/restaurants/${encodeURIComponent(restaurantId)}/${path}`,
          { token, method: "POST", body },
        );
        setAccounts((current) => sortByName([...current, created]));
        return true;
      } catch (error) {
        fail(error, setError);
        return false;
      }
    });
  }

  async function saveAccount(id, body, setError) {
    return mutate(async () => {
      try {
        const updated = await apiFetch(`/admin/accounts/${encodeURIComponent(id)}`, {
          token,
          method: "PATCH",
          body,
        });
        setAccounts((current) =>
          sortByName(current.map((item) => (item.id === updated.id ? updated : item))),
        );
        return true;
      } catch (error) {
        fail(error, setError);
        return false;
      }
    });
  }

  async function createPlan(body, setError) {
    return mutate(async () => {
      try {
        const created = await apiFetch("/admin/subscription-plans", {
          token,
          method: "POST",
          body,
        });
        setPlans((current) => sortByName([...current, created]));
        return true;
      } catch (error) {
        fail(error, setError);
        return false;
      }
    });
  }

  async function togglePlan(plan) {
    await mutate(async () => {
      try {
        const updated = await apiFetch(
          `/admin/subscription-plans/${encodeURIComponent(plan.id)}`,
          {
            token,
            method: "PATCH",
            body: { is_active: !plan.is_active },
          },
        );
        setPlans((current) =>
          sortByName(current.map((item) => (item.id === updated.id ? updated : item))),
        );
      } catch (error) {
        fail(error);
      }
    });
  }

  async function changePlanFlags(plan, body) {
    await mutate(async () => {
      try {
        const updated = await apiFetch(
          `/admin/subscription-plans/${encodeURIComponent(plan.id)}`,
          {
            token,
            method: "PATCH",
            body,
          },
        );
        setPlans((current) =>
          sortByName(current.map((item) => (item.id === updated.id ? updated : item))),
        );
        const features = readFeatures(updated);
        setRestaurants((current) =>
          current.map((restaurant) =>
            restaurant.subscription?.plan_id === updated.id ? { ...restaurant, features } : restaurant,
          ),
        );
      } catch (error) {
        fail(error);
      }
    });
  }

  async function confirmDeletePlan() {
    if (!planTarget || confirming) {
      return;
    }
    setConfirming(true);
    try {
      await apiFetch(`/admin/subscription-plans/${encodeURIComponent(planTarget.id)}`, {
        token,
        method: "DELETE",
      });
      setPlans((current) => current.filter((item) => item.id !== planTarget.id));
      setPlanTarget(null);
    } catch (error) {
      setPlanTarget(null);
      fail(error);
    } finally {
      setConfirming(false);
    }
  }

  async function confirmDeleteAccount() {
    if (!accountTarget || confirming) {
      return;
    }
    setConfirming(true);
    try {
      await apiFetch(`/admin/accounts/${encodeURIComponent(accountTarget.id)}`, {
        token,
        method: "DELETE",
      });
      setAccounts((current) => current.filter((item) => item.id !== accountTarget.id));
      setAccountTarget(null);
    } catch (error) {
      setAccountTarget(null);
      fail(error);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="min-h-dvh overflow-x-clip bg-ivory">
      <header className="sticky top-0 z-20 border-b border-burgundy/10 bg-ivory pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-3 px-3 py-2 sm:min-h-[4.75rem] sm:px-6">
          <BrandMark className="h-10 w-10 sm:h-12 sm:w-12" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-semibold text-burgundy-deep sm:text-2xl lg:text-3xl">
              admin
            </h1>
            <p className="truncate text-sm text-ink/55">{user.name}</p>
          </div>
          <div className="ms-auto flex shrink-0 items-center">
            <HeaderButton onClick={onUnauthenticated}>خروج</HeaderButton>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-6 sm:px-6 sm:pt-8 sm:pb-8">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={tabClass(tab === "restaurants")} onClick={() => setTab("restaurants")}>
            المطاعم
          </button>
          <button type="button" className={tabClass(tab === "plans")} onClick={() => setTab("plans")}>
            خطط الاشتراك
          </button>
        </div>

        {!loaded ? <p className="text-sm font-medium text-ink/50">يتم تحميل البيانات.</p> : null}
        {loadError ? (
          <p role="alert" className="text-sm font-medium text-burgundy">
            {loadError}
          </p>
        ) : null}
        {notice ? (
          <p role="alert" className="text-sm font-medium text-burgundy">
            {notice}
          </p>
        ) : null}

        {tab === "restaurants" ? (
          <>
            <RestaurantPanel
              restaurants={restaurants}
              plans={plans}
              busy={busy}
              selectedId={selected?.id}
              onCreate={createRestaurant}
              onUpdate={updateRestaurant}
              onOpenAccounts={openAccounts}
            />
            {selected ? (
              <AccountPanel
                restaurant={selected}
                accounts={accounts}
                loading={accountsLoading}
                error={accountsError}
                busy={busy}
                onCreate={createAccount}
                onSave={saveAccount}
                onAskDelete={setAccountTarget}
                onClose={() => setSelected(null)}
              />
            ) : null}
          </>
        ) : (
          <PlanPanel
            plans={plans}
            busy={busy}
            onCreate={createPlan}
            onToggle={togglePlan}
            onChangeFlags={changePlanFlags}
            onDelete={setPlanTarget}
          />
        )}
      </main>

      <ConfirmDialog
        open={Boolean(planTarget)}
        titleId="delete-plan-title"
        title="حذف الخطة"
        body={planTarget ? `حذف الخطة ${planTarget.name}؟` : ""}
        confirmLabel="حذف"
        pending={confirming}
        onConfirm={confirmDeletePlan}
        onDismiss={() => {
          if (!confirming) {
            setPlanTarget(null);
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(accountTarget)}
        titleId="delete-account-title"
        title="حذف الحساب"
        body="حذف هذا الحساب؟ الطلبات التي أنشأها تبقى."
        confirmLabel="حذف"
        pending={confirming}
        onConfirm={confirmDeleteAccount}
        onDismiss={() => {
          if (!confirming) {
            setAccountTarget(null);
          }
        }}
      />
    </div>
  );
}
