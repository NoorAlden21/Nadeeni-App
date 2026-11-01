import { Suspense } from "react";
import { RestaurantEntry } from "@/components/customer/restaurant-entry";

export const metadata = {
  title: "تابع طلبي",
};

function Opening() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ivory px-4">
      <p className="text-base font-medium text-burgundy-deep">يتم فتح الصفحة.</p>
    </main>
  );
}

async function Loaded({ params }) {
  const { slug } = await params;
  return <RestaurantEntry slug={slug} />;
}

export default function RestaurantPage({ params }) {
  return (
    <Suspense fallback={<Opening />}>
      <Loaded params={params} />
    </Suspense>
  );
}
