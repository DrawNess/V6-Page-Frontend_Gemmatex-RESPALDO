import { Injectable } from '@angular/core';

export interface ShippingDraft {
  orderId: number;
  branchId: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutFlowService {
  private readonly key = 'checkout_shipping_draft_v1';

  saveDraft(draft: ShippingDraft): void {
    sessionStorage.setItem(this.key, JSON.stringify(draft));
  }

  getDraft(): ShippingDraft | null {
    try {
      const raw = sessionStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as ShippingDraft) : null;
    } catch {
      return null;
    }
  }

  clearDraft(): void {
    sessionStorage.removeItem(this.key);
  }
}
