"use client";
import { createContext, useContext } from "react";

export type ActiveOrder = {
  orderId: string;
  orderCode: string;
  orderNumber: string;
  venueName: string;
  venueId: string;
  status: string;
  totalCents: number;
};

export type OrderTrackerCtx = {
  activeOrder: ActiveOrder | null;
  setActiveOrder: (o: ActiveOrder | null) => void;
};

export const OrderTrackerContext = createContext<OrderTrackerCtx>({
  activeOrder: null,
  setActiveOrder: () => {},
});

export function useOrderTracker() {
  return useContext(OrderTrackerContext);
}
