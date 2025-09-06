import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
private fb = inject(FormBuilder);

  passwordVisible = signal(false);
  loading = signal(false);
  formError = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true],
  });

  email = computed(() => this.form.get('email')!);
  password = computed(() => this.form.get('password')!);

  togglePassword() {
    this.passwordVisible.update(v => !v);
  }

  onSubmit() {
    this.form.markAllAsTouched();
    this.formError.set(null);

    if (this.form.invalid) return;

    // Solo frontend: simulamos envío
    this.loading.set(true);
    setTimeout(() => {
      this.loading.set(false);

      // DEMO: “credenciales inválidas” si email no incluye 'demo'
      if (!this.email().value?.includes('demo')) {
        this.formError.set('Correo o contraseña incorrectos.');
        return;
      }

      // “Éxito” — aquí redirigirías o almacenarías token
      console.log('Login OK', this.form.value);
      // ejemplo: this.router.navigateByUrl('/');
    }, 1200);
  }
}
