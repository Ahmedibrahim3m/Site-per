"use client";
import ShippingZonesManager from "@/components/shipping-zones-manager";
import CouponsManager from "@/components/coupons-manager";
import ReviewsManager from "@/components/reviews-manager";

/** Lightweight route adapter: individual panels own their data fetching and state. */
export default function AdminExtras({ tab }: { tab: "shipping" | "coupons" | "reviews" }) {
  switch (tab) {
    case "shipping": return <ShippingZonesManager />;
    case "coupons": return <CouponsManager />;
    case "reviews": return <ReviewsManager />;
  }
}
