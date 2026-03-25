import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './styles.module.css';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  );
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  // label is provided by wrapping FormField
}

export function InputField({ className = '', ...props }: InputFieldProps) {
  return <input className={`${styles.input} ${className}`} {...props} />;
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  // label is provided by wrapping FormField
}

export function TextareaField({ className = '', ...props }: TextareaFieldProps) {
  return <textarea className={`${styles.textarea} ${className}`} {...props} />;
}