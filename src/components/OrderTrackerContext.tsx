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
  activeOrders: ActiveOrder[];
  addActiveOrder: (o: ActiveOrder) => void;
  removeActiveOrder: (orderId: string) => void;
  updateActiveOrder: (orderId: string, updates: Partial<ActiveOrder>) => void;
  bannerShowing: boolean;
};

export const OrderTrackerContext = createContext<OrderTrackerCtx>({
  activeOrders: [],
  addActiveOrder: () => {},
  removeActiveOrder: () => {},
  updateActiveOrder: () => {},
  bannerShowing: false,
});

export function useOrderTracker() {
  return useContext(OrderTrackerContext);
}
