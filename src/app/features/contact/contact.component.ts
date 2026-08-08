import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ConfigService } from '../../core/services/config.service';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, TextareaModule, ButtonModule, MessageModule, ToastModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
  providers: [MessageService]
})
export class ContactComponent implements OnInit {
  private configService = inject(ConfigService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);

  lineNumbers = Array.from({ length: 24 }, (_, i) => i + 1);
  contactForm!: FormGroup;
  submitting = signal(false);
  submitted = signal(false);
  submitError = signal<string | undefined>(undefined);

  ngOnInit(): void {
    this.configService.loadConfig();
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  sendContactForm(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(undefined);

    const { name, email, subject, message } = this.contactForm.value;

    const templateParams = {
      name,
      from_email: email,
      subject,
      message,
      to_email: 'juanbarrios072@gmail.com',
      time: new Date().toLocaleString('es-CO')
    };

    const cfg = this.configService.getConfig();
    if (!cfg?.emailjs?.publicKey || !cfg?.emailjs?.serviceId || !cfg?.emailjs?.templateId) {
      this.submitting.set(false);
      this.submitError.set('EmailJS no está configurado. Contacta al administrador.');
      return;
    }

    // TODO: Reemplazar con emailjs.send() de la dependencia real
    this.handleContactSend(templateParams);
  }

  private handleContactSend(templateParams: Record<string, string>): void {
    console.log('EmailJS would send:', {
      serviceId: templateParams['to_email'],
      templateId: this.configService.getConfig()?.emailjs?.templateId,
      params: templateParams
    });
    this.submitting.set(false);
    this.submitted.set(true);
    this.contactForm.reset();
    this.messageService.add({ severity: 'success', summary: 'Enviado', detail: '¡Gracias! Tu mensaje ha sido enviado.' });
  }
}
