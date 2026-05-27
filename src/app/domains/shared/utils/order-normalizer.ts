import { ApiOrder } from '@shared/models/user-portal.model';

/**
 * Mapea el shape de `ApiOrder` post-integración SSO al shape legacy que usan
 * los templates antiguos del frontend.
 *
 * Cambios que aplica:
 *  - Aplana `delivery.{mode, whatsapp, branch}` a propiedades top-level
 *    (`deliveryMode`, `deliveryWhatsapp`, `branch`, `branchId`).
 *  - Sintetiza un objeto `customer` desde los campos snapshot
 *    (`customerName`, `customerEmail`, `customerPhone`, etc.) y la dirección
 *    embebida en `delivery.address`, así los templates que aún leen
 *    `order.customer?.name`, `order.customer?.email`, etc. siguen funcionando.
 *
 * No muta los campos snapshot originales: sólo añade los alias legacy.
 */
export function normalizeOrder(o: ApiOrder): ApiOrder {
  if (!o || typeof o !== 'object') return o;

  const d = o.delivery;
  if (d) {
    if (o.deliveryMode == null && d.mode != null) o.deliveryMode = d.mode;
    if (o.deliveryWhatsapp == null && d.whatsapp != null) o.deliveryWhatsapp = d.whatsapp;
    if (o.branch == null && d.branch != null) o.branch = d.branch;
    if (o.branchId == null && d.branch?.id != null) o.branchId = d.branch.id;
  }

  if (!o.customer) {
    const snap = o as {
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      customerDocument?: { razonSocial?: string | null } | null;
      customerUuid?: string;
    };
    const fullName = (snap.customerName ?? '').trim();
    const [firstName, ...rest] = fullName.split(/\s+/);
    const lastName = rest.join(' ');
    const address = o.delivery?.address ?? {};

    const hasAnySnapshot =
      !!snap.customerName ||
      !!snap.customerEmail ||
      !!snap.customerPhone ||
      Object.values(address).some((v) => !!v);

    if (hasAnySnapshot) {
      o.customer = {
        id: 0,
        name: firstName ?? '',
        lastName: lastName ?? '',
        phone: snap.customerPhone ?? '',
        company: snap.customerDocument?.razonSocial ?? null,
        region: address.departamento ?? null,
        city: address.ciudad ?? null,
        street: address.calleAvenida ?? null,
        streetNumber: address.numero ?? null,
        apartment: address.casaDpto ?? null,
        email: snap.customerEmail,
        userId: snap.customerUuid as unknown as number,
        user: snap.customerEmail
          ? ({ id: snap.customerUuid as unknown as number, email: snap.customerEmail } as any)
          : undefined,
      } as any;
    }
  }

  return o;
}
