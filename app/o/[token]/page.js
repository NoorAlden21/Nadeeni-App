import { Suspense } from "react";
import { OrderStatus } from "@/components/customer/order-status";

export const metadata = {
  title: "حالة الطلب",
};

function Opening() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ivory px-4">
      <p className="text-base font-medium text-burgundy-deep">يتم فتح الصفحة.</p>
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
