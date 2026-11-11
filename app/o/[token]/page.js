import { Suspense } from "react";
import { OrderStatus } from "@/components/customer/order-status";

export const metadata = {
  title: "حالة الطلب",
};

function Opening() {
  return (
    <main className="order-track flex min-h-dvh items-center justify-center bg-track-bg px-4 text-track-text">
      <p className="text-[15px] font-medium text-track-muted">يتم فتح الصفحة.</p>
    </main>
  );
}

async function Loaded({ params }) {
  const { token } = await params;
  return <OrderStatus token={token} />;
}

export default function OrderPage({ params }) {
  return (
    <Suspense fallback={<Opening />}>
      <Loaded params={params} />
    </Suspense>
  );
}
