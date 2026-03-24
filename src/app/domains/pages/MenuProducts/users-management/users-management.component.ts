import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { ApiCustomer, ApiOrder, ApiOrderItem, ApiUser } from '@shared/models/user-portal.model';
import { CustomerService } from '@shared/services/customer.service';
import { OrderService } from '@shared/services/order.service';
import { UserService } from '@shared/services/user.service';

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './users-management.component.html',
  styleUrl: './users-management.component.css',
})
export class UsersManagementComponent {
  private readonly userService = inject(UserService);
  private readonly customerService = inject(CustomerService);
  private readonly orderService = inject(OrderService);

  private readonly adminBase = `/${ROUTE_CONSTANTS.SECRET_BASE}`;

  readonly menuUrl = `${this.adminBase}/${ROUTE_CONSTANTS.ADMIN.MENU}`;

  readonly users = signal<ApiUser[]>([]);
  readonly customers = signal<ApiCustomer[]>([]);
  readonly orders = signal<ApiOrder[]>([]);

  readonly selectedUser = signal<ApiUser | null>(null);
  readonly selectedCustomer = signal<ApiCustomer | null>(null);
  readonly selectedOrder = signal<ApiOrder | null>(null);

  readonly listLoading = signal(false);
  readonly customersLoading = signal(false);
  readonly ordersLoading = signal(false);
  readonly savingUser = signal(false);
  readonly savingCustomer = signal(false);
  readonly creatingUser = signal(false);
  readonly deletingUser = signal(false);
  readonly deletingCustomer = signal(false);
  readonly creatingOrder = signal(false);
  readonly addingOrderItem = signal(false);

  readonly globalError = signal('');
  readonly globalSuccess = signal('');

  queryUserId: number | null = null;
  queryCustomerId: number | null = null;
  queryOrderId: number | null = null;
  orderItemOrderId: number | null = null;
  orderItemProductId: number | null = null;
  orderItemAmount = 1;

  newUserEmail = '';
  newUserPassword = '';
  newUserRole = 'customer';

  editUserEmail = '';
  editUserRole = 'customer';
  editUserVerified = false;

  editCustomerName = '';
  editCustomerLastName = '';
  editCustomerPhone = '';

  readonly selectedUserId = computed(() => this.selectedUser()?.id ?? null);
  readonly selectedCustomerId = computed(() => {
    const customer = this.selectedCustomer();
    if (customer?.id) {
      return customer.id;
    }

    const selectedUser = this.selectedUser();
    if (!selectedUser?.id) {
      return null;
    }

    const linked = this.customers().find((item) => Number(item.userId) === Number(selectedUser.id));
    return linked?.id ?? null;
  });

  readonly filteredOrders = computed(() => {
    const allOrders = this.orders();
    const customerId = this.selectedCustomerId();

    if (!customerId) {
      return allOrders;
    }

    return allOrders.filter((order) => Number(order.customerId) === Number(customerId));
  });

  constructor() {
    this.refreshAll();
  }

  refreshAll(): void {
    this.loadUsers();
    this.loadCustomers();
    this.loadOrders();
  }

  clearMessages(): void {
    this.globalError.set('');
    this.globalSuccess.set('');
  }

  loadUsers(): void {
    this.listLoading.set(true);
    this.clearMessages();

    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.listLoading.set(false);
      },
      error: () => {
        this.globalError.set('No se pudo cargar el listado de usuarios.');
        this.listLoading.set(false);
      },
    });
  }

  loadUserById(): void {
    const userId = Number(this.queryUserId);
    if (!Number.isInteger(userId) || userId <= 0) {
      this.globalError.set('Ingresa un ID de usuario valido.');
      this.globalSuccess.set('');
      return;
    }

    this.listLoading.set(true);
    this.clearMessages();

    this.userService.getUserById(userId).subscribe({
      next: (user) => {
        this.listLoading.set(false);
        this.selectUser(user);
        this.globalSuccess.set(`Usuario #${user.id} cargado.`);
      },
      error: () => {
        this.listLoading.set(false);
        this.globalError.set('No se pudo cargar el usuario solicitado.');
      },
    });
  }

  selectUser(user: ApiUser): void {
    this.selectedUser.set(user);
    this.editUserEmail = user.email ?? '';
    this.editUserRole = user.role ?? 'customer';
    this.editUserVerified = !!user.isEmailVerified;
    this.syncCustomerBySelectedUser();
  }

  createUser(): void {
    const email = this.newUserEmail.trim();
    const password = this.newUserPassword.trim();
    if (!email || !password) {
      this.globalError.set('Para crear usuario se requiere email y password.');
      this.globalSuccess.set('');
      return;
    }

    this.creatingUser.set(true);
    this.clearMessages();

    this.userService
      .createUser({
        email,
        password,
        role: this.newUserRole || 'customer',
      })
      .subscribe({
        next: (created) => {
          this.creatingUser.set(false);
          this.newUserEmail = '';
          this.newUserPassword = '';
          this.newUserRole = 'customer';
          this.globalSuccess.set(`Usuario #${created.id} creado correctamente.`);
          this.loadUsers();
          this.selectUser(created);
        },
        error: () => {
          this.creatingUser.set(false);
          this.globalError.set('No se pudo crear el usuario.');
        },
      });
  }

  saveUserChanges(): void {
    const user = this.selectedUser();
    if (!user) {
      this.globalError.set('Primero selecciona un usuario.');
      this.globalSuccess.set('');
      return;
    }

    const email = this.editUserEmail.trim();
    if (!email) {
      this.globalError.set('El email no puede estar vacio.');
      this.globalSuccess.set('');
      return;
    }

    const payload: Partial<Pick<ApiUser, 'email' | 'role' | 'isEmailVerified'>> = {};
    if (email !== user.email) payload.email = email;
    if (this.editUserRole !== user.role) payload.role = this.editUserRole;
    if (this.editUserVerified !== !!user.isEmailVerified) payload.isEmailVerified = this.editUserVerified;

    if (!Object.keys(payload).length) {
      this.globalSuccess.set('No hay cambios para guardar en usuario.');
      this.globalError.set('');
      return;
    }

    this.savingUser.set(true);
    this.clearMessages();

    this.userService.updateUser(user.id, payload).subscribe({
      next: (updated) => {
        this.savingUser.set(false);
        this.selectedUser.set(updated);
        this.editUserEmail = updated.email ?? email;
        this.editUserRole = updated.role ?? this.editUserRole;
        this.editUserVerified = !!updated.isEmailVerified;
        this.globalSuccess.set('Usuario actualizado.');
        this.loadUsers();
      },
      error: () => {
        this.savingUser.set(false);
        this.globalError.set('No se pudo actualizar el usuario.');
      },
    });
  }

  deleteSelectedUser(): void {
    const user = this.selectedUser();
    if (!user?.id) {
      this.globalError.set('Selecciona un usuario para eliminar.');
      this.globalSuccess.set('');
      return;
    }

    this.deletingUser.set(true);
    this.clearMessages();

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.deletingUser.set(false);
        this.globalSuccess.set(`Usuario #${user.id} eliminado.`);
        this.selectedUser.set(null);
        this.loadUsers();
      },
      error: () => {
        this.deletingUser.set(false);
        this.globalError.set('No se pudo eliminar el usuario.');
      },
    });
  }

  loadCustomers(): void {
    this.customersLoading.set(true);
    this.clearMessages();

    this.customerService.getCustomers().subscribe({
      next: (customers) => {
        this.customers.set(customers);
        this.customersLoading.set(false);
        this.syncCustomerBySelectedUser();
      },
      error: () => {
        this.customersLoading.set(false);
        this.globalError.set('No se pudo cargar el listado de clientes.');
      },
    });
  }

  loadCustomerById(): void {
    const customerId = Number(this.queryCustomerId);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      this.globalError.set('Ingresa un ID de cliente valido.');
      this.globalSuccess.set('');
      return;
    }

    this.customersLoading.set(true);
    this.clearMessages();

    this.customerService.getCustomerById(customerId).subscribe({
      next: (customer) => {
        this.customersLoading.set(false);
        this.selectCustomer(customer);
        this.globalSuccess.set(`Cliente #${customer.id} cargado.`);
      },
      error: () => {
        this.customersLoading.set(false);
        this.globalError.set('No se pudo cargar el cliente solicitado.');
      },
    });
  }

  selectCustomer(customer: ApiCustomer): void {
    this.selectedCustomer.set(customer);
    this.editCustomerName = customer.name ?? '';
    this.editCustomerLastName = customer.lastName ?? '';
    this.editCustomerPhone = customer.phone ?? '';
  }

  syncCustomerBySelectedUser(): void {
    const user = this.selectedUser();
    if (!user?.id) {
      this.selectedCustomer.set(null);
      return;
    }

    const linked = this.customers().find((item) => Number(item.userId) === Number(user.id)) ?? null;
    if (!linked) {
      this.selectedCustomer.set(null);
      return;
    }

    this.selectCustomer(linked);
  }

  saveCustomerChanges(): void {
    const customer = this.selectedCustomer();
    if (!customer?.id) {
      this.globalError.set('Selecciona un cliente para editar.');
      this.globalSuccess.set('');
      return;
    }

    const name = this.editCustomerName.trim();
    const lastName = this.editCustomerLastName.trim();
    const phone = this.editCustomerPhone.trim();
    if (!name || !lastName) {
      this.globalError.set('Nombre y apellido son obligatorios.');
      this.globalSuccess.set('');
      return;
    }

    const payload: Partial<Pick<ApiCustomer, 'name' | 'lastName' | 'phone'>> = {};
    if (name !== customer.name) payload.name = name;
    if (lastName !== customer.lastName) payload.lastName = lastName;
    if (phone !== (customer.phone ?? '')) payload.phone = phone;

    if (!Object.keys(payload).length) {
      this.globalSuccess.set('No hay cambios para guardar en cliente.');
      this.globalError.set('');
      return;
    }

    this.savingCustomer.set(true);
    this.clearMessages();

    this.customerService.updateCustomer(customer.id, payload).subscribe({
      next: (updated) => {
        this.savingCustomer.set(false);
        this.selectCustomer(updated);
        this.globalSuccess.set('Cliente actualizado.');
        this.loadCustomers();
      },
      error: () => {
        this.savingCustomer.set(false);
        this.globalError.set('No se pudo actualizar el cliente.');
      },
    });
  }

  deleteSelectedCustomer(): void {
    const customer = this.selectedCustomer();
    if (!customer?.id) {
      this.globalError.set('Selecciona un cliente para eliminar.');
      this.globalSuccess.set('');
      return;
    }

    this.deletingCustomer.set(true);
    this.clearMessages();

    this.customerService.deleteCustomer(customer.id).subscribe({
      next: () => {
        this.deletingCustomer.set(false);
        this.globalSuccess.set(`Cliente #${customer.id} eliminado.`);
        this.selectedCustomer.set(null);
        this.loadCustomers();
        this.loadOrders();
      },
      error: () => {
        this.deletingCustomer.set(false);
        this.globalError.set('No se pudo eliminar el cliente.');
      },
    });
  }

  loadOrders(): void {
    this.ordersLoading.set(true);
    this.clearMessages();

    this.orderService.getOrders().subscribe({
      next: (orders) => {
        this.ordersLoading.set(false);
        const sorted = [...orders].sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
        this.orders.set(sorted);
      },
      error: () => {
        this.ordersLoading.set(false);
        this.globalError.set('No se pudo cargar el listado de pedidos.');
      },
    });
  }

  createOrder(): void {
    this.creatingOrder.set(true);
    this.clearMessages();

    this.orderService.createOrder().subscribe({
      next: (order) => {
        this.creatingOrder.set(false);
        this.selectedOrder.set(order);
        this.orderItemOrderId = order.id;
        this.globalSuccess.set(`Pedido #${order.id} creado.`);
        this.loadOrders();
      },
      error: () => {
        this.creatingOrder.set(false);
        this.globalError.set('No se pudo crear el pedido.');
      },
    });
  }

  addItemToOrder(): void {
    const orderId = Number(this.orderItemOrderId);
    const variantId = Number(this.orderItemProductId);
    const amount = Number(this.orderItemAmount);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      this.globalError.set('Ingresa un orderId valido para agregar item.');
      this.globalSuccess.set('');
      return;
    }
    if (!Number.isInteger(variantId) || variantId <= 0) {
      this.globalError.set('Ingresa un variantId valido.');
      this.globalSuccess.set('');
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      this.globalError.set('La cantidad debe ser mayor a 0.');
      this.globalSuccess.set('');
      return;
    }

    this.addingOrderItem.set(true);
    this.clearMessages();

    this.orderService.addItem({ orderId, variantId, amount }).subscribe({
      next: (updatedOrder) => {
        this.addingOrderItem.set(false);
        this.selectedOrder.set(updatedOrder);
        this.globalSuccess.set(`Item agregado al pedido #${orderId}.`);
        this.loadOrders();
      },
      error: () => {
        this.addingOrderItem.set(false);
        this.globalError.set('No se pudo agregar el item al pedido.');
      },
    });
  }

  loadOrderById(): void {
    const orderId = Number(this.queryOrderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      this.globalError.set('Ingresa un ID de pedido valido.');
      this.globalSuccess.set('');
      return;
    }

    this.ordersLoading.set(true);
    this.clearMessages();

    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.ordersLoading.set(false);
        this.selectedOrder.set(order);
        this.globalSuccess.set(`Pedido #${order.id} cargado.`);
      },
      error: () => {
        this.ordersLoading.set(false);
        this.globalError.set('No se pudo cargar el pedido solicitado.');
      },
    });
  }

  selectOrder(order: ApiOrder): void {
    this.selectedOrder.set(order);
    this.orderItemOrderId = order.id;
  }

  getOrderItems(order: ApiOrder | null): ApiOrderItem[] {
    const raw = order?.items;
    return Array.isArray(raw) ? raw : [];
  }

  getOrderTotal(order: ApiOrder | null): number {
    if (!order) {
      return 0;
    }
    if (typeof order.total === 'number') {
      return order.total;
    }
    return this.getOrderItems(order).reduce((sum, item) => {
      const amount = Number(item?.amount ?? (item as any)?.['OrderProduct']?.amount ?? 0);
      const price = Number(item?.price ?? 0);
      return sum + amount * price;
    }, 0);
  }
}
