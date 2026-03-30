import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import React from 'react';
import styles from './styles.module.scss';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

export function FormField({ label, children }: FormFieldProps) {
  const child = React.Children.only(children) as React.ReactElement<{ id?: string }>;
  const inputId = child?.props?.id;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>{label}</label>
      {children}
    </div>
  );
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {}

export function InputField({ className = '', ...props }: InputFieldProps) {
  return <input className={`${styles.input} ${className}`} {...props} />;
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function TextareaField({ className = '', ...props }: TextareaFieldProps) {
  return <textarea className={`${styles.textarea} ${className}`} {...props} />;
}