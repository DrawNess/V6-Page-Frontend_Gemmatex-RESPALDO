import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VariantService } from '@shared/services/variant.service';
import { ProductService } from '@shared/services/product.service';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

type UploadMode = 'catalog' | 'prices';

interface BulkSummary {
  message?: string;
  summary?: Record<string, unknown>;
  duplicates?: { count: number; rows: { sku: string; firstRow: number; repeatedRow: number }[] };
  created?: number;
  updated?: number;
  errors?: unknown[];
  data?: { invalidRows?: { row: number; sku: string; reason: string }[] };
}

@Component({
  selector: 'app-bulk-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-upload.component.html',
  styleUrl: './bulk-upload.component.css',
})
export class BulkUploadComponent {
  private router = inject(Router);
  private variantSvc = inject(VariantService);
  private productSvc = inject(ProductService);
  private readonly adminBase = `/${ROUTE_CONSTANTS.SECRET_BASE}`;

  // Guide sections (collapsible)
  openSections = signal<Record<string, boolean>>({
    architecture: false,
    columns: false,
    rules: false,
    example: false,
    errors: false,
  });

  // Upload state
  mode = signal<UploadMode>('catalog');
  file = signal<File | null>(null);
  dryRun = signal(true);
  uploading = signal(false);
  result = signal<BulkSummary | null>(null);
  toast = signal<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Drag state
  dragging = signal(false);

  toggleSection(key: string) {
    this.openSections.update(s => ({ ...s, [key]: !s[key] }));
  }

  expandAll() {
    this.openSections.set({
      architecture: true, columns: true, rules: true, example: true, errors: true,
    });
  }

  collapseAll() {
    this.openSections.set({
      architecture: false, columns: false, rules: false, example: false, errors: false,
    });
  }

  // ── Template download ──────────────────────────────────────────────

  downloadCatalogTemplate() {
    const headers = [
      'productSlug', 'productName', 'productImageUrl', 'subcategoryId',
      'sku', 'brand', 'description', 'shortDescription', 'imageUrl',
      'price', 'discountPrice', 'stock', 'unitOfMeasure', 'dimensions',
      'tags', 'outlet', 'colorId', 'galleryUrls', 'is_active',
    ];
    const exampleRow1 = [
      'camisa-oxford', 'Camisa Oxford', 'https://cdn.example.com/camisa.jpg', '1',
      'CAM-001-R', 'MiMarca', 'Camisa de algodón Oxford corte clásico varios talles disponibles.',
      'Camisa Oxford 100% algodón.', 'https://cdn.example.com/camisa-rojo.jpg',
      '185.50', '', '10', 'unidad', 'Talles S al XL',
      'ropa,camisa,formal', 'false', '1', '', 'true',
    ];
    const exampleRow2 = [
      'camisa-oxford', '', '', '',
      'CAM-001-A', 'MiMarca', 'Camisa de algodón Oxford corte clásico varios talles disponibles.',
      'Camisa Oxford 100% algodón.', 'https://cdn.example.com/camisa-azul.jpg',
      '185.50', '', '5', 'unidad', 'Talles S al XL',
      'ropa,camisa,formal', 'false', '2', '', 'true',
    ];
    this.downloadCSV('plantilla-catalogo.csv', [headers, exampleRow1, exampleRow2]);
  }

  downloadPriceTemplate() {
    const headers = ['sku', 'price', 'discountPrice'];
    const row1 = ['CAM-001-R', '175.00', '150.00'];
    const row2 = ['CAM-001-A', '175.00', ''];
    this.downloadCSV('plantilla-precios.csv', [headers, row1, row2]);
  }

  private downloadCSV(filename: string, rows: string[][]) {
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── File selection ─────────────────────────────────────────────────

  onFileSelect(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
    this.result.set(null);
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    this.dragging.set(false);
    const f = ev.dataTransfer?.files?.[0];
    if (f) { this.file.set(f); this.result.set(null); }
  }

  onDragOver(ev: DragEvent) { ev.preventDefault(); this.dragging.set(true); }
  onDragLeave() { this.dragging.set(false); }

  removeFile() { this.file.set(null); this.result.set(null); }

  // ── Upload ─────────────────────────────────────────────────────────

  upload() {
    const f = this.file();
    if (!f) return;

    this.uploading.set(true);
    this.result.set(null);

    const obs = this.mode() === 'catalog'
      ? this.variantSvc.bulkUpload(f, this.dryRun())
      : this.productSvc.bulkPriceUpdate(f, this.dryRun());

    obs.subscribe({
      next: (res: any) => {
        this.result.set(res);
        this.uploading.set(false);
        if (this.dryRun()) {
          this.showToast('ok', 'Validación completada (dry-run). No se aplicaron cambios.');
        } else {
          this.showToast('ok', 'Carga completada exitosamente.');
        }
      },
      error: (err: any) => {
        this.result.set(err?.error ?? { errors: [err?.message ?? 'Error desconocido'] });
        this.uploading.set(false);
        this.showToast('err', err?.error?.message ?? 'Error al procesar el archivo.');
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────

  goToProducts() {
    this.router.navigate([this.adminBase, ROUTE_CONSTANTS.ADMIN.PRODUCTS]);
  }

  formatResultKey(key: string): string {
    const map: Record<string, string> = {
      totalRows: 'Total de filas',
      productsToCreate: 'Productos a crear',
      productsExisting: 'Productos existentes',
      variantsToCreate: 'Variantes a crear',
      variantsToUpdate: 'Variantes a actualizar',
      productsCreated: 'Productos creados',
      variantsCreated: 'Variantes creadas',
      variantsUpdated: 'Variantes actualizadas',
      updated: 'Actualizados',
      created: 'Creados',
      dryRun: 'Modo prueba',
    };
    return map[key] ?? key;
  }

  summaryEntries(): [string, unknown][] {
    const r = this.result();
    if (!r?.summary) return [];
    return Object.entries(r.summary);
  }

  invalidRows(): { row: number; sku: string; reason: string }[] {
    return this.result()?.data?.invalidRows ?? [];
  }

  duplicateRows(): { sku: string; firstRow: number; repeatedRow: number }[] {
    return this.result()?.duplicates?.rows ?? [];
  }

  private showToast(type: 'ok' | 'err', msg: string) {
    this.toast.set({ type, msg });
    setTimeout(() => this.toast.set(null), 5000);
  }
}
